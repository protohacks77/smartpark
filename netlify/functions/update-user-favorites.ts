import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const handler: Handler = async (event, context) => {
  const db = admin.firestore();
  const { uid } = context.clientContext.user;

  if (event.httpMethod === 'POST') {
    try {
      const { parkingBayId } = JSON.parse(event.body);
      await db.collection('users').doc(uid).update({
        favoriteParkingBays: firebase.firestore.FieldValue.arrayUnion(parkingBayId),
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Favorite added successfully' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'DELETE') {
    try {
      const { parkingBayId } = JSON.parse(event.body);
      await db.collection('users').doc(uid).update({
        favoriteParkingBays: firebase.firestore.FieldValue.arrayRemove(parkingBayId),
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Favorite removed successfully' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ message: 'Method Not Allowed' }),
  };
};

export { handler };
