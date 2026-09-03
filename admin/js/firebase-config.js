// admin/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Substitua com os dados do console do Firebase (Configurações do Projeto)
const firebaseConfig = {
  apiKey: "AIzaSyCmNDeSYpQNzlecPYr14lyw0dOqL3HVSdo",
  authDomain: "training-work.firebaseapp.com",
  projectId: "training-work",
  storageBucket: "training-work.firebasestorage.app",
  messagingSenderId: "727749084762",
  appId: "1:727749084762:web:e000dd84decbb7d577fa63",
  measurementId: "G-1H1VC22G15"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);