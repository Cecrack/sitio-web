// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBGlP6JI7CnJh-MXVrzNfuZlVDUnW51jHc",
    authDomain: "ganaderia-d357d.firebaseapp.com",
    projectId: "ganaderia-d357d",
    storageBucket: "ganaderia-d357d.firebasestorage.app",
    messagingSenderId: "490392434742",
    appId: "1:490392434742:web:69d99d8ae9787abfb80097",
    measurementId: "G-Q55L8JX9WX"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
