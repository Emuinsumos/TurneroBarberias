// Pide a Cloudinary la foto en el formato y calidad más livianos para cada celular (f_auto,q_auto).
export function optimizedUrl(url) {
  return String(url).replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}
