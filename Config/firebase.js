
import { initializeApp, getApp, getApps } from "firebase/app";
import {initializeAuth,getAuth,getReactNativePersistence,} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCxIkDbLV7mWFWLaa7XGktx5RVK9riq7xQ",
  authDomain: "chicken-manager-e8bdb.firebaseapp.com",
  projectId: "chicken-manager-e8bdb",
  storageBucket: "chicken-manager-e8bdb.firebasestorage.app",
  messagingSenderId: "256678029945",
  appId: "1:256678029945:web:4d78a222da58f3128e02a8",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

const db = getFirestore(app);
export { app, auth, db };
