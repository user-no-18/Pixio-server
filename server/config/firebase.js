import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get service account based on environment
const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Vercel: Decode Base64 environment variable
    const decodedKey = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 
      'base64'
    ).toString('utf-8');
    return JSON.parse(decodedKey);
  } else {
    // Local: Read from file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serviceAccountPath = path.join(__dirname, "firebaseServiceAccount.json");
    return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }
};

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;