import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { serverTimestamp } from "firebase/database";
import { useConfig, usePlan, useShopProducts, toList } from "../../lib/data";
import { dbSet } from "../../lib/db";
import { P, BUSINESS_ID } from "../../config/paths";
import Img from "../../components/Img";
import { money, initials } from "../../lib/hours";
import { validateClientData } from "../../lib/validation";
import { waLink } from "../../lib/whatsapp";
import {
  isShopOn, variantsOf, addToCart, setQty, cartTotal, cartCount,
  orderItems, makeOrderCode, orderMessage,
} from "../../lib/shop";

const CART_KEY = `shopCart:${BUSINESS_ID}`;

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(v)
      ? v.filter((i) => i && i.key && Number.isFinite(i.price) && Number.isFinite(i.qty) && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* sin espacio: no pasa nada */ }
}

function ProductCard({ p, onAdd }) {
  const vs = variantsOf(p);
  const [vi, setVi] = useState(0);
  const v = vs[vi];
  return (
    <article className="shop-card">
      <div className="shop-img">
        {p.image ? <Img src={p.image} alt={p.name} loading="lazy" /> : <span className="muted small">Sin foto</span>}
      </div>
      <div className="shop-body">
        <h3>{p.name}</h3>
        {p.description && <p className="muted small">{p.description}</p>}
        {vs.length > 1 && (
          <div className="chips">
            {vs.map((x, i) => (
              <button type="button" key={i} className={`chip-btn${i === vi ? " on" : ""}`} onClick={() => setVi(i)}>
                {x.label}
              </button>
            ))}
          </div>
        )}
        <div className="shop-foot">
          <b className="price">{v ? money(v.price) : "Consultar"}</b>
          <button type="button" className="btn sm" disabled={!v} onClick={() => onAdd(p, vi, v)}>Agregar</button>
        </div>
      </div>
    </article>
  );
}

export default function Shop() {
  const cfg = useConfig();
  const plan = usePlan();
  const prods = useShopProducts();
  const [cart, setCart] = useState(loadCart);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const c = cfg.data || {};

  useEffect(() => {
    if (c.accentColor) document.documentElement.style.setProperty("--accent", c.accentColor);
    if (c.name) document.title = `Shop · ${c.name}`;
  }, [c.accentColor, c.name]);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (cfg.loading || plan.loading || prods.loading)
    return <div className="splash"><div className="spinner" /></div>;
  if (cfg.error || prods.error)
    return <div className="wrap" style={{ paddingTop: 80 }}><p>No se pudo cargar: {cfg.error || prods.error}</p></div>;
  if (!isShopOn(plan.data, c))
    return (
      <div className="wrap" style={{ padding: "80px 16px", textAlign: "center" }}>
        <h2>Shop no disponible</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Por ahora no hay productos a la venta.</p>
        <Link className="btn" to="/">Ir al inicio</Link>
      </div>
    );

  const products = toList(prods.data)
    .filter((p) => p.active !== false && !p.deleted && variantsOf(p).length > 0)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const total = cartTotal(cart);
  const count = cartCount(cart);
  const wa = (c.whatsapp || "").replace(/\D/g, "");

  function add(p, vi, v) {
    setCart((cur) => addToCart(cur, { productId: p.id, variantIndex: vi, name: p.name, variant: v.label, price: v.price }));
    setToast(`${p.name} agregado ✓`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 1400);
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    const phone = form.phone.trim();
    const errs = validateClientData({ name, phone });
    if (errs.name || errs.phone) { setErr(errs.name || errs.phone); return; }
    setBusy(true);
    setErr("");
    try {
      const items = orderItems(cart);
      let code = null;
      // El código es la clave del pedido: si justo existiera, las reglas lo rechazan y probamos otro.
      for (let i = 0; i < 5 && !code; i++) {
        const tryCode = makeOrderCode();
        try {
          await dbSet(P.shopOrder(tryCode), {
            code: tryCode, customerName: name, customerPhone: phone,
            items, total, status: "pendiente", createdAt: serverTimestamp(),
          });
          code = tryCode;
        } catch (ex) {
          if (!String(ex?.code || ex?.message || "").toUpperCase().includes("PERMISSION")) throw ex;
        }
      }
      if (!code) throw new Error("No se pudo registrar el pedido. Probá de nuevo o escribinos por WhatsApp.");
      setDone({ code, name, items, total });
      setCart([]);
      setOpen(false);
      setForm({ name: "", phone: "" });
    } catch (ex) {
      setErr(ex.message || "No se pudo registrar el pedido");
    } finally {
      setBusy(false);
    }
  }

  const nav = (
    <nav className="nav">
      <div className="nav-in">
        <Link className="brand" to="/">
          {c.logo ? <Img src={c.logo} alt="" /> : <span className="brand-dot">{initials(c.name)}</span>}
          <span>{c.name}</span>
        </Link>
        <div className="nav-right">
          <Link className="btn ghost sm" to="/">Inicio</Link>
          <button type="button" className="btn sm" onClick={() => setOpen(true)}>
            Carrito{count > 0 ? ` (${count})` : ""}
          </button>
        </div>
      </div>
    </nav>
  );

  if (done) {
    const link = wa && waLink(wa, orderMessage({ businessName: c.name, ...done }));
    return (
      <div className="page">
        {nav}
        <div className="wrap shop-done">
          <h2>¡Pedido registrado!</h2>
          <p className="muted">
            Tu código es <b className="code">{done.code}</b>. Guardalo y presentalo en el local para retirar tu pedido.
          </p>
          <div className="admin-card">
            {done.items.map((i, k) => (
              <p key={k} className="small">
                <b>{i.qty} ×</b> {i.name}{i.variant ? ` (${i.variant})` : ""}
                {i.price > 0 && <span className="muted"> · {money(i.price * i.qty)}</span>}
              </p>
            ))}
            {done.total > 0 && <p style={{ marginTop: 8 }}><b>Total: {money(done.total)}</b></p>}
          </div>
          <p className="muted small">Retirás en el local y ahí coordinás el pago.</p>
          <div className="btn-col">
            {link && <a className="btn" href={link} target="_blank" rel="noreferrer">Avisar por WhatsApp</a>}
            <button type="button" className="btn ghost" onClick={() => setDone(null)}>Seguir mirando</button>
            <Link className="btn ghost" to="/">Ir al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: count > 0 ? 90 : 0 }}>
      {nav}
      <main className="section">
        <div className="wrap">
          <p className="kicker">Productos</p>
          <h2>Shop</h2>
          {products.length === 0 ? (
            <p className="muted">Todavía no hay productos cargados.</p>
          ) : (
            <div className="shop-grid">
              {products.map((p) => <ProductCard key={p.id} p={p} onAdd={add} />)}
            </div>
          )}
        </div>
      </main>

      {toast && <div className="shop-toast" role="status">{toast}</div>}

      {count > 0 && !open && (
        <div className="sticky-cta">
          <button type="button" className="btn lg" onClick={() => setOpen(true)}>
            Ver pedido · {count} {count === 1 ? "producto" : "productos"}{total > 0 ? ` · ${money(total)}` : ""}
          </button>
        </div>
      )}

      {open && (
        <div className="sheet-back" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Tu pedido" onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h3>Tu pedido</h3>
              <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setOpen(false)}>✕</button>
            </div>
            {cart.length === 0 ? (
              <p className="muted" style={{ padding: "18px 0" }}>Tu carrito está vacío.</p>
            ) : (
              <>
                <div className="cart-lines">
                  {cart.map((l) => (
                    <div className="cart-line" key={l.key}>
                      <div>
                        <b>{l.name}</b>{l.variant && <span className="muted small"> · {l.variant}</span>}
                        <p className="muted small">{money(l.price)}</p>
                      </div>
                      <div className="qty">
                        <button type="button" aria-label="Menos" onClick={() => setCart((cur) => setQty(cur, l.key, l.qty - 1))}>−</button>
                        <span>{l.qty}</span>
                        <button type="button" aria-label="Más" onClick={() => setCart((cur) => setQty(cur, l.key, l.qty + 1))}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total"><span>Total</span><b>{money(total)}</b></div>
                <form onSubmit={submit}>
                  <label className="field">
                    <span>Nombre y apellido</span>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" required />
                  </label>
                  <label className="field">
                    <span>Teléfono</span>
                    <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="tel" required />
                  </label>
                  {err && <p className="form-error">{err}</p>}
                  <button className="btn lg" type="submit" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
                    {busy ? "Enviando…" : "Confirmar pedido"}
                  </button>
                  <p className="muted small" style={{ marginTop: 10 }}>
                    Retirás en el local. El pago lo coordinás directamente con ellos.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
