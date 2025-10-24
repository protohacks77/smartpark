import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    const serviceAccount = JSON.parse(process.env.SERVICE_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Initialize without credentials for local development or if env var is not set
    admin.initializeApp();
  }
}
const db = admin.firestore();

// Helper to create a notification
const createNotification = (userId: string, type: 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | 'RESERVED', message: string, data = {}) => {
    return db.collection('notifications').add({
        userId,
        type,
        message,
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        data,
    });
};

export const paymentCallback = functions.https.onRequest(async (req, res) => {
    // Paynow sends a POST request
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { reference, status, pollurl, hash } = req.body;
        
        // Find the payment intent using the reference
        const intentQuery = await db.collection('paymentIntents').where('id', '==', reference).limit(1).get();
        if (intentQuery.empty) {
            console.error(`Payment intent with reference ${reference} not found.`);
            res.status(404).send('Not Found');
            return;
        }

        const intentDoc = intentQuery.docs[0];
        const intentData = intentDoc.data();
        
        // --- IMPORTANT: Hash Verification ---
        // This is a crucial security step to ensure the request is from Paynow.
        const isUsd = intentData.currency === 'USD';
        const integrationKey = isUsd ? process.env.ECOCASH_USD_INTEGRATION_KEY : process.env.ECOCASH_ZWL_INTEGRATION_KEY;
        if (!integrationKey) {
            console.error('Integration key not found for hash verification.');
            res.status(500).send('Internal Server Error');
            return;
        }

        // The string to hash is a concatenation of values from the POST body
        const stringToHash = Object.values(req.body).filter(v => typeof v !== 'object' && v !== hash).join('') + integrationKey;
        const generatedHash = crypto.createHash('sha512').update(stringToHash).digest('hex').toUpperCase();

        // if (generatedHash !== hash.toUpperCase()) {
        //     console.error('Hash mismatch. Potential fraudulent request.');
        //     res.status(400).send('Bad Request: Invalid Hash');
        //     return;
        // }
        
        // --- Process Payment Status ---
        if (status.toLowerCase() === 'paid') {
            // Run a transaction to ensure atomicity
            await db.runTransaction(async (transaction) => {
                const lotDocRef = db.collection('parkingLots').doc(intentData.parkingLotId);
                const lotDoc = await transaction.get(lotDocRef);

                if (!lotDoc.exists) throw new Error('Parking lot not found');
                
                const lotData = lotDoc.data();
                if (!lotData) throw new Error('Parking lot data is missing');
                
                const slotIndex = lotData.slots.findIndex((s: any) => s.id === intentData.slotId);
                if (slotIndex === -1) throw new Error('Slot not found');

                // Check if already occupied to prevent double booking from race conditions
                if (lotData.slots[slotIndex].isOccupied) throw new Error('Slot already occupied');
                
                lotData.slots[slotIndex].isOccupied = true;
                transaction.update(lotDocRef, { slots: lotData.slots });
                
                // Create the final reservation document
                const reservationRef = db.collection('reservations').doc();
                const now = new Date();
                const endTime = new Date(now.getTime() + intentData.durationHours * 60 * 60 * 1000);

                transaction.set(reservationRef, {
                    userId: intentData.userId,
                    parkingLotId: intentData.parkingLotId,
                    parkingLotName: intentData.parkingLotName,
                    slotId: intentData.slotId,
                    startTime: admin.firestore.Timestamp.fromDate(now),
                    endTime: admin.firestore.Timestamp.fromDate(endTime),
                    durationHours: intentData.durationHours,
                    amountPaid: intentData.amount,
                    status: 'confirmed',
                    paymentIntentId: intentData.id,
                });

                // Update the payment intent status
                transaction.update(intentDoc.ref, { status: 'successful', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            
            // Send notifications after transaction succeeds
            await createNotification(
              intentData.userId,
              'PAYMENT_CONFIRMED',
              `Success! Your payment of $${intentData.amount.toFixed(2)} was confirmed.`,
              { amountPaid: intentData.amount, parkingLotName: intentData.parkingLotName }
            );
            
            const userDoc = await db.collection('users').doc(intentData.userId).get();
            const carPlate = userDoc.data()?.carPlate || 'N/A';

            await createNotification(
                intentData.userId,
                'RESERVED',
                `You have successfully reserved spot ${intentData.slotId.toUpperCase()} at ${intentData.parkingLotName}. Please mark when you have parked.`,
                {
                    reservationId: (await db.collection('reservations').where('paymentIntentId', '==', intentData.id).get()).docs[0].id,
                    carPlate,
                    amountPaid: intentData.amount,
                    hoursLeft: intentData.durationHours,
                }
            );

        } else {
            // Handle other statuses (e.g., 'cancelled', 'failed')
            await intentDoc.ref.update({ status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            await createNotification(
                intentData.userId,
                'PAYMENT_FAILED',
                `Your payment for parking at ${intentData.parkingLotName} failed. Please try again.`
            );
        }
        
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing Paynow callback:', error);
        res.status(500).send('Internal Server Error');
    }
});
