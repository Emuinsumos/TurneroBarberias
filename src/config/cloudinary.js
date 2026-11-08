// Cloudinary (fotos). Ambos valores son públicos: el upload preset es "sin firma" y solo permite subir imágenes.
// Se pueden cambiar por barbería con VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET en Vercel.
export const CLOUDINARY = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "uwxsmetg",
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "turnero",
};
