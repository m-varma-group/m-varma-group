
# QR Drive Redirect - Firebase Setup Guide

## Step 1: Set Up Firebase

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **“Add project”**
3. Enter a project name (e.g. `QR Drive Redirect`)
4. Disable Google Analytics (optional)
5. Click **“Create project”**

### 1.2 Enable Firestore Database

1. In the left sidebar, go to **Build > Firestore Database**
2. Click **“Create database”**
3. Choose **Start in test mode** (you can secure it later)
4. Select a **Cloud Firestore location** and click **Enable**

### 1.3 Enable Firebase Hosting

1. In the left sidebar, go to **Build > Hosting**
2. Click **“Get started”**
3. Choose **“Set up Hosting”** and follow the instructions

### 1.4 Get Firebase Config Keys

1. In the sidebar, go to **Project Settings**
2. Scroll down to **Your apps**
3. Click the **</> (Web)** icon
4. Register the app name (e.g. `qr-web`)
5. Copy the Firebase config keys (you’ll use these in code later)

---

## Step 2: Firebase Setup in React

### 2.1 Install Firebase SDK

In your React project folder, run:

```bash
npm install firebase
```

### 2.2 Create a Firebase Config File

Create a new file `firebase.js` in your `src` folder:

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
```

Replace the placeholder strings with your Firebase config keys from Step 1.4.

### 2.3 Test Firebase Setup

Add a quick test in any React component to check Firestore connectivity:

```jsx
import React, { useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

const FirestoreTest = () => {
  useEffect(() => {
    async function fetchData() {
      const querySnapshot = await getDocs(collection(db, "testCollection"));
      console.log("Documents in testCollection:", querySnapshot.docs.map(doc => doc.data()));
    }
    fetchData();
  }, []);

  return <div>Check console for Firestore data</div>;
};

export default FirestoreTest;
```

📌 You can create a test document in Firestore manually with the collection name `testCollection`.

---
