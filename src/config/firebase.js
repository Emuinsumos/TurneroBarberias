import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Si no se define, usa el bucket por defecto de los proyectos nuevos de Firebase.
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : undefined),
});

export const db = getDatabase(app);
export const auth = getAuth(app);

// Storage se carga recién cuando el admin sube una foto: el público no descarga ese código.
export async function getBucket() {
  const { getStorage } = await import("firebase/storage");
  const storage = getStorage(app);
  storage.maxUploadRetryTime = 20000;
  storage.maxOperationRetryTime = 20000;
  return storage;
}
