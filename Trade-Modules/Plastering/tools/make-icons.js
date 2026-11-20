// توليد أيقونات التطبيق من SVG (تشغيل: node tools/make-icons.js)
const { chromium } = require('playwright');
const path = require('path');
const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24508a"/><stop offset=".55" stop-color="#10284a"/><stop offset="1" stop-color="#071226"/></linearGradient>
<linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset=".5" stop-color="#f97316"/><stop offset="1" stop-color="#ea580c"/></linearGradient></defs>
<rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#g)"/>
<g transform="${maskable ? 'translate(256 256) scale(.78) translate(-256 -256)' : ''}">
<!-- حائط بطبقات (محارة / جرافيت) -->
<path d="M96 150h168v240H96z" fill="#e8eef8"/>
<path d="M96 150h168v40H96z" fill="#c9d6ea"/>
<g fill="#9fb3d1"><circle cx="122" cy="232" r="6"/><circle cx="160" cy="262" r="5"/><circle cx="206" cy="228" r="6"/><circle cx="236" cy="276" r="5"/><circle cx="132" cy="300" r="5"/><circle cx="190" cy="318" r="6"/><circle cx="240" cy="344" r="5"/><circle cx="120" cy="356" r="6"/><circle cx="170" cy="370" r="4"/></g>
<!-- المالج / البروة -->
<g transform="rotate(-18 330 300)">
<rect x="236" y="300" width="224" height="58" rx="14" fill="url(#o)"/>
<rect x="236" y="300" width="224" height="16" rx="8" fill="#fff" opacity=".35"/>
<path d="M318 300v-42a20 20 0 0 1 20-20h40a20 20 0 0 1 20 20v42" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round"/>
<rect x="334" y="178" width="30" height="74" rx="15" fill="#fff"/>
</g>
</g></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const out = path.join(__dirname, '..', 'icons');
  for (const [name, size, mask] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-maskable-192', 192, 1], ['icon-maskable-512', 512, 1]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(mask).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(out, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close();
  console.log('icons done');
})();
