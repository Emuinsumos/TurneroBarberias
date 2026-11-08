// Lógica pura del Shop (sin React ni Firebase, así se puede testear).
import { money } from "./hours.js";

export const ORDER_STATUS = { pendiente: "Nueva", recibida: "Recibida", entregada: "Entregada", cancelada: "Cancelada" };
export const ORDER_STATUS_LIST = ["pendiente", "recibida", "entregada", "cancelada"];

// El Shop aparece solo si el local lo prendió desde su panel (config/shopEnabled).
export const isShopOn = (cfg) => cfg?.shopEnabled === true;

// Código de retiro: 6 caracteres sin letras/números que se confunden (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeOrderCode(len = 6) {
  const buf = new Uint32Array(len);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

// Un producto puede tener varios precios según el tamaño: variants = [{ label, price }]
export function variantsOf(p) {
  const raw = Array.isArray(p?.variants) ? p.variants : Object.values(p?.variants || {});
  return raw
    .filter((v) => v && Number.isFinite(Number(v.price)))
    .map((v) => ({ label: String(v.label || "").trim(), price: Number(v.price) }));
}

export function priceLabel(p) {
  const prices = variantsOf(p).map((v) => v.price);
  if (!prices.length) return "Consultar";
  const min = Math.min(...prices);
  return min === Math.max(...prices) ? money(min) : `Desde ${money(min)}`;
}

// ---- Carrito: lista de { key, productId, variantIndex, name, variant, price, qty } ----
export const lineKey = (productId, variantIndex) => `${productId}:${variantIndex}`;
export const cartTotal = (items) => items.reduce((t, i) => t + i.price * i.qty, 0);
export const cartCount = (items) => items.reduce((t, i) => t + i.qty, 0);

export function addToCart(items, line) {
  const key = lineKey(line.productId, line.variantIndex);
  if (items.some((x) => x.key === key))
    return items.map((x) => (x.key === key ? { ...x, qty: Math.min(99, x.qty + 1) } : x));
  return [...items, { ...line, key, qty: 1 }];
}

export function setQty(items, key, qty) {
  if (qty <= 0) return items.filter((x) => x.key !== key);
  return items.map((x) => (x.key === key ? { ...x, qty: Math.min(99, qty) } : x));
}

// Lo que se guarda en el pedido (sin undefined, que Firebase no acepta)
export const orderItems = (items) =>
  items.map(({ productId, name, variant, price, qty }) => ({
    productId, name, variant: variant || "", price, qty,
  }));

export const itemsOf = (o) => (Array.isArray(o?.items) ? o.items : Object.values(o?.items || {}));

// ---- Pedidos ----
const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Buscador del panel: por código o por nombre del cliente (sin importar mayúsculas ni tildes)
export function matchOrder(o, query) {
  const q = norm(query).replace(/^#/, "");
  if (!q) return true;
  return norm(o.code || o.id).includes(q) || norm(o.customerName).includes(q);
}

const fmt = (n) => `$${Number(n).toLocaleString("es-AR")}`;
const lineText = (i) => `${i.qty} x ${i.name}${i.variant ? ` (${i.variant})` : ""}${i.price > 0 ? ` — ${fmt(i.price * i.qty)}` : ""}`;

// Mensaje del cliente hacia el local
export function orderMessage({ businessName, name, items, total, code }) {
  return [
    `¡Hola${businessName ? ` ${businessName}` : ""}! Hice un pedido en el Shop:`,
    "",
    `Nombre: ${name}`,
    ...items.map((i) => `• ${lineText(i)}`),
    total > 0 ? `Total: ${fmt(total)}` : null,
    `Código: ${code}`,
  ].filter((l) => l !== null).join("\n");
}

// Mensaje del local hacia el cliente
export function clientOrderMessage(o) {
  const first = String(o.customerName || "").split(" ")[0];
  const code = o.code || o.id;
  if (o.status === "entregada") return `¡Gracias por tu compra, ${first}! Pedido ${code} entregado.`;
  if (o.status === "cancelada") return `Hola, ${first}. Tu pedido ${code} fue cancelado. Cualquier duda escribinos.`;
  return `¡Hola, ${first}! Recibimos tu pedido ${code}${o.total > 0 ? ` (total ${fmt(o.total)})` : ""}. Podés retirarlo en el local.`;
}
