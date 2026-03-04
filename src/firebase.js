import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqHEi7QC-SGqa05b9OPf4Ufm6hULcFpyE",
  authDomain: "inventario-74f6d.firebaseapp.com",
  projectId: "inventario-74f6d",
  storageBucket: "inventario-74f6d.firebasestorage.app",
  messagingSenderId: "241627170771",
  appId: "1:241627170771:web:c3088361574efa3e50d126"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);