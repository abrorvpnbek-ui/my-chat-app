// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYeMAHjOgnFukpSdbwn8ZjNLjTE8Cv7X4",
  authDomain: "moi-chat-44e7d.firebaseapp.com",
  databaseURL: "https://moi-chat-44e7d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "moi-chat-44e7d",
  storageBucket: "moi-chat-44e7d.firebasestorage.app",
  messagingSenderId: "454315086965",
  appId: "1:454315086965:web:7ae44c8a0f75d5d9d7d43c",
  measurementId: "G-C6M98CB6CF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);