import React, { useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

const FirestoreTest = () => {
  useEffect(() => {
    async function fetchData() {
      try {
        const querySnapshot = await getDocs(collection(db, "testCollection"));

        if (querySnapshot.empty) {
          alert("No documents found in testCollection.");
        } else {
          let dataText = "";
          querySnapshot.forEach((doc) => {
            dataText += `Doc ID: ${doc.id}\nData: ${JSON.stringify(doc.data(), null, 2)}\n\n`;
          });
          alert(dataText);
        }
      } catch (err) {
        alert("Firestore fetch error: " + err.message);
      }
    }

    fetchData();
  }, []);

  return <div>Firestore test ran. Check the popup.</div>;
};



export default FirestoreTest;