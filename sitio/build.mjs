// Genera el sitio estático en public/ a partir de data/*.json. Sin dependencias: `node build.mjs`
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const { marca, sucursales } = JSON.parse(readFileSync('data/sucursales.json', 'utf8'));
const { categorias } = JSON.parse(readFileSync('data/catalogo.json', 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dest = sucursales.find(s => s.destacada);
const dir = s => [s.calle, s.localidad, s.provincia].filter(Boolean).join(', ');
const mapsLink = s => s.maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir(s))}`;
const digits = t => String(t).replace(/\D/g, '');
const tel = s => s.whatsapp ? `+${s.whatsapp}` : `+54${digits(s.telefono).replace(/^0/, '')}`;
const wa = (s, t) => `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(t || `Hola! Quiero hacer un pedido en La Avenida ${s.nombre}.`)}`;

const MASCOTA = `<svg class="mascota" viewBox="0 0 100 100" role="img" aria-label="Raviolín, la mascota de La Avenida"><path d="M12 22h76v66H12z" fill="#fff" stroke="#141414" stroke-width="3" stroke-linejoin="round"/><path d="M10 20l6-8 6 8 6-8 6 8 6-8 6 8 6-8 6 8 6-8 6 8 6-8 6 8" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round" transform="translate(0 4)"/><circle cx="36" cy="52" r="5" fill="#141414"/><circle cx="64" cy="52" r="5" fill="#141414"/><path d="M38 68q12 12 24 0" fill="none" stroke="#4E6838" stroke-width="4" stroke-linecap="round"/></svg>`;

const botones = (s, cls = '') => {
  if (!s.completa) return `<span class="tag gris">Datos próximamente</span>`;
  const b = [];
  if (s.whatsapp) b.push(`<a class="btn ${cls}" href="${wa(s)}" rel="noopener">Pedir por WhatsApp</a>`);
  else if (s.telefono) b.push(`<a class="btn ${cls}" href="tel:${tel(s)}">Llamar${s.telefonoLabel ? ' (' + esc(s.telefonoLabel.toLowerCase()) + ')' : ''}</a>`);
  if (s.pedidosya) b.push(`<a class="btn sec" href="${esc(s.pedidosya)}" rel="noopener">Pedir por PedidosYa</a>`);
  return b.join('');
};

const header = () => `
<header class="top"><div class="wrap bar">
  <a class="logo" href="/" aria-label="${esc(marca.nombre)} - Inicio"><img src="/img/logo.png" width="82" height="44" alt="La Avenida Pastas Frescas"></a>
  <nav class="main" aria-label="Principal">
    <a href="/#menu">Menú de pastas</a><a href="/#sucursales">Sucursales</a><a href="/#calidad">Calidad &amp; elaboración</a><a href="/#contacto">Contacto</a>
  </nav>
  <a class="btn" href="/#sucursales" data-pedir>Pedir online</a>
</div>
<nav class="mnav" aria-label="Secciones"><a href="/#menu">Menú</a><a href="/#sucursales">Sucursales</a><a href="/#calidad">Calidad</a><a href="/#contacto">Contacto</a></nav>
</header>`;

const dialogo = () => `
<dialog id="pedir" aria-label="Elegí tu sucursal"><div class="dlg">
  <button class="cerrar" aria-label="Cerrar">&times;</button>
  <h2>¿Dónde querés pedir?</h2><p class="lead">Elegí tu sucursal más cercana.</p>
  ${sucursales.map(s => `<div class="suc"><h3>${esc(s.nombre)}</h3><div class="btns">${botones(s)}${s.completa ? `<a class="btn sec" href="/${s.slug}/">Ver sucursal</a>` : ''}</div></div>`).join('')}
</div></dialog>`;

const footer = () => `
<footer id="contacto"><div class="wrap">
  <div class="grid c3">
    <div><h3>La Avenida Pastas Frescas</h3><p>Pastas artesanales de puro semolín de trigo candeal.</p>
      <p><a href="https://instagram.com/${marca.instagram}" rel="noopener">@${marca.instagram}</a></p></div>
    <div><h3>Sucursales</h3><ul>${sucursales.map(s => `<li><a href="/${s.slug}/">${esc(s.nombre)}</a>${s.telefono ? ` · ${esc(s.telefono)}` : ''}</li>`).join('')}</ul></div>
    <div><h3>Legales</h3><ul><li><a href="/terminos/">Términos y condiciones</a></li><li><a href="/privacidad/">Política de privacidad</a></li></ul></div>
  </div>
  <p class="copy">© ${new Date().getFullYear()} La Avenida Pastas Frescas. Todos los derechos reservados.</p>
</div></footer>
<div class="fab"><a class="btn" href="/#sucursales" data-pedir>Pedir online</a></div>
${dialogo()}
<script src="/app.js" defer></script>`;

const head = ({ title, desc, path, extra = '', noindex = false }) => `<!doctype html>
<html lang="es-AR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${marca.dominio}${path}">
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<meta name="theme-color" content="#4E6838">
<meta property="og:type" content="website"><meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${marca.dominio}${path}"><meta property="og:image" content="${marca.dominio}/img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap">
<link rel="stylesheet" href="/styles.css">
${extra}
</head><body>`;

function ld(s) {
  const specs = [];
  for (const h of s.horarios) {
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.schema.dias, opens: h.schema.abre, closes: h.schema.cierra });
    if (h.schema2) specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.schema.dias, opens: h.schema2.abre, closes: h.schema2.cierra });
  }
  const o = {
    '@context': 'https://schema.org', '@type': ['FoodEstablishment', 'Store'],
    name: `${marca.nombre} - ${s.nombre}`, url: `${marca.dominio}/${s.slug}/`, image: `${marca.dominio}/img/logo.png`,
    telephone: tel(s), servesCuisine: 'Pastas frescas artesanales',
    address: { '@type': 'PostalAddress', streetAddress: s.calle, ...(s.cp && { postalCode: s.cp }), addressLocality: s.localidad, addressRegion: s.provincia, addressCountry: 'AR' },
    ...(specs.length && { openingHoursSpecification: specs }), ...(s.instagram && { sameAs: [`https://instagram.com/${s.instagram}`] })
  };
  if (s.geo) o.geo = { '@type': 'GeoCoordinates', latitude: s.geo.lat, longitude: s.geo.lng };
  return `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
}

const catalogo = () => `
<section id="menu"><div class="wrap">
  <p class="kicker">Nuestro menú</p><h2>Pastas frescas, salsas y más</h2>
  <div class="filtros" role="group" aria-label="Filtrar por categoría">
    <button aria-pressed="true" data-cat="todo">Todo</button>
    ${categorias.map(c => `<button aria-pressed="false" data-cat="${esc(c.id)}">${esc(c.nombre)}</button>`).join('')}
  </div>
  <div class="grid c3">
    ${categorias.flatMap(c => c.productos.map(p => `<article class="prod" data-cat="${esc(c.id)}"><span class="cat">${esc(c.nombre)}</span><h3>${esc(p.nombre)}</h3>${p.descripcion ? `<small>${esc(p.descripcion)}</small>` : ''}</article>`)).join('\n    ')}
  </div>
</div></section>`;

const calidad = () => `
<section id="calidad" class="alt"><div class="wrap">
  <p class="kicker">Calidad &amp; elaboración</p><h2>Del rodillo a tu mesa</h2>
  <div class="grid c3">
    <div class="card"><h3>Puro semolín candeal</h3><p>Una masa firme que no se pasa y absorbe mejor la salsa.</p></div>
    <div class="card"><h3>Elaboración propia</h3><p>Hacemos nuestras pastas y rellenos, como siempre.</p></div>
    <div class="card"><h3>Del freezer al agua</h3><p>Las pastas congeladas en caja van directo a la olla: listas en minutos.</p></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Línea sin TACC</h3><p>Pastas, pizzas y empanadas sin TACC de Leofanti y Sintaxis, marcas certificadas. Las guardamos en un freezer aparte.</p></div>
</div></section>`;

const sucCard = s => `<div class="card ${s.destacada ? 'dest' : ''}">
  ${s.destacada ? '<span class="tag">Sucursal destacada</span>' : ''}
  <h3>${esc(s.nombre)}</h3>
  ${s.detalle ? `<p><b>${esc(s.detalle)}</b></p>` : ''}<p>${s.completa ? esc(dir(s)) : 'Próximamente más datos.'}</p>
  <div class="btns">${s.completa ? `<a class="btn sec" href="/${s.slug}/">Ver sucursal</a>` : botones(s)}</div></div>`;

// ---------- HOME ----------
function home() {
  return head({
    title: 'Pastas frescas artesanales | La Avenida Pastas Frescas', path: '/',
    desc: 'Pastas frescas artesanales de puro semolín de trigco candeal. Ravioles, sorrentinos, fideos al huevo, salsas y línea sin TACC. Sucursales en Ciudad Jardín, Ramos Mejía y Haedo.'.replace('trigco', 'trigo'),
    extra: ld(dest)
  }) + header() + `
<main>
<section class="hero"><div class="wrap">
  <p class="kicker">Fábrica de pastas · Zona oeste</p>
  <h1>Pastas frescas artesanales.<br>Del rodillo a tu mesa.</h1>
  <p class="lead">Elaboración propia con 100% puro semolín de trigo candeal. Variedades frescas, congeladas para hervir directo y opciones sin TACC.</p>
  <div class="sel"><label for="suc-sel">Encontrá tu sucursal más cercana</label>
    <div class="sel-row"><select id="suc-sel">${sucursales.map(s => `<option value="${s.slug}"${s.destacada ? ' selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
    <button class="btn" id="ir-suc" type="button">Ver sucursal</button></div></div>
  <div class="hero-foto" style="background-image:none" aria-hidden="true">${MASCOTA}</div>
</div></section>
<section id="sucursales" class="alt"><div class="wrap">
  <p class="kicker">Sucursales</p><h2>Encontranos</h2>
  <div class="grid c3">${[dest, ...sucursales.filter(s => s !== dest)].map(sucCard).join('')}</div>
</div></section>
${catalogo()}${calidad()}
</main>` + footer() + '</body></html>';
}

// ---------- SUCURSAL ----------
function sucPage(s) {
  const d = dir(s);
  return head({
    title: `Pastas frescas en ${s.nombre} | La Avenida Pastas Frescas`, path: `/${s.slug}/`, noindex: !s.completa,
    desc: s.completa
      ? `La Avenida Pastas Frescas en ${s.localidad}: ${s.calle}. Horarios, teléfono ${s.telefono} y pedidos por WhatsApp.`
      : `La Avenida Pastas Frescas en ${s.nombre}. Próximamente más datos.`,
    extra: s.completa ? ld(s) : ''
  }) + header() + `
<main><section><div class="wrap">
  <p class="kicker">Sucursal</p><h1 style="font-size:clamp(1.8rem,6vw,3rem)">${esc(s.nombre)}</h1>${s.detalle ? `<p class="kicker" style="margin-top:.6rem">${esc(s.detalle)}</p>` : ''}
  ${s.completa ? `
  <p class="lead">${esc(d)}</p>
  <div class="btns">${botones(s)}<a class="btn sec" href="${esc(mapsLink(s))}" rel="noopener">Cómo llegar (Google Maps)</a></div>
  <div class="grid c2" style="margin-top:28px">
    <div class="card"><h3>Horarios</h3>${s.horarios.length ? `<ul class="horarios">${s.horarios.map(h => `<li><b>${esc(h.dias)}</b><span>${esc(h.horas)}</span></li>`).join('')}</ul>` : '<p>Consultá los horarios por teléfono.</p>'}</div>
    <div class="card"><h3>Contacto</h3><p>${esc(s.telefonoLabel || 'Teléfono')}: <a href="tel:${tel(s)}">${esc(s.telefono)}</a></p>${s.instagram ? `<p>Instagram: <a href="https://instagram.com/${s.instagram}" rel="noopener">@${s.instagram}</a></p>` : ''}</div>
  </div>
  <iframe class="mapa" title="Mapa de ${esc(s.nombre)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(d)}&output=embed"></iframe>
  ` : `<p class="lead">Estamos preparando la página de esta sucursal.</p><div class="pend">Datos pendientes: dirección, teléfono/WhatsApp, horarios y link de PedidosYa.</div>`}
  <p style="margin-top:28px"><b>Otras sucursales:</b> ${sucursales.filter(x => x !== s).map(x => `<a href="/${x.slug}/">${esc(x.nombre)}</a>`).join(' · ')}</p>
</div></section>${catalogo()}</main>` + footer() + '</body></html>';
}

const simple = (t, p, txt) => head({ title: `${t} | La Avenida`, path: p, desc: t, noindex: true }) + header() + `<main><section><div class="wrap"><h1 style="font-size:2rem">${t}</h1><div class="pend">${txt}</div></div></section></main>` + footer() + '</body></html>';

const out = (p, html) => { mkdirSync('public' + p.replace(/[^/]*$/, ''), { recursive: true }); writeFileSync('public' + p, html); };
out('/index.html', home());
for (const s of sucursales) out(`/${s.slug}/index.html`, sucPage(s));
out('/terminos/index.html', simple('Términos y condiciones', '/terminos/', 'Texto legal pendiente de redactar.'));
out('/privacidad/index.html', simple('Política de privacidad', '/privacidad/', 'Texto legal pendiente de redactar.'));
out('/404.html', head({ title: 'Página no encontrada | La Avenida', path: '/404.html', desc: 'Página no encontrada', noindex: true }) + header() + `<main><section><div class="wrap" style="text-align:center">${MASCOTA}<h1 style="font-size:2rem">Uy, esta página se pasó de cocción</h1><div class="btns" style="justify-content:center"><a class="btn" href="/">Volver al inicio</a></div></div></section></main>` + footer() + '</body></html>');
const urls = ['/', ...sucursales.filter(s => s.completa).map(s => `/${s.slug}/`)];
out('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${marca.dominio}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
out('/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${marca.dominio}/sitemap.xml\n`);
console.log('OK:', urls.length, 'URLs indexables');
