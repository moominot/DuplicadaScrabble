
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBpmcsNinXdrg7hx_XLVU7A1uKfJwY9TfI",
  authDomain: "duplicada-15dd5.firebaseapp.com",
  // IMPORTANT: Aquesta URL és necessària per a Realtime Database.
  // Si vas triar "Belgium" (Europa) en crear la BD, la URL serà diferent 
  // (ex: "https://duplicada-15dd5-default-rtdb.europe-west1.firebasedatabase.app")
  // Pots trobar la URL correcta a la Consola de Firebase > Realtime Database > Data tab.
  databaseURL: "https://duplicada-15dd5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "duplicada-15dd5",
  storageBucket: "duplicada-15dd5.firebasestorage.app",
  messagingSenderId: "831532666384",
  appId: "1:831532666384:web:c9d02cb6176d3ff5b5c495"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
