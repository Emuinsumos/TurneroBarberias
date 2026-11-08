// TEMPORAL (migración de fotos a Cloudinary): busca referencias a fotos viejas ("m:ID") dentro de un nodo.
export const OLD_PHOTO_RE = /^m:[\w-]{15,}$/;

export function findPhotoRefs(value, path, out = []) {
  if (typeof value === "string") {
    if (OLD_PHOTO_RE.test(value)) out.push({ path, id: value.slice(2) });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) findPhotoRefs(v, `${path}/${k}`, out);
  }
  return out;
}
