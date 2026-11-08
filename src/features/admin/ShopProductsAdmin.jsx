import { useState } from "react";
import { useShopProducts, toList } from "../../lib/data";
import { dbUpdate, newKey } from "../../lib/db";
import { P } from "../../config/paths";
import Img from "../../components/Img";
import { priceLabel, variantsOf } from "../../lib/shop";
import { Field, Check, Status, useSave, optional } from "./ui";
import { ImageInput } from "./ImageInput";

const blank = () => ({
  id: null, name: "", description: "", image: "", order: "",
  active: true, variants: [{ label: "", price: "" }],
});

export default function ShopProductsAdmin() {
  const pd = useShopProducts();
  const [form, setForm] = useState(null);
  const [st, run] = useSave();

  if (pd.loading) return <p className="muted">Cargando…</p>;
  if (pd.error) return <p className="form-error">No se pudo leer: {pd.error}</p>;

  const list = toList(pd.data).filter((p) => !p.deleted).sort((a, b) => (a.order || 0) - (b.order || 0));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setVariant = (i, k, v) =>
    setForm((f) => ({ ...f, variants: f.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  const edit = (p) => {
    const vs = variantsOf(p).map((v) => ({ label: v.label, price: String(v.price) }));
    setForm({
      id: p.id, name: p.name || "", description: p.description || "", image: p.image || "",
      order: String(p.order ?? ""), active: p.active !== false,
      variants: vs.length ? vs : [{ label: "", price: "" }],
    });
  };

  async function save(e) {
    e.preventDefault();
    const ok = await run(async () => {
      const name = form.name.trim();
      if (name.length < 1) throw new Error("Poné el nombre del producto");
      const variants = form.variants.map((v) => ({ label: v.label.trim(), price: Number(v.price) }));
      if (variants.some((v) => v.price === "" || !(v.price >= 0) || Number.isNaN(v.price)))
        throw new Error("Revisá los precios: tienen que ser números");
      if (variants.length > 1 && variants.some((v) => !v.label))
        throw new Error("Con más de un precio, poné el tamaño de cada uno (ej: Chico, Grande)");
      const id = form.id || newKey(P.shopProducts);
      await dbUpdate(`${P.shopProducts}/${id}`, {
        name,
        description: optional(form.description),
        image: form.image || null,
        variants,
        order: Number(form.order) || 0,
        active: form.active,
        deleted: false,
      });
    });
    if (ok) setForm(null);
  }

  async function remove(p) {
    if (!window.confirm(`¿Eliminar "${p.name}"? Los pedidos anteriores conservan su detalle.`)) return;
    await run(() => dbUpdate(`${P.shopProducts}/${p.id}`, { deleted: true, active: false }), "Producto eliminado");
  }

  if (form) {
    return (
      <form className="admin-card" onSubmit={save}>
        <h3>{form.id ? "Editar producto" : "Nuevo producto"}</h3>
        <ImageInput label="Foto" value={form.image} onChange={(v) => set("image", v)} aspect={1} maxSide={900} maxBytes={120000} />
        <Field label="Nombre"><input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <Field label="Descripción (opcional)">
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="field">
          <span>Precio</span>
          {form.variants.map((v, i) => (
            <div className="variant-row" key={i}>
              <input
                placeholder={form.variants.length > 1 ? "Tamaño (ej: Chico)" : "Detalle (opcional)"}
                value={v.label} onChange={(e) => setVariant(i, "label", e.target.value)}
              />
              <input
                type="number" min="0" inputMode="numeric" placeholder="$ Precio"
                value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)}
              />
              {form.variants.length > 1 && (
                <button type="button" className="btn ghost sm" aria-label="Quitar precio"
                  onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <div className="btn-row">
            <button type="button" className="btn ghost sm" disabled={form.variants.length >= 8}
              onClick={() => set("variants", [...form.variants, { label: "", price: "" }])}>
              + Otro tamaño / precio
            </button>
          </div>
          <small className="muted">Un solo precio, o varios si el producto viene en distintos tamaños.</small>
        </div>
        <Field label="Orden" hint="Número chico = aparece primero">
          <input type="number" inputMode="numeric" value={form.order} onChange={(e) => set("order", e.target.value)} />
        </Field>
        <Check checked={form.active} onChange={(v) => set("active", v)}>Visible para los clientes</Check>
        <Status st={st} />
        <div className="btn-row">
          <button className="btn" type="submit" disabled={st.busy}>{st.busy ? "Guardando…" : "Guardar"}</button>
          <button className="btn ghost" type="button" onClick={() => setForm(null)}>Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="admin-stack">
      <div className="toolbar">
        <h3>Productos</h3>
        <button type="button" className="btn sm" onClick={() => setForm(blank())}>+ Nuevo</button>
      </div>
      <Status st={st} />
      {list.length === 0 && <p className="muted">Todavía no cargaste productos.</p>}
      {list.map((p) => (
        <div className="admin-row" key={p.id}>
          <div className="prod-row">
            <div className="thumb">{p.image ? <Img src={p.image} alt="" /> : null}</div>
            <div>
              <b>{p.name}</b> {p.active === false && <span className="tag">oculto</span>}
              <p className="muted small">{priceLabel(p)}</p>
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn ghost sm" onClick={() => edit(p)}>Editar</button>
            <button type="button" className="btn ghost sm" onClick={() => remove(p)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
