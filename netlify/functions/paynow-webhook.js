const admin = require("firebase-admin");
const crypto = require("crypto");
const querystring = require("querystring");

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
    try {
        const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({ credential: admin.credential.cert(credentials) });
    } catch (error) {
        console.error("Firebase Admin SDK initialization failed:", error);
        throw new Error("Could not initialize Firebase Admin.");
    }
}
const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const fields = querystring.parse(event.body);
        const { reference, status, amount, paynowreference, pollurl, currency, hash } = fields;

        console.log(`Webhook received for ref: ${reference} with status: ${status}`);

        if (!hash) {
            console.warn("Forbidden: Missing hash in webhook payload.");
            return { statusCode: 403, body: "Forbidden: Missing hash" };
        }

        const isUSD = (currency || "").toUpperCase() === "USD";
        const PAYNOW_KEY = isUSD ? process.env.PAYNOW_KEY_USD : process.env.PAYNOW_KEY_ZWL;

        if (!PAYNOW_KEY) {
            console.error(`CRITICAL: Paynow Integration Key for ${currency} is not set.`);
            return { statusCode: 500, body: "Server configuration error." };
        }

        const stringToHash = Object.values(fields).filter(v => v !== hash).sort().join("") + PAYNOW_KEY;
        const expectedHash = crypto.createHash('sha512').update(stringToHash).digest('hex').toUpperCase();

        if (expectedHash !== hash.toUpperCase()) {
            console.warn("HASH MISMATCH", { reference, expected: expectedHash, received: hash });
            return { statusCode: 403, body: "Forbidden: Invalid hash" };
        }
        
        if (status.toLowerCase() !== "paid") {
            console.log(`Ignoring non-paid status '${status}' for reference ${reference}`);
            return { statusCode: 200, body: "OK" };
        }

        const [prefix, userId, lotId, slotId, hoursStr] = reference.split('-');
        const hours = parseInt(hoursStr, 10);

        if (prefix !== 'SP' || !userId || !lotId || !slotId || isNaN(hours)) {
            console.error("Invalid reference format:", reference);
            return { statusCode: 400, body: "Invalid reference format." };
        }

        await db.runTransaction(async (transaction) => {
            const lotDocRef = db.collection('parkingLots').doc(lotId);
            const lotDoc = await transaction.get(lotDocRef);

            if (!lotDoc.exists) throw new Error(`Parking lot ${lotId} does not exist!`);

            const lotData = lotDoc.data();
            const slotIndex = lotData.slots.findIndex(s => s.id === slotId);

            if (slotIndex === -1) throw new Error(`Slot ${slotId} not found in lot ${lotId}`);
            if (lotData.slots[slotIndex].isOccupied) {
                console.error(`CRITICAL: Slot ${slotId} in lot ${lotId} was already occupied for paid reference ${reference}. Manual refund required.`);
                // In a real app, you would flag this for manual intervention.
                return;
            }

            // 1. Update the slot to be occupied
            lotData.slots[slotIndex].isOccupied = true;
            transaction.update(lotDocRef, { slots: lotData.slots });

            // 2. Create the reservation document
            const newReservationRef = db.collection('reservations').doc();
            const startTime = admin.firestore.Timestamp.now();
            const endTime = new admin.firestore.Timestamp(startTime.seconds + hours * 3600, startTime.nanoseconds);
            
            const reservationData = {
                userId,
                parkingLotId: lotId,
                parkingLotName: lotData.name,
                slotId,
                startTime,
                endTime,
                durationHours: hours,
                amountPaid: parseFloat(amount),
                status: 'confirmed',
            };
            transaction.set(newReservationRef, reservationData);
            
            // 3. Create a notification for the user
            const newNotificationRef = db.collection('notifications').doc();
            const userDoc = await db.collection('users').doc(userId).get();
            const userCarPlate = userDoc.exists ? userDoc.data().carPlate : 'N/A';
            const notificationData = {
                userId,
                type: 'RESERVED',
                message: `You have successfully reserved spot ${slotId.toUpperCase()} at ${lotData.name}.`,
                isRead: false,
                timestamp: admin.firestore.Timestamp.now(),
                data: {
                    reservationId: newReservationRef.id,
                    carPlate: userCarPlate,
                    amountPaid: reservationData.amountPaid,
                    hoursLeft: reservationData.durationHours,
                }
            };
            transaction.set(newNotificationRef, notificationData);
        });

        console.log(`Successfully processed reservation for reference: ${reference}`);
        return { statusCode: 200, body: "Webhook processed successfully." };

    } catch (err) {
        console.error("WEBHOOK ERROR:", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
