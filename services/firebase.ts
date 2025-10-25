
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';
// import { getFunctions } from 'firebase/functions';

// FIX: Switched to Firebase v8 compat imports to resolve missing export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBGAiw7InabqWQTzxE00wj3DD8ov3Fla_Q",
  authDomain: "smatpark-9c5dc.firebaseapp.com",
  databaseURL: "https://smatpark-9c5dc-default-rtdb.firebaseio.com",
  projectId: "smatpark-9c5dc",
  storageBucket: "smatpark-9c5dc.appspot.com",
  messagingSenderId: "63579930759",
  appId: "1:63579930759:web:e2db504ff5169cd00bb822"
};


const app = firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
export const functions = firebase.functions();