import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAq70AER3541hJOUhrj4GEBCs-ChkRNjog",
  authDomain: "slaskecards.firebaseapp.com",
  projectId: "slaskecards",
  storageBucket: "slaskecards.firebasestorage.app",
  messagingSenderId: "282880805544",
  appId: "1:282880805544:web:bd295dcb1fe0a5e5bb909d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

