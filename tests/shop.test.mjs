import assert from "node:assert/strict";
import {
  isShopOn, makeOrderCode, variantsOf, priceLabel, addToCart, setQty, cartTotal, cartCount,
  orderItems, itemsOf, matchOrder, orderMessage, clientOrderMessage,
} from "../src/lib/shop.js";

// El Shop solo se ve con plan habilitado Y prendido por el local
assert.equal(isShopOn({ shop: true }, { shopEnabled: true }), true);
assert.equal(isShopOn({ shop: true }, { shopEnabled: false }), false);
assert.equal(isShopOn({}, { shopEnabled: true }), false);
assert.equal(isShopOn(null, null), false);

// códigos: 6 caracteres, sin 0/O/1/I, y matchean la regla de Firebase
for (let i = 0; i < 200; i++) assert.match(makeOrderCode(), /^[A-HJ-NP-Z2-9]{6}$/);
assert.notEqual(makeOrderCode(), makeOrderCode());

// precios por tamaño (también cuando Firebase devuelve objeto en vez de array)
const p = { variants: [{ label: "Chico", price: 3000 }, { label: "Grande", price: 5000 }] };
assert.deepEqual(variantsOf(p).map((v) => v.price), [3000, 5000]);
assert.deepEqual(variantsOf({ variants: { 0: { label: "", price: 10 }, 1: { label: "X", price: 20 } } }).length, 2);
assert.equal(variantsOf({}).length, 0);
assert.equal(variantsOf({ variants: [{ label: "a", price: "x" }] }).length, 0);
assert.ok(priceLabel(p).startsWith("Desde"));
assert.equal(priceLabel({ variants: [{ label: "", price: 0 }] }), "Consultar");
assert.equal(priceLabel({}), "Consultar");

// carrito
let cart = [];
cart = addToCart(cart, { productId: "a", variantIndex: 0, name: "Cera", variant: "Chico", price: 3000 });
cart = addToCart(cart, { productId: "a", variantIndex: 0, name: "Cera", variant: "Chico", price: 3000 });
cart = addToCart(cart, { productId: "a", variantIndex: 1, name: "Cera", variant: "Grande", price: 5000 });
assert.equal(cart.length, 2);
assert.equal(cartCount(cart), 3);
assert.equal(cartTotal(cart), 11000);
cart = setQty(cart, "a:0", 5);
assert.equal(cartTotal(cart), 20000);
cart = setQty(cart, "a:0", 500);
assert.equal(cart[0].qty, 99);
cart = setQty(cart, "a:0", 0);
assert.equal(cart.length, 1);
assert.ok(!JSON.stringify(orderItems(cart)).includes("undefined"));
assert.equal(orderItems([{ productId: "z", name: "N", price: 1, qty: 1 }])[0].variant, "");

// buscador: por código o nombre, sin importar tildes ni mayúsculas
const o = { code: "K7M2QX", customerName: "José Pérez" };
assert.ok(matchOrder(o, ""));
assert.ok(matchOrder(o, "k7m2"));
assert.ok(matchOrder(o, "#K7M2QX"));
assert.ok(matchOrder(o, "jose"));
assert.ok(matchOrder(o, "PEREZ"));
assert.ok(!matchOrder(o, "zzz"));
assert.equal(itemsOf({ items: { 0: { name: "a" } } }).length, 1);
assert.equal(itemsOf({}).length, 0);

// mensajes
const items = [{ name: "Cera", variant: "Grande", price: 5000, qty: 2 }];
const m = orderMessage({ businessName: "Barber", name: "Ana", items, total: 10000, code: "K7M2QX" });
assert.ok(m.includes("K7M2QX") && m.includes("Cera") && m.includes("Grande") && m.includes("Total"));
assert.ok(!orderMessage({ name: "Ana", items, total: 0, code: "X" }).includes("Total"));
assert.ok(clientOrderMessage({ code: "K7M2QX", customerName: "Ana Gómez", status: "entregada" }).includes("Ana"));
assert.ok(clientOrderMessage({ code: "K7M2QX", customerName: "Ana", status: "cancelada" }).includes("cancelado"));
console.log("OK shop");
