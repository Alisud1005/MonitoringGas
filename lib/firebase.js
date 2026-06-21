import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAquiyK29pPzxner7foZG7E1ol-nSu2XFI",
  // PENTING: Untuk di Next.js, tautan URL wajib memakai awalan https://
  databaseURL: "https://monitoring-gas-iot-62940-default-rtdb.asia-southeast1.firebasedatabase.app" 
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);