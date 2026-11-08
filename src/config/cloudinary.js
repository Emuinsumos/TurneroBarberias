// Cloudinary (fotos). Ambos valores son públicos: el upload preset es "sin firma" y solo permite subir imágenes.
export const CLOUDINARY = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "",
};
