# Alma Latina

Primera vista pública con Next.js, TypeScript y Tailwind CSS. Incluye el logo original y contacto por WhatsApp. Incluye el catálogo de 687 productos verificados en la importación y las 20 categorías públicas. MongoDB, copia en Cloudinary y administración siguen pendientes.

## Desarrollo

Desde este directorio, ejecuta `npm ci --cache /workspace/.npm-cache` y `npm run dev`.

## Verificación

`npm run build` y `npm run typecheck`. Para producción local: `npm run start`.

## Publicar en Vercel

Conecta tu cuenta de GitHub en https://vercel.com/new e importa `yose232323/gitpersonal`. Selecciona la rama con esta implementación. Directorio raíz: `./`; framework: Next.js; instalación: `npm ci`; compilación: `npm run build`. No requiere variables ni secretos para esta vista inicial. El despliegue genera una dirección HTTPS que puedes abrir desde el teléfono.

## Alcance

Los productos conservan datos públicos del proveedor. Sus fotos siguen alojadas en el proveedor y no tienen respaldo independiente. Las variantes y disponibilidad son una instantánea y no constituyen stock propio. Cada enlace abre una solicitud a +506 6389 9706; no confirma pedidos ni pagos. La fórmula de conversión está en `lib/pricing.ts`. Antes de vender se deben integrar productos reales, validación y gestión del inventario por talla y color.

## Actualizar catálogo

`python3 scripts/import-catalog.py` pagina todas las categorías públicas y obtiene los detalles de cada producto. Comprueba conteos, duplicados y errores; si faltan datos, conserva el catálogo anterior. Los conteos y fecha se guardan en `data/catalog.json`. Requiere acceso a violetaangelboutique.ecometri.shop. Para descargar fotos se requiere d1b50uin55dq3m.cloudfront.net; para paginación completa, apiv2.ecometri.shop. El precio base se calcula en el servidor como `(COP / 3600 * 440 * 2) + 3500`, redondeado al colón. Los precios por variante usan la misma fórmula. Las condiciones mayoristas del proveedor se muestran separadas de las de Alma Latina. No hay sincronización automática ni cambios de stock.

## Copiar fotografías a Cloudinary

Requiere Node.js 24. Las claves se usan únicamente en el script local; nunca en componentes del navegador ni en Git. No ejecutes importaciones masivas como parte del build de Vercel.

En tu computadora, clona la rama `alma-latina-preview` y entra en el repositorio. Ejecuta `npm ci`. Si las claves ya están guardadas en Vercel, ejecuta `npx vercel link` y selecciona el proyecto existente `gitpersonal`. Luego ejecuta `npx vercel env pull .env.cloudinary --environment=preview --git-branch=alma-latina-preview`. Ese archivo está ignorado por Git. No publiques su contenido.

Prueba de una foto:

```sh
node --env-file=.env.cloudinary scripts/cloudinary-import.mjs --dry-run
node --env-file=.env.cloudinary scripts/cloudinary-import.mjs --limit 1
```

Verifica la foto en Cloudinary Media Library, carpeta/ruta `alma-latina/catalog`. El script verifica también la respuesta HTTPS antes de guardar su URL en `data/cloudinary-manifest.json`. Repite con `--limit 20` para copiar el siguiente lote, respetando tu plan de Cloudinary. No borra fotos existentes ni sobrescribe recursos. Puedes interrumpir y reanudar: el manifiesto conserva las copias ya verificadas.

Después, para sustituir enlaces de las copias verificadas:

```sh
node --env-file=.env.cloudinary scripts/cloudinary-import.mjs --limit 20 --apply
npm run build
npm run typecheck
git add data/catalog.json data/cloudinary-manifest.json
git commit -m "Use verified Cloudinary catalog photos"
git push origin alma-latina-preview
```

`--apply` vuelve a verificar todas las copias guardadas antes de cambiar el catálogo. Las fotos pendientes conservan el enlace del proveedor. El manifiesto contiene URLs e identificadores, nunca claves. El importador del catálogo conserva estos enlaces durante futuras actualizaciones. Las claves de Vercel no están automáticamente disponibles en el entorno de Codex. La subida real debe ejecutarse donde estén disponibles valores utilizables para la firma de Cloudinary.
