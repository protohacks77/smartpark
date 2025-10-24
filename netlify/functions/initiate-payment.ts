import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Paynow } from 'paynow';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const initiatePayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to make a payment.');
    }

    const { lotId, slotId, hours, paymentMethod, ecocashNumber, amount } = data;
    const userId = context.auth.uid;
    
    // --- Data Validation ---
    if (!lotId || !slotId || !hours || !paymentMethod || !ecocashNumber || !amount) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required payment information.');
    }
    
    // --- Get Parking Lot Details ---
    const lotDoc = await db.collection('parkingLots').doc(lotId).get();
    if (!lotDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Parking lot not found.');
    }
    const lotData = lotDoc.data();
    if (!lotData) {
        throw new functions.https.HttpsError('internal', 'Could not retrieve parking lot data.');
    }
    
    const calculatedAmount = (hours * lotData.hourlyRate).toFixed(2);
    if (parseFloat(calculatedAmount) !== amount) {
        // Security check to prevent client-side price tampering
        throw new functions.https.HttpsError('invalid-argument', 'Price mismatch detected.');
    }

    // --- Select Paynow Credentials ---
    const isUsd = paymentMethod === 'ECOCASH_USD';
    const integrationId = isUsd ? process.env.ECOCASH_USD_INTEGRATION_ID : process.env.ECOCASH_ZWL_INTEGRATION_ID;
    const integrationKey = isUsd ? process.env.ECOCASH_USD_INTEGRATION_KEY : process.env.ECOCASH_ZWL_INTEGRATION_KEY;
    const currency = isUsd ? 'USD' : 'ZWL';

    if (!integrationId || !integrationKey) {
        console.error('Paynow integration credentials are not set in environment variables.');
        throw new functions.https.HttpsError('internal', 'Payment service is not configured correctly.');
    }
    
    // --- Create Payment Intent in Firestore ---
    const paymentIntentRef = db.collection('paymentIntents').doc();
    const intentId = paymentIntentRef.id;
    const newIntent = {
        id: intentId,
        userId,
        parkingLotId: lotId,
        parkingLotName: lotData.name,
        slotId,
        durationHours: hours,
        amount,
        currency,
        ecocashNumber,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await paymentIntentRef.set(newIntent);
    
    // --- Initialize Paynow ---
    const paynow = new Paynow(integrationId, integrationKey);
    paynow.resultUrl = `https://${context.rawRequest.hostname}/.netlify/functions/payment-callback`;
    paynow.returnUrl = ''; // Not needed for mobile payments

    const payment = paynow.createPayment(intentId, `${userId}@smartpark.app`); // Unique reference and user email
    payment.add(`Parking at ${lotData.name} for ${hours}h`, amount);

    try {
        const response = await paynow.sendMobile(payment, ecocashNumber, 'ecocash');

        if (response && response.success) {
            // Update intent with poll URL from Paynow
            await paymentIntentRef.update({ pollUrl: response.pollUrl });
            
            return {
                success: true,
                message: 'Payment initiated.',
                intentId: intentId,
                instructions: response.instructions,
            };
        } else {
            await paymentIntentRef.update({ status: 'failed' });
            return {
                success: false,
                message: response.error || 'Failed to initiate payment with Paynow.',
            };
        }
    } catch (error) {
        console.error('Error sending mobile payment:', error);
        await paymentIntentRef.update({ status: 'failed' });
        throw new functions.https.HttpsError('internal', 'An error occurred while communicating with the payment provider.');
    }
});
