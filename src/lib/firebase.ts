import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Types
export type Shape = "rectangle" | "rounded" | "circle" | "custom";

export interface EventConfig {
  name: string;
  templateUrl: string | null; // Base64 data URL
  maskUrl: string | null; // Base64 data URL pour formes personnalisées
  zone: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: Shape;
  };
}

const EVENT_DOC_ID = "current";

// Charger la config
export async function loadEventConfig(): Promise<EventConfig | null> {
  try {
    const docRef = doc(db, "events", EVENT_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as EventConfig;
    }
    return null;
  } catch (error) {
    console.error("Erreur chargement config:", error);
    return null;
  }
}

// Sauvegarder la config (avec images en base64)
export async function saveEventConfig(config: EventConfig): Promise<void> {
  const docRef = doc(db, "events", EVENT_DOC_ID);
  await setDoc(docRef, config);
}
