# SmartPark Application Documentation

## 1. Project Overview

SmartPark is a comprehensive web application designed to streamline the process of finding, reserving, and paying for parking spots. It features a real-time map-based interface for users to view parking lot availability, and a complete backend system for handling reservations and payments. The application also includes an administrative dashboard for managing the parking infrastructure.

## 2. Core Technologies

### Frontend

*   **React & TypeScript:** For building a type-safe, component-based user interface.
*   **Vite:** As the build tool and development server for a fast and modern workflow.
*   **Firebase Client SDK:** For handling user authentication and receiving real-time database updates from Firestore.
*   **Leaflet.js:** An open-source library for interactive maps, used to display parking lots and user locations.

### Backend

*   **Netlify Functions:** Serverless functions that provide the backend logic for payment processing and other server-side tasks.
*   **Firebase Admin SDK:** Used within the Netlify Functions for privileged operations such as creating database records and managing user data.
*   **Paynow:** The payment gateway integrated for processing mobile payments.

### Database

*   **Firestore:** A NoSQL cloud database used to store all application data, including user profiles, parking lot information, reservations, and payment records.

## 3. Detailed Application Workflow

This section breaks down the primary user and system workflows, explaining how different parts of the application interact.

### 3.1. User Authentication

1.  **Login/Sign-up:** Users can create an account or log in using email/password or Google authentication. This process is managed by the `LoginModal.tsx` component, which uses Firebase Authentication.
2.  **Session Management:** Upon successful login, Firebase creates a user session. The main `App.tsx` component listens for authentication state changes and fetches the user's profile from the `users` collection in Firestore.
3.  **User Data:** The user's profile, including their car plate number and EcoCash number, is stored in Firestore and can be managed from the `SettingsScreen.tsx`.

### 3.2. Finding and Reserving a Parking Spot

1.  **Viewing Parking Lots:** The `MapScreen.tsx` is the primary interface for finding parking. It displays all parking lots from the `parkingLots` collection in Firestore as markers on a Leaflet map. The markers are color-coded to indicate availability.
2.  **Selecting a Lot:** When a user clicks on a parking lot marker, the map zooms in to show individual parking slots, which are also color-coded. This detailed view is managed by the "spiderfy" logic in `MapScreen.tsx`.
3.  **Initiating a Reservation:** The user can then click the "Reserve a Spot" button, which opens the `ReservationModal.tsx`.
4.  **Reservation Details:** Inside the modal, the user selects an available slot and the desired reservation duration. The total price is calculated based on the lot's hourly rate.
5.  **Confirmation and Payment:** Clicking "Confirm & Pay" triggers the `onInitiatePayment` function, which passes the reservation details to the payment workflow.

### 3.3. Payment Process

1.  **Backend Request:** The frontend calls the `initiate-payment` Netlify function, sending the reservation details.
2.  **Payment Intent:** The function first creates a `paymentIntent` document in Firestore to track the payment's status.
3.  **Paynow Integration:** It then communicates with the Paynow API, sending the payment amount and user's EcoCash number.
4.  **User Confirmation:** The user receives a push notification on their mobile device to approve the payment.
5.  **Payment Callback:** Once the payment is approved, Paynow sends a confirmation to the `payment-callback` Netlify function (webhook).
6.  **Hash Verification:** For security, this function verifies a cryptographic hash in the request to ensure it genuinely came from Paynow.
7.  **Database Updates:** Upon successful verification, the function performs several critical database operations within a Firestore transaction to ensure data integrity:
    *   The `paymentIntent` is marked as "successful."
    *   A new `reservation` document is created with the start and end times.
    *   The corresponding slot in the `parkingLots` collection is marked as occupied.
8.  **User Notification:** Finally, a notification is created in the `notifications` collection, informing the user of their successful reservation. The frontend, listening for real-time updates, displays this notification on the `NotificationsScreen.tsx`.

### 3.4. Active Parking and Overstay Management

1.  **Marking as Parked:** In the `NotificationsScreen.tsx`, the user has a "Mark as Parked" button for their active reservation. Clicking this updates the reservation's `startTime` to the current time and recalculates the `endTime`.
2.  **Overstay Check:** A recurring background process in the `App.tsx` component's `useEffect` hook periodically checks for active reservations where the `endTime` has passed.
3.  **Billing:** If an overstay is detected, the system calculates the overstay duration and creates a `bill` document in Firestore with the amount due.
4.  **Bill Notification:** The user receives a notification about the outstanding bill and is prompted to pay it via the `PayBillModal.tsx`. Users with outstanding bills are prevented from making new reservations.

## 4. Setting Up the Project

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or a compatible package manager)
*   Netlify CLI (for local testing of serverless functions)

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd smartpark
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd netlify
    npm install
    cd ..
    ```

### Running the Application

1.  **For Frontend Development:**
    ```bash
    npm run dev
    ```
    This starts the Vite development server, accessible at `http://localhost:3000`.

2.  **For Full-Stack Local Development (including serverless functions):**
    ```bash
    netlify dev
    ```
    This command starts a local environment that mimics the Netlify production environment, allowing you to test the entire application, including the backend functions.

### Building for Production

To create an optimized production build of the frontend, run:

```bash
npm run build
```

This command bundles the application into a `dist` directory, which can then be deployed to a static hosting service like Netlify.
