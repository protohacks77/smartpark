import { Handler } from '@netlify/functions';
import { admin } from '../../services/firebase';

const handler: Handler = async (event, context) => {
  const db = admin.firestore();

  if (event.httpMethod === 'POST') {
    // Add parking lot or slot
    try {
      const { type, ...data } = JSON.parse(event.body);
      if (type === 'lot') {
        const docRef = await db.collection('parkingLots').add(data);
        return {
          statusCode: 200,
          body: JSON.stringify({ id: docRef.id }),
        };
      } else if (type === 'slot') {
        const { lotId, ...slotData } = data;
        const docRef = await db.collection('parkingLots').doc(lotId).collection('slots').add(slotData);
        return {
          statusCode: 200,
          body: JSON.stringify({ id: docRef.id }),
        };
      }
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid type' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'PUT') {
    // Edit parking lot or slot
    try {
      const { type, id, ...data } = JSON.parse(event.body);
      if (type === 'lot') {
        await db.collection('parkingLots').doc(id).update(data);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Parking lot updated successfully' }),
        };
      } else if (type === 'slot') {
        const { lotId, ...slotData } = data;
        await db.collection('parkingLots').doc(lotId).collection('slots').doc(id).update(slotData);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Parking slot updated successfully' }),
        };
      }
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid type' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'DELETE') {
    // Delete parking lot or slot
    try {
      const { type, id, lotId } = JSON.parse(event.body);
      if (type === 'lot') {
        await db.collection('parkingLots').doc(id).delete();
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Parking lot deleted successfully' }),
        };
      } else if (type === 'slot') {
        await db.collection('parkingLots').doc(lotId).collection('slots').doc(id).delete();
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Parking slot deleted successfully' }),
        };
      }
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid type' }),
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
