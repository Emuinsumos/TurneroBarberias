import { useState } from "react";
import { useConfig, usePlan } from "../../lib/data";
import { dbUpdate } from "../../lib/db";
import { P } from "../../config/paths";
import { Check, Status, useSave } from "./ui";
import ShopProductsAdmin from "./ShopProductsAdmin";
import ShopOrdersAdmin from "./ShopOrdersAdmin";

export default function ShopAdmin() {
  const plan = usePlan();
  const cfg = useConfig();
  const [tab, setTab] = useState("pedidos");
  const [st, run] = useSave();

  if (plan.loading || cfg.loading) return <p className="muted">Cargando…</p>;

  // Sin plan habilitado el Shop queda bloqueado (también lo bloquean las reglas de Firebase).
  if (plan.data?.shop !== true)
    return (
      <div className="admin-card">
        <h3>🔒 Shop</h3>
        <p className="muted">
          Vendé tus productos con catálogo digital, carrito y pedidos para retirar en el local.
          Esta función está disponible en un plan superior. Consultá para activarla.
        </p>
      </div>
    );

  const on = cfg.data?.shopEnabled === true;
  return (
    <div className="admin-stack">
      <div className="admin-card">
        <Check checked={on} onChange={(v) => run(() => dbUpdate(P.config, { shopEnabled: v }), v ? "Shop visible en la página ✓" : "Shop oculto ✓")}>
          Mostrar el botón SHOP en la página
        </Check>
        <Status st={st} />
      </div>
      <div className="btn-row">
        <button type="button" className={`btn sm${tab === "pedidos" ? "" : " ghost"}`} onClick={() => setTab("pedidos")}>Pedidos</button>
        <button type="button" className={`btn sm${tab === "productos" ? "" : " ghost"}`} onClick={() => setTab("productos")}>Productos</button>
      </div>
      {tab === "pedidos" ? <ShopOrdersAdmin /> : <ShopProductsAdmin />}
    </div>
  );
}
