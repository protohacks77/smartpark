# SmartPark Application Documentation

## Project Overview

SmartPark is a web application designed to help users find and reserve parking spots. It provides a user-friendly interface for viewing parking lots, reserving spots, and processing payments. The application also includes an admin dashboard for managing parking lots and viewing system activity.

## Technologies Used

### Frontend

*   **React:** A JavaScript library for building user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Firebase (Client SDK):** Used for authentication and real-time database interactions from the client-side.
*   **Recharts:** A composable charting library built on React components.
*   **Tailwind CSS (via PostCSS):** A utility-first CSS framework for rapid UI development.

### Backend

*   **Netlify Functions:** Serverless functions for backend logic.
*   **Firebase Admin SDK:** Used for privileged backend operations like creating custom tokens and interacting with Firestore.
*   **Paynow:** A payment gateway for processing mobile payments.

### Database

*   **Firestore:** A flexible, scalable NoSQL cloud database to store and sync data for client- and server-side development.

## Project Structure

The project is organized into the following main directories:

*   `src/`: Contains the source code for the React frontend application.
    *   `components/`: Reusable React components.
    *   `hooks/`: Custom React hooks.
    *   `services/`: Modules for interacting with external services like Firebase.
*   `netlify/`: Contains the serverless functions for the backend.
    *   `functions/`: The individual serverless function files.
*   `public/`: Static assets that are publicly accessible.

## Frontend

The frontend is a single-page application (SPA) built with React and Vite.

### Key Components

*   `App.tsx`: The main component that manages the application's state and routing.
*   `Header.tsx`: The main navigation bar.
*   `Dock.tsx`: The bottom navigation for mobile view.
*   `screens/`: Components that represent the different screens of the application (Home, Map, Notifications, etc.).
*   `admin/`: Components for the admin dashboard.

### State Management

The application's state is primarily managed within the `App.tsx` component using React's `useState` and `useEffect` hooks. Real-time data synchronization with Firestore is achieved using the Firebase client SDK's `onSnapshot` listeners.

### Routing

The application uses a simple state-based routing system within the `App.tsx` component to switch between different screens. The `activeTab` state variable controls which screen is currently displayed.

## Backend

The backend is built using Netlify Functions, which are serverless functions that run on AWS Lambda.

### Key Functions

*   `initiate-payment.ts`: This function is called by the frontend to start a new payment process. It communicates with the Paynow API to create a payment and returns the necessary information to the client.
*   -`payment-callback.ts`: This function serves as the webhook endpoint for Paynow to send payment status updates. It verifies the authenticity of the request and updates the corresponding payment intent and reservation in Firestore.

## Firebase Integration

Firebase is used for several key features in the application:

*   **Authentication:** Firebase Authentication is used to manage user sign-up, login, and session management.
*   **Firestore:** Firestore is the primary database for storing application data, including:
    *   `users`: User profiles and information.
    *   `parkingLots`: Details about each parking lot, including its slots and pricing.
    *   `reservations`: Records of user reservations.
    *   `paymentIntents`: Temporary records created during the payment process.
    *   `notifications`: User-specific notifications.
    *   `notices`: System-wide announcements.
    *   `bills`: Records of unpaid bills for overstayed reservations.

## Payment Flow

1.  **Initiation:** The user selects a parking spot and initiates a payment from the frontend.
2.  **Serverless Function Call:** The frontend calls the `initiate-payment` Netlify function with the payment details.
3.  **Paynow API:** The `initiate-payment` function communicates with the Paynow API to create a new mobile payment.
4.  **User Confirmation:** The user receives a prompt on their mobile device to confirm the payment.
5.  **Paynow Callback:** Once the user confirms the payment, Paynow sends a POST request to the `payment-callback` webhook URL.
6.  **Webhook Processing:** The `payment-callback` function verifies the request, updates the payment intent in Firestore, creates a new reservation, and updates the availability of the parking slot.
7.  **Real-time Update:** The frontend, which is listening for real-time updates to the reservations collection, is automatically updated with the new reservation information.

## Getting Started

### Prerequisites

*   Node.js (version 18 or higher)
*   npm

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-username/smartpark.git
    cd smartpark
    ```

2.  Install the frontend dependencies:

    ```bash
    npm install
    ```

3.  Install the backend dependencies:

    ```bash
    cd netlify
    npm install
    cd ..
    ```

### Running the Application

1.  **Development Server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server, and you can access the application at `http://localhost:3000`.

2.  **Netlify Dev (for local testing of serverless functions):**

    ```bash
    npm install -g netlify-cli
    netlify dev
    ```

    This will start a local development server that emulates the Netlify environment, allowing you to test the serverless functions locally.

### Building for Production

To create a production build of the application, run the following command:

```bash
npm run build
```

This will generate a `dist` directory with the optimized and minified production assets.
