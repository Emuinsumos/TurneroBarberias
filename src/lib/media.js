import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../config/firebase";
import { P, BUSINESS_ID } from "../config/paths";
import { CLOUDINARY } from "../config/cloudinary";
import { optimizedUrl } from "./cloudinaryUrl";

// Las fotos subidas se guardan aparte (media/{id}) y en los datos solo queda "m:{id}".
// Así los datos de la página (servicios, equipo, config) siguen siendo livianos y cada
// foto se baja una sola vez (queda en memoria y en el almacenamiento del navegador).
export const isMedia = (v) => typeof v === "string" && v.startsWith("m:");

const mem = new Map();
const pending = new Map();

function fromStore(id) {
  try { return localStorage.getItem(`media:${id}`); } catch { return null; }
}
function toStore(id, v) {
  try { localStorage.setItem(`media:${id}`, v); } catch { /* sin espacio: no pasa nada */ }
}

export function loadMedia(id) {
  if (mem.has(id)) return Promise.resolve(mem.get(id));
  const cached = fromStore(id);
  if (cached) { mem.set(id, cached); return Promise.resolve(cached); }
  if (!pending.has(id)) {
    pending.set(
      id,
      get(ref(db, `${P.media}/${id}`))
        .then((s) => {
          const v = s.val();
          if (typeof v === "string") { mem.set(id, v); toStore(id, v); }
          return typeof v === "string" ? v : null;
        })
        .catch(() => null)
        .finally(() => pending.delete(id))
    );
  }
  return pending.get(id);
}

// Devuelve la URL real a mostrar (links normales pasan directo).
export function useImgUrl(value) {
  const id = isMedia(value) ? value.slice(2) : null;
  const [url, setUrl] = useState(() => (id ? mem.get(id) || null : value || null));
  useEffect(() => {
    if (!id) { setUrl(value || null); return undefined; }
    let alive = true;
    loadMedia(id).then((v) => alive && setUrl(v));
    return () => { alive = false; };
  }, [id, value]);
  return url;
}

// ---- Subida de fotos nuevas a Cloudinary (plan gratis, sin tarjeta) ----
// Devuelve la URL pública (https://...). Si Cloudinary no está configurado o falla devuelve null y el
// llamador usa el método anterior (guardar en la base), así subir fotos nunca deja de andar.
export async function uploadImage(dataUrl) {
  const { cloudName, uploadPreset } = CLOUDINARY;
  if (!cloudName || !uploadPreset) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const body = new FormData();
    body.append("file", blob);
    body.append("upload_preset", uploadPreset);
    body.append("folder", `businesses/${BUSINESS_ID}`);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
    const json = await res.json();
    if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return optimizedUrl(json.secure_url);
  } catch (e) {
    console.warn("Cloudinary no disponible, la foto se guarda en la base:", e?.message || e);
    return null;
  }
}
