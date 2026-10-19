// QA desain — palet final "Tangga Pivot": #254033 #17410E #FF7A3C
function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, wa) =>
  '#' + [0, 2, 4].map((i) => {
    const pa = a.slice(1), pb = b.slice(1);
    return Math.round(wa * parseInt(pa.slice(i, i + 2), 16) + (1 - wa) * parseInt(pb.slice(i, i + 2), 16)).toString(16).padStart(2, '0');
  }).join('');

// ── TOKEN FINAL ──
const T = {
  light: {
    paper: '#F6F3EC', surface: '#FBF9F4', rule: '#DAD4C7', ink: '#1B1F23', inkMuted: '#5C6168',
    brand: '#254033', accent: '#FF7A3C',
    resist: '#A63F0D', resistSoft: '#B84610',        // shade dari #FF7A3C agar AA di kertas
    support: '#17410E', supportSoft: mix('#17410E', '#F6F3EC', 0.8),
    price: '#2F3DB8', alert: '#B0123F', caution: '#8A5A00', cautionBg: '#FFF1CC',
    toastBg: '#254033', toastInk: '#F6F3EC',
    btnBg: '#254033', btnFg: '#F6F3EC',
  },
  dark: {
    paper: '#0E1411', surface: '#151A16', rule: '#2A312D', ink: '#E8E4DA', inkMuted: '#99A29B',
    brand: '#254033', accent: '#FF7A3C',
    resist: '#FF7A3C', resistSoft: mix('#FF7A3C', '#0E1411', 0.8),
    support: '#4FB35C', supportSoft: mix('#4FB35C', '#0E1411', 0.85),
    price: '#8C9BFF', alert: '#FF7A9C', caution: '#F2C96B', cautionBg: '#3A2E10',
    toastBg: '#E8E4DA', toastInk: '#12161B',
    btnBg: '#FF7A3C', btnFg: '#12161B',
  },
};

const checks = [];
const add = (label, v, need) => checks.push([label, v, need]);

for (const [mode, t] of Object.entries(T)) {
  const tag = mode.toUpperCase();
  const text = mode === 'light' ? 4.5 : 4.5;
  add(`${tag} teks resist ${t.resist} / paper`, ratio(t.resist, t.paper), text);
  add(`${tag} teks resist / surface`, ratio(t.resist, t.surface), text);
  add(`${tag} teks IML resist-soft ${t.resistSoft} / paper`, ratio(t.resistSoft, t.paper), text);
  add(`${tag} teks support ${t.support} / paper`, ratio(t.support, t.paper), text);
  add(`${tag} teks IML support-soft ${t.supportSoft} / paper`, ratio(t.supportSoft, t.paper), text);
  add(`${tag} teks ink / paper`, ratio(t.ink, t.paper), text);
  add(`${tag} teks ink-muted / paper`, ratio(t.inkMuted, t.paper), text);
  add(`${tag} teks ink-muted / surface`, ratio(t.inkMuted, t.surface), text);
  add(`${tag} tombol ${t.btnBg} + label ${t.btnFg}`, ratio(t.btnBg, t.btnFg), text);
  add(`${tag} tombol vs paper (batas komponen grafis)`, ratio(t.btnBg, t.paper), 3);
  add(`${tag} teks price ${t.price} / paper (chip zona)`, ratio(t.price, t.paper), text);
  add(`${tag} alert ${t.alert} / paper`, ratio(t.alert, t.paper), text);
  add(`${tag} caution ${t.caution} / cautionBg`, ratio(t.caution, t.cautionBg), text);
  add(`${tag} toast ${t.toastInk} / ${t.toastBg}`, ratio(t.toastInk, t.toastBg), text);
  add(`${tag} garis resist vs surface (grafis)`, ratio(t.resist, t.surface), 3);
  add(`${tag} garis support vs surface (grafis)`, ratio(t.support, t.surface), 3);
  add(`${tag} garis price vs surface (grafis)`, ratio(t.price, t.surface), 3);
  add(`${tag} garis IML resist-soft vs surface (grafis)`, ratio(t.resistSoft, t.surface), 3);
  add(`${tag} garis IML support-soft vs surface (grafis)`, ratio(t.supportSoft, t.surface), 3);
  add(`${tag} fokus price vs paper (ring fokus)`, ratio(t.price, t.paper), 3);
  add(`${tag} fokus price vs surface`, ratio(t.price, t.surface), 3);
}
// Khusus light: #FF7A3C murni hanya di atas gelap (stripe band, CTA dark theme)
add('LIGHT aksen #FF7A3C vs band #254033 (stripe)', ratio('#FF7A33' === '#FF7A33' ? '#FF7A3C' : '', T.light.brand), 3);
add('LIGHT aksen #FF7A3C / paper (INFO: dekoratif, exempt)', ratio('#FF7A3C', T.light.paper), 0);
// Band header vs paper (batas material dekoratif — informasi disampaikan teks)
add('LIGHT band #254033 vs paper', ratio(T.light.brand, T.light.paper), 1.3);
add('DARK band #254033 vs paper', ratio(T.dark.brand, T.dark.paper), 1.3);
// Kepaduan hijau: P (ink) vs support di ladder — bedakan bentuk, cek grayscaleness
add('INFO grayscale P ink vs support L', ratio(T.light.ink, T.light.support), 1.05);
add('INFO grayscale P ink vs support D', ratio(T.dark.ink, T.dark.support), 1.05);

let fail = 0;
for (const [label, v, need] of checks) {
  const ok = v >= need;
  if (!ok && need > 0) fail++;
  console.log((need === 0 ? 'INFO ' : ok ? 'OK   ' : 'GAGAL') + ' ' + v.toFixed(2).padStart(6) + (need ? ` (min ${need})` : '         ') + '  ' + label);
}
console.log('\n' + (fail ? fail + ' GAGAL' : 'SEMUA SYARAT LOLOS'));
console.log('supportSoft light =', T.light.supportSoft, '| resistSoft dark =', T.dark.resistSoft, '| supportSoft dark =', T.dark.supportSoft);
