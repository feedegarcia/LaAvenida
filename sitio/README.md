# Sitio La Avenida Pastas Frescas

Sitio estático (sin dependencias). Los datos viven en `data/`; `node build.mjs` genera `public/`.

- `data/sucursales.json`: faltan horarios de Ramos Mejía y Haedo, `pedidosya` y `whatsapp` (hoy esas dos sucursales muestran "Llamar").
  Correr `node build.mjs` después de editar.
- `data/catalogo.json`: ejemplo; reemplazar por el export del sistema.
- Deploy: `firebase deploy --only hosting` (configurar un sitio de Hosting propio en `.firebaserc`).
