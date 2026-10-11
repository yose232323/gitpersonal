# Alma Latina

Primera vista pública con Next.js, TypeScript y Tailwind CSS. Incluye el logo original y contacto por WhatsApp. Incluye una importación parcial de 200 de 687 productos y las 20 categorías públicas. MongoDB, copia en Cloudinary y administración siguen pendientes.

## Desarrollo

Desde este directorio, ejecuta `npm ci --cache /workspace/.npm-cache` y `npm run dev`.

## Verificación

`npm run build` y `npm run typecheck`. Para producción local: `npm run start`.

## Publicar en Vercel

Conecta tu cuenta de GitHub en https://vercel.com/new e importa `yose232323/gitpersonal`. Selecciona la rama con esta implementación. Directorio raíz: `./`; framework: Next.js; instalación: `npm ci`; compilación: `npm run build`. No requiere variables ni secretos para esta vista inicial. El despliegue genera una dirección HTTPS que puedes abrir desde el teléfono.

## Alcance

Los productos conservan datos públicos del proveedor. Sus fotos siguen alojadas en el proveedor y no tienen respaldo independiente. Las variantes y disponibilidad son una instantánea y no constituyen stock propio. Cada enlace abre una solicitud a +506 6389 9706; no confirma pedidos ni pagos. La fórmula de conversión está en `lib/pricing.ts`. Antes de vender se deben integrar productos reales, validación y gestión del inventario por talla y color.

## Actualizar catálogo

`python3 scripts/import-catalog.py` importa la primera página de cada categoría pública y detalles de sus productos. No importa el catálogo completo; los conteos y fecha se guardan en `data/catalog.json`. Requiere acceso a violetaangelboutique.ecometri.shop. Para descargar fotos se requiere d1b50uin55dq3m.cloudfront.net; para paginación completa, apiv2.ecometri.shop. El precio base se calcula en el servidor como `(COP / 3600 * 440 * 2) + 3500`, redondeado al colón. Los precios por variante usan la misma fórmula. Las condiciones mayoristas del proveedor se muestran separadas de las de Alma Latina. No hay sincronización automática ni cambios de stock.
