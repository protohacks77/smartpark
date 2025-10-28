import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const handler: Handler = async (event, context) => {
  const db = admin.firestore();
  const { uid } = context.clientContext.user;

  if (event.httpMethod === 'PUT') {
    try {
      const { carPlates, defaultCarPlate } = JSON.parse(event.body);
      await db.collection('users').doc(uid).update({
        carPlates,
        defaultCarPlate,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User profile updated successfully' }),
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
