// TEMPORAL: botón para pasar las fotos viejas a Storage. Borrar este archivo y su uso en AdminPanel al terminar.
import { useEffect, useState } from "react";
import { Status } from "./ui";
import { findOldPhotos, migratePhotos, cleanOldPhotos } from "../../lib/migrateMedia";

export default function MigrateMedia() {
  const [pending, setPending] = useState(null);
  const [st, setSt] = useState({ busy: false, msg: "", err: false });
  const [prog, setProg] = useState("");

  const refresh = () =>
    findOldPhotos()
      .then((r) => setPending(new Set(r.map((x) => x.id)).size))
      .catch(() => setPending(null));
  useEffect(() => { refresh(); }, []);

  async function run(fn) {
    if (st.busy) return;
    setSt({ busy: true, msg: "", err: false });
    try {
      const msg = await fn();
      setSt({ busy: false, msg, err: false });
    } catch (e) {
      setSt({ busy: false, msg: e.message || "Algo salió mal", err: true });
    } finally {
      setProg("");
      refresh();
    }
  }

  const migrate = () => {
    if (!window.confirm("¿Pasar todas las fotos de esta barbería a Storage? Todavía no se borra nada.")) return;
    return run(async () => {
      const r = await migratePhotos((p) => setProg(`Pasando foto ${p.i} de ${p.total}…`));
      if (r.total === 0) return "No hay fotos viejas para pasar ✓";
      return `Listo: ${r.migrated.length} fotos pasadas a Storage ✓${r.missing ? ` (${r.missing} sin archivo, se omitieron)` : ""}. Revisá que la página se vea bien y después tocá "Limpiar fotos viejas".`;
    });
  };

  const clean = () => {
    if (!window.confirm("¿Borrar de la base las fotos que ya están en Storage? Hacelo después de revisar que todo se ve bien.")) return;
    return run(async () => `Listo: ${await cleanOldPhotos()} fotos viejas borradas de la base ✓`);
  };

  return (
    <div className="admin-card" style={{ marginTop: 14 }}>
      <h3>Pasar fotos a Storage</h3>
      <p className="muted small">
        Fotos viejas pendientes: <b>{pending ?? "…"}</b>. Esto es temporal: se usa una vez por barbería.
      </p>
      {prog && <p className="muted small">{prog}</p>}
      <Status st={st} />
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button type="button" className="btn" disabled={st.busy || pending === 0} onClick={migrate}>
          {st.busy ? "Trabajando…" : "Pasar fotos a Storage"}
        </button>
        <button type="button" className="btn ghost" disabled={st.busy} onClick={clean}>Limpiar fotos viejas</button>
      </div>
    </div>
  );
}
