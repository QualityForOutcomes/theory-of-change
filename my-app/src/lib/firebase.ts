// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your Firebase config (the one you pasted)
const firebaseConfig = {
  apiKey: "AIzaSyAJRVA9Tssggj8cOeePo9kTu4StrOfgsFs",
  authDomain: "p000315se.firebaseapp.com",
  projectId: "p000315se",
  storageBucket: "p000315se.firebasestorage.app",
  messagingSenderId: "113828877811",
  appId: "1:113828877811:web:049557794f2e9718bd6e86",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper to trigger Google popup login
export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const user = result.user;

  // Firebase ID token (send this to backend)
  const idToken = await user.getIdToken();

  return { user, idToken };
}
