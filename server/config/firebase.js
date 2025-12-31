import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

if (!admin.apps.length) {
  try {
    // Check if we have individual environment variables (Vercel/Production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log("✅ Initializing Firebase with environment variables");
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      
      console.log("✅ Firebase Admin initialized successfully");
    } 
    // Fallback to local JSON file (Local Development)
    else {
      console.log("📁 Using local Firebase service account file");
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const serviceAccountPath = path.join(__dirname, "firebaseServiceAccount.json");
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("✅ Firebase Admin initialized from local file");
      } else {
        console.warn("⚠️ Firebase service account file not found. Google Auth will not work.");
      }
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error.message);
  }
}

export default admin;