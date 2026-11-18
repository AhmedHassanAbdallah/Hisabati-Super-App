// توليد أيقونات التطبيق من SVG — التشغيل: node tools/make-icons.js
const { chromium } = require('playwright');
const path = require('path');
const tiles = (s, pad) => {
  // شبكة بلاط 3×3 بمنظور بسيط: بلاطات بيضاء وبرتقالية على خلفية كحلي
  const c = s / 2, g = (s - pad * 2) / 3.4, gap = g * 0.12;
  let out = '';
  const colors = ['#ffffff', '#fb923c', '#ffffff', '#f97316', '#ffffff', '#fb923c', '#ffffff', '#ea580c', '#ffffff'];
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
    const x = c - 1.5 * g + q * g + gap / 2, y = c - 1.5 * g + r * g + gap / 2;
    out += `<rect x="${x}" y="${y}" width="${g - gap}" height="${g - gap}" rx="${g * 0.12}" fill="${colors[r * 3 + q]}"/>`;
  }
  return out;
};
const svg = (s, maskable) => {
  const pad = maskable ? s * 0.2 : s * 0.12;
  const rx = maskable ? 0 : s * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><radialGradient id="bg" cx="85%" cy="10%" r="120%"><stop offset="0" stop-color="#24508a"/><stop offset=".5" stop-color="#10284a"/><stop offset="1" stop-color="#071226"/></radialGradient></defs>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>
  <g transform="rotate(-8 ${s / 2} ${s / 2})">${tiles(s, pad)}</g>
</svg>`;
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size, mask] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-192', 192, true], ['icon-maskable-512', 512, true]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(size, mask)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'icons', name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  // أيقونات أندرويد: العادية والمستديرة والطبقة الأمامية للأيقونة المتكيفة
  const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const L = Math.round(48 * k), F = Math.round(108 * k);
    for (const [file, size, html] of [
      ['ic_launcher.png', L, svg(L, false)],
      ['ic_launcher_round.png', L, svg(L, true).replace('<rect width', `<clipPath id="c"><circle cx="${L / 2}" cy="${L / 2}" r="${L / 2}"/></clipPath><rect clip-path="url(#c)" width`)],
      ['ic_launcher_foreground.png', F, `<svg xmlns="http://www.w3.org/2000/svg" width="${F}" height="${F}"><g transform="rotate(-8 ${F / 2} ${F / 2})">${tiles(F, F * 0.27)}</g></svg>`]
    ]) {
      await p.setViewportSize({ width: size, height: size });
      await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
      await p.screenshot({ path: path.join(res, 'mipmap-' + d, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    }
  }
  await b.close();
  console.log('icons ok');
})();
