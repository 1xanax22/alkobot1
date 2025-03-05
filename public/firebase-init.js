// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD8Z1a3VJqFxkAqKFPFrZfKlzFGPDq7PLQ",
    authDomain: "stopalko01-bot.firebaseapp.com",
    databaseURL: "https://stopalko01-bot-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "stopalko01-bot",
    storageBucket: "stopalko01-bot.appspot.com",
    messagingSenderId: "654860337827",
    appId: "1:654860337827:web:d1a35b6a3f4b439b6ddb41"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
window.database = database; // Make it globally available

// Test database connection
const connectedRef = database.ref(".info/connected");
connectedRef.on("value", (snap) => {
    console.log("Firebase connection state:", snap.val());
    if (snap.val() === true) {
        console.log("✅ Connected to Firebase");
    } else {
        console.error("❌ Not connected to Firebase");
        alert("Нет подключения к базе данных");
    }
});
