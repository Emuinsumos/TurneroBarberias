import { useState } from "react";
import { useShopOrders, toList } from "../../lib/data";
import { dbUpdate } from "../../lib/db";
import { P } from "../../config/paths";
import { money } from "../../lib/hours";
import { clientWaNumber, waLink } from "../../lib/whatsapp";
import { ORDER_STATUS, ORDER_STATUS_LIST, itemsOf, matchOrder, clientOrderMessage } from "../../lib/shop";
import { Status, useSave } from "./ui";

const fmtAt = (at) =>
  typeof at === "number" ? new Date(at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "";
const PAGE = 30;

export default function ShopOrdersAdmin() {
  const od = useShopOrders();
  const [q, setQ] = useState("");
  const [fs, setFs] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [st, run] = useSave();

  if (od.loading) return <p className="muted">Cargando…</p>;
  if (od.error) return <p className="form-error">No se pudo leer: {od.error}</p>;

  const all = toList(od.data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const count = (s) => all.filter((o) => o.status === s).length;
  const list = all.filter((o) => (!fs || o.status === fs) && matchOrder(o, q));
  const shown = list.slice(0, limit);

  async function change(o, status) {
    if (status === "cancelada" && !window.confirm(`¿Cancelar el pedido ${o.id} de ${o.customerName}?`)) return;
    await run(() => dbUpdate(P.shopOrder(o.id), { status, updatedAt: Date.now() }), `Pedido ${o.id}: ${ORDER_STATUS[status]} ✓`);
  }

  return (
    <div className="admin-stack">
      <input
        type="search" placeholder="Buscar por código o nombre…" value={q}
        onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
        aria-label="Buscar pedido"
      />
      <div className="btn-row">
        <button type="button" className={`btn sm${fs === "" ? "" : " ghost"}`} onClick={() => { setFs(""); setLimit(PAGE); }}>
          Todos ({all.length})
        </button>
        {ORDER_STATUS_LIST.map((s) => (
          <button key={s} type="button" className={`btn sm${fs === s ? "" : " ghost"}`} onClick={() => { setFs(s); setLimit(PAGE); }}>
            {ORDER_STATUS[s]} ({count(s)})
          </button>
        ))}
      </div>
      <Status st={st} />
      {shown.length === 0 && <p className="muted">{all.length === 0 ? "Todavía no hay pedidos." : "No hay pedidos con ese filtro."}</p>}
      {shown.map((o) => {
        const link = waLink(clientWaNumber(o.customerPhone), clientOrderMessage(o));
        return (
          <div className={`admin-card order${o.status === "cancelada" ? " dim" : ""}`} key={o.id}>
            <div className="toolbar">
              <div>
                <b className="code order-code">{o.id}</b>
                <span className={`tag st-${o.status}`}>{ORDER_STATUS[o.status] || o.status}</span>
              </div>
              <span className="muted small">{fmtAt(o.createdAt)}</span>
            </div>
            <p><b>{o.customerName}</b> · <a href={`tel:${o.customerPhone}`}>{o.customerPhone}</a></p>
            <div className="order-items">
              {itemsOf(o).map((i, k) => (
                <p className="small" key={k}>
                  <b>{i.qty} ×</b> {i.name}{i.variant ? ` (${i.variant})` : ""}
                  {i.price > 0 && <span className="muted"> · {money(i.price * i.qty)}</span>}
                </p>
              ))}
            </div>
            {o.total > 0 && <p><b>Total: {money(o.total)}</b></p>}
            <div className="btn-row" style={{ marginTop: 10 }}>
              {["recibida", "entregada", "cancelada"].map((s) => (
                <button key={s} type="button" className={`btn sm${o.status === s ? "" : " ghost"}`}
                  disabled={st.busy || o.status === s} onClick={() => change(o, s)}>
                  {ORDER_STATUS[s]}
                </button>
              ))}
              {link && <a className="btn ghost sm" href={link} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </div>
        );
      })}
      {list.length > shown.length && (
        <div className="center" style={{ marginTop: 8 }}>
          <button type="button" className="btn ghost" onClick={() => setLimit((n) => n + PAGE)}>
            Ver más ({list.length - shown.length})
          </button>
        </div>
      )}
    </div>
  );
}
