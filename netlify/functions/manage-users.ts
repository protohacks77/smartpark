import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    // Add user
    try {
      const { email, password, displayName } = JSON.parse(event.body);
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      return {
        statusCode: 200,
        body: JSON.stringify(userRecord),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'PUT') {
    // Edit user
    try {
      const { uid, email, displayName, carPlates, defaultCarPlate } = JSON.parse(event.body);
      await admin.auth().updateUser(uid, {
        email,
        displayName,
      });
      await admin.firestore().collection('users').doc(uid).update({
        email,
        displayName,
        carPlates,
        defaultCarPlate,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User updated successfully' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'DELETE') {
    // Delete user
    try {
      const { uid } = JSON.parse(event.body);
      await admin.auth().deleteUser(uid);
      await admin.firestore().collection('users').doc(uid).delete();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User deleted successfully' }),
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
