# Shop (catálogo con carrito y pedidos para retirar)

## Cómo funciona
- Está disponible para todas las barberías, sin plan ni configuración extra.
- El local lo prende en **Admin → Shop → "Mostrar el botón SHOP en la página"**.
- Carga productos en **Admin → Shop → Productos** (foto, nombre, descripción y uno o varios precios según tamaño).
- Los clientes entran por el botón **SHOP** de la página, arman el carrito, completan nombre y teléfono y reciben un **código de pedido** (6 caracteres).
- El pago NO pasa por la página: se coordina con el local al retirar.
- El local ve los pedidos en **Admin → Shop → Pedidos**: buscador por código o nombre, y estados *Nueva → Recibida / Entregada / Cancelada*.
- Mientras el interruptor esté apagado, el botón no aparece y las reglas rechazan pedidos nuevos.

## Fotos en Firebase Storage
- Las fotos nuevas (de todo el sistema, no solo del Shop) se suben a Storage y se guarda solo la URL.
- Las fotos viejas (`m:ID`, guardadas en la base) se siguen viendo igual: no hace falta migrar nada.
- Si Storage no responde, la app guarda la foto como antes, así que nunca deja de funcionar.
- Bucket: por defecto `<projectId>.firebasestorage.app`. Si es otro, definí `VITE_FIREBASE_STORAGE_BUCKET`.

## Puesta en marcha (una sola vez por proyecto de Firebase)
1. Consola de Firebase → **Storage** → "Comenzar" (puede pedir el plan Blaze).
2. Storage → **Reglas** → pegar el contenido de `storage.rules` → Publicar.
3. Realtime Database → **Reglas** → pegar `database.rules.json` → Publicar.
