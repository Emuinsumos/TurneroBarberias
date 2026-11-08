# Shop (catálogo con carrito y pedidos para retirar)

## Cómo funciona
- Está disponible para todas las barberías, sin plan ni configuración extra.
- El local lo prende en **Admin → Shop → "Mostrar el botón SHOP en la página"**.
- Carga productos en **Admin → Shop → Productos** (foto, nombre, descripción y uno o varios precios según tamaño).
- Los clientes entran por el botón **SHOP** de la página, arman el carrito, completan nombre y teléfono y reciben un **código de pedido** (6 caracteres).
- El pago NO pasa por la página: se coordina con el local al retirar.
- El local ve los pedidos en **Admin → Shop → Pedidos**: buscador por código o nombre, y estados *Nueva → Recibida / Entregada / Cancelada*.
- Mientras el interruptor esté apagado, el botón no aparece y las reglas rechazan pedidos nuevos.

## Fotos en Cloudinary (plan gratis, sin tarjeta)
- Las fotos nuevas (de todo el sistema, no solo del Shop) se suben a Cloudinary y se guarda solo la URL.
- Las fotos viejas (`m:ID`, guardadas en la base) se siguen viendo igual: no hace falta migrar nada.
- Si Cloudinary no está configurado o falla, la app guarda la foto como antes: nunca deja de funcionar.
- Configuración: `src/config/cloudinary.js` (variables `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`).

## Puesta en marcha
1. Cloudinary → Settings → Upload → Upload presets → crear uno con *Signing mode: Unsigned* y formatos solo de imagen.
2. Cargar el cloud name y el nombre del preset en `src/config/cloudinary.js`.
3. Realtime Database → **Reglas** → pegar `database.rules.json` → Publicar.
