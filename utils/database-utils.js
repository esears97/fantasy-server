require("dotenv").config();
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(Buffer.from(process.env.GOOGLE_CREDS, "base64"))
    ),
  });
  
  const db = admin.firestore();

module.exports = {db, Timestamp: admin.firestore.Timestamp}