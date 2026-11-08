// TEMPORAL: pasa las fotos viejas (guardadas en la base como "m:ID") a Firebase Storage.
// Se usa una vez por barbería desde Admin → Negocio y después se elimina este archivo.
import { ref, get } from "firebase/database";
import { db } from "../config/firebase";
import { P, BUSINESS_ID } from "../config/paths";
import { loadMedia, uploadImage } from "./media";
import { dbSet, dbRemove } from "./db";
import { findPhotoRefs } from "./mediaRefs";

const NODES = [P.config, P.services, P.professionals, P.shopProducts];
const KEY = `migratedMedia:${BUSINESS_ID}`;

const readMigrated = () => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const writeMigrated = (ids) => {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* sin espacio */ }
};

export async function findOldPhotos() {
  const out = [];
  for (const node of NODES) {
    const snap = await get(ref(db, node));
    findPhotoRefs(snap.val(), node, out);
  }
  return out;
}

// Sube cada foto vieja a Storage y reemplaza la referencia por la URL. No borra nada.
// Si se corta a la mitad, se puede volver a tocar: sigue con las que faltan.
export async function migratePhotos(onProgress) {
  const refs = await findOldPhotos();
  const ids = [...new Set(refs.map((r) => r.id))];
  const migrated = [];
  let missing = 0;
  for (let i = 0; i < ids.length; i++) {
    onProgress({ i: i + 1, total: ids.length });
    const data = await loadMedia(ids[i]);
    if (!data) { missing++; continue; }
    const url = await uploadImage(data);
    if (!url) throw new Error("Storage todavía no está listo. Revisá que lo activaste y publicaste las reglas de Storage.");
    for (const r of refs.filter((x) => x.id === ids[i])) await dbSet(r.path, url);
    migrated.push(ids[i]);
    writeMigrated([...new Set([...readMigrated(), ids[i]])]);
  }
  return { total: ids.length, migrated, missing };
}

// Borra de la base las fotos ya migradas, solo si ya nada las usa.
export async function cleanOldPhotos() {
  const still = new Set((await findOldPhotos()).map((r) => r.id));
  let removed = 0;
  const keep = [];
  for (const id of readMigrated()) {
    if (still.has(id)) { keep.push(id); continue; }
    await dbRemove(`${P.media}/${id}`);
    removed++;
  }
  writeMigrated(keep);
  return removed;
}
