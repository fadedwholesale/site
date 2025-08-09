// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5Q45_-o5iZcsHeoWEwsQLtVC_A9Z8ixo",
  authDomain: "wholesale-95ceb.firebaseapp.com",
  projectId: "wholesale-95ceb",
  storageBucket: "wholesale-95ceb.firebasestorage.app",
  messagingSenderId: "719478576563",
  appId: "1:719478576563:web:c4e06fbd5e59882f86a7c6",
  measurementId: "G-Z3RXB38R19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the initialized services
export { app, analytics, auth, db, storage };
