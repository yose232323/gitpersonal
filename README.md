# Alma Latina

Primera vista pública con Next.js, TypeScript y Tailwind CSS. Incluye el logo original y contacto por WhatsApp. No incluye todavía catálogo importado, MongoDB, Cloudinary ni administración.

## Desarrollo

Desde este directorio, ejecuta `npm ci --cache /workspace/.npm-cache` y `npm run dev`.

## Verificación

`npm run build` y `npm run typecheck`. Para producción local: `npm run start`.

## Publicar en Vercel

Conecta tu cuenta de GitHub en https://vercel.com/new e importa `yose232323/gitpersonal`. Selecciona la rama con esta implementación. Directorio raíz: `./`; framework: Next.js; instalación: `npm ci`; compilación: `npm run build`. No requiere variables ni secretos para esta vista inicial. El despliegue genera una dirección HTTPS que puedes abrir desde el teléfono.

## Alcance

Las tarjetas son categorías de consulta, no productos con stock confirmado. Cada enlace abre una solicitud a +506 6389 9706; no confirma pedidos ni pagos. La fórmula de conversión está en `lib/pricing.ts`. Antes de vender se deben integrar productos reales, validación y gestión del inventario por talla y color.
