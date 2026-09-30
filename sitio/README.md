# Sitio La Avenida Pastas Frescas

Sitio estático (sin dependencias). Los datos viven en `data/`; `node build.mjs` genera `public/`.

- `data/sucursales.json`: completar Ramos Mejía y Haedo (calle, teléfono, whatsapp, horarios, pedidosya) y poner `"completa": true`.
  También faltan `pedidosya` y `geo` (lat/lng) de Ciudad Jardín para el JSON-LD.
- `data/catalogo.json`: ejemplo; reemplazar por el export del sistema.
- Deploy: `firebase deploy --only hosting` (configurar un sitio de Hosting propio en `.firebaserc`).
