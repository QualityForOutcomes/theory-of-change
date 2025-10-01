import { initializeApp } from "firebase/app";
import {getAuth,GoogleAuthProvider} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAJRVA9Tssggj8cOeePo9kTu4StrOfgsFs",
    authDomain: "p000315se.firebaseapp.com",
    projectId: "p000315se",
    storageBucket: "p000315se.firebasestorage.app",
    messagingSenderId: "113828877811",
    appId: "1:113828877811:web:049557794f2e9718bd6e86"
  };

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
  