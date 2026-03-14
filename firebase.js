import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAYeMAHjOgnFukpSdbwn8ZjNLjTE8Cv7X4",
  authDomain:        "moi-chat-44e7d.firebaseapp.com",
  databaseURL:       "https://moi-chat-44e7d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "moi-chat-44e7d",
  storageBucket:     "moi-chat-44e7d.firebasestorage.app",
  messagingSenderId: "454315086965",
  appId:             "1:454315086965:web:7ae44c8a0f75d5d9d7d43c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
