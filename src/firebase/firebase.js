import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  initializeAuth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDyDYl1NJ3T2GWTSop9b66GH7NrMiF7wsY",
  authDomain: "fitness-tracker-iota-ashy.vercel.app",
  projectId: "fitnesstracker-a4b97",
  storageBucket: "fitnesstracker-a4b97.firebasestorage.app",
  messagingSenderId: "96246322466",
  appId: "1:96246322466:web:6d12dd18ff4a80958b817b",
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const firestorePersistenceReady = Promise.resolve(true);

googleProvider.setCustomParameters({ prompt: "select_account" });
