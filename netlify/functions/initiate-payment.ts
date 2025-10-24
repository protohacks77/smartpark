import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Paynow } from 'paynow';
import * as cors from 'cors';

const corsHandler = cors({ origin: true });

if (admin.apps.length === 0) {
  try {
    // Decode the base64 service account key
    const serviceAccountString = Buffer.from(process.env.SERVICE_KEY as string, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK from SERVICE_KEY:', error);
    // Fallback for local development or if env var is not a valid base64 string
    admin.initializeApp();
  }
}

const db = admin.firestore();

const initiatePaymentLogic = async (data: any, context: { auth?: { uid: string } }, req: functions.https.Request) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to make a payment.');
    }

    const { lotId, slotId, hours, paymentMethod, ecocashNumber, amount } = data;
    const userId = context.auth.uid;
    
    if (!lotId || !slotId || !hours || !paymentMethod || !ecocashNumber || !amount) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required payment information.');
    }
    
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
        throw new functions.https.HttpsError('invalid-argument', 'Price mismatch detected.');
    }

    const isUsd = paymentMethod === 'ECOCASH_USD';
    const integrationId = isUsd ? process.env.ECOCASH_USD_INTEGRATION_ID : process.env.ECOCASH_ZWL_INTEGRATION_ID;
    const integrationKey = isUsd ? process.env.ECOCASH_USD_INTEGRATION_KEY : process.env.ECOCASH_ZWL_INTEGRATION_KEY;
    const currency = isUsd ? 'USD' : 'ZWL';

    if (!integrationId || !integrationKey) {
        console.error('Paynow integration credentials are not set in environment variables.');
        throw new functions.https.HttpsError('internal', 'Payment service is not configured correctly.');
    }
    
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
    
    const paynow = new Paynow(integrationId, integrationKey);
    // Use environment variables for the result and return URLs
    paynow.resultUrl = process.env.PAYNOW_RESULT_URL || `https://${req.hostname}/.netlify/functions/payment-callback`;
    paynow.returnUrl = process.env.PAYNOW_RETURN_URL || '';

    const payment = paynow.createPayment(intentId, `${userId}@smartpark.app`);
    payment.add(`Parking at ${lotData.name} for ${hours}h`, amount);

    try {
        const response = await paynow.sendMobile(payment, ecocashNumber, 'ecocash');

        if (response && response.success) {
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
};

export const initiatePayment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const { authorization } = req.headers;
            if (!authorization || !authorization.startsWith('Bearer ')) {
                res.status(403).send({ error: { message: 'Unauthorized' } });
                return;
            }

            const idToken = authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            const context = { auth: { uid: decodedToken.uid } };
            const result = await initiatePaymentLogic(req.body, context, req);

            res.status(200).send({ data: result });
        } catch (error: any) {
            console.error("Error in initiatePayment onRequest handler:", error);
            if (error instanceof functions.https.HttpsError) {
                res.status(error.httpErrorCode.status).send({ error: { message: error.message, code: error.code } });
            } else if (error.code === 'auth/id-token-expired') {
                res.status(401).send({ error: { message: 'Token expired, please re-authenticate.', code: 'unauthenticated' } });
            }
            else {
                res.status(500).send({ error: { message: 'Internal Server Error' } });
            }
        }
    });
});
