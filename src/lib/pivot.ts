export type PivotMethod = 'classic' | 'fibonacci' | 'woodie' | 'camarilla' | 'demark';

export type Side = 'resist' | 'support' | 'pivot' | 'neutral';

export interface Level {
  name: string;
  price: number;
}

export interface IMLLevel extends Level {
  pairA: string;
  pairB: string;
  priceA: number;
  priceB: number;
  side: Side;
}

export interface MergedRow extends Level {
  type: 'main' | 'iml';
  side: Side;
  valid: boolean;
}

export interface PivotInput {
  high: number;
  low: number;
  close: number;
  open?: number;
}

export const METHOD_LABELS: Record<PivotMethod, string> = {
  classic: 'Classic',
  fibonacci: 'Fibonacci',
  woodie: 'Woodie',
  camarilla: 'Camarilla',
  demark: 'DeMark',
};

export const METHOD_HINTS: Record<PivotMethod, string> = {
  classic: '(H+L+C)/3',
  fibonacci: 'P ± 0,382 · 0,618 · 1,0 × range',
  woodie: '(H+L+2C)/4',
  camarilla: 'C ± range × 1,1/12 … 1,1/2',
  demark: 'bergantung Open dan Close',
};

export const METHODS: PivotMethod[] = ['classic', 'fibonacci', 'woodie', 'camarilla', 'demark'];

const ORDER: Record<PivotMethod, string[]> = {
  classic: ['R4', 'R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3', 'S4'],
  fibonacci: ['R4', 'R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3', 'S4'],
  woodie: ['R4', 'R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3', 'S4'],
  camarilla: ['R4', 'R3', 'R2', 'R1', 'S1', 'S2', 'S3', 'S4'],
  demark: ['R1', 'P', 'S1'],
};

export function levelOrder(method: PivotMethod): string[] {
  return ORDER[method];
}

export function sideOf(name: string): Side {
  if (name === 'P') return 'pivot';
  if (/^R\d+$/.test(name)) return 'resist';
  if (/^S\d+$/.test(name)) return 'support';
  return 'neutral';
}

/** Pivot level calculation. Returns levels in canonical order (descending price). */
export function calcPivot(method: PivotMethod, i: PivotInput): Level[] {
  const H = i.high;
  const L = i.low;
  const C = i.close;
  const R = H - L;
  const map: Record<string, number> = {};

  switch (method) {
    case 'classic': {
      const P = (H + L + C) / 3;
      map.P = P;
      map.R1 = 2 * P - L;
      map.S1 = 2 * P - H;
      map.R2 = P + R;
      map.S2 = P - R;
      map.R3 = H + 2 * (P - L);
      map.S3 = L - 2 * (H - P);
      map.R4 = H + 3 * (P - L);
      map.S4 = L - 3 * (H - P);
      break;
    }
    case 'fibonacci': {
      const P = (H + L + C) / 3;
      map.P = P;
      map.R1 = P + 0.382 * R;
      map.S1 = P - 0.382 * R;
      map.R2 = P + 0.618 * R;
      map.S2 = P - 0.618 * R;
      map.R3 = P + 1.0 * R;
      map.S3 = P - 1.0 * R;
      map.R4 = P + 1.272 * R;
      map.S4 = P - 1.272 * R;
      break;
    }
    case 'woodie': {
      const P = (H + L + 2 * C) / 4;
      map.P = P;
      map.R1 = 2 * P - L;
      map.S1 = 2 * P - H;
      map.R2 = P + R;
      map.S2 = P - R;
      map.R3 = H + 2 * (P - L);
      map.S3 = L - 2 * (H - P);
      map.R4 = H + 3 * (P - L);
      map.S4 = L - 3 * (H - P);
      break;
    }
    case 'camarilla': {
      map.R1 = C + (R * 1.1) / 12;
      map.S1 = C - (R * 1.1) / 12;
      map.R2 = C + (R * 1.1) / 6;
      map.S2 = C - (R * 1.1) / 6;
      map.R3 = C + (R * 1.1) / 4;
      map.S3 = C - (R * 1.1) / 4;
      map.R4 = C + (R * 1.1) / 2;
      map.S4 = C - (R * 1.1) / 2;
      break;
    }
    case 'demark': {
      const O = i.open ?? C;
      const X = C < O ? H + 2 * L + C : C > O ? 2 * H + L + C : H + L + 2 * C;
      map.P = X / 4;
      map.R1 = X / 2 - L;
      map.S1 = X / 2 - H;
      break;
    }
  }

  return ORDER[method].filter((n) => map[n] !== undefined).map((n) => ({ name: n, price: map[n] }));
}

function rank(name: string): number {
  if (name === 'P') return 0;
  const m = /^([RS])(\d+)$/.exec(name);
  if (!m) return 0;
  return m[1] === 'R' ? -Number(m[2]) : Number(m[2]);
}

/** Name a pair outward from the pivot: P–R1, R1–R2, P–S1, S1–S2, R1–S1. */
function pivotOrderedPair(a: string, b: string): [string, string] {
  const ka = Math.abs(rank(a));
  const kb = Math.abs(rank(b));
  if (ka !== kb) return ka < kb ? [a, b] : [b, a];
  return rank(a) <= rank(b) ? [a, b] : [b, a];
}

function imlSide(a: string, b: string): Side {
  const sa = sideOf(a);
  const sb = sideOf(b);
  if (sa === 'pivot') return sb;
  if (sb === 'pivot') return sa;
  if (sa === sb) return sa;
  return 'neutral';
}

/** IML between adjacent levels. Levels must be canonical; reorders are detected and fixed. */
export function calcIML(levels: Level[]): { items: IMLLevel[]; reordered: boolean } {
  let list = [...levels];
  let reordered = false;
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].price < list[i + 1].price) {
      reordered = true;
      break;
    }
  }
  if (reordered) list.sort((a, b) => b.price - a.price);

  const items: IMLLevel[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (!(a.price > 0) || !(b.price > 0)) continue; // skip invalid (price <= 0)
    const [f, s] = pivotOrderedPair(a.name, b.name);
    const nameA = f === a.name ? a : b;
    const nameB = f === a.name ? b : a;
    items.push({
      name: `IML ${f}\u2013${s}`,
      price: (a.price + b.price) / 2,
      pairA: f,
      pairB: s,
      priceA: nameA.price,
      priceB: nameB.price,
      side: imlSide(a.name, b.name),
    });
  }
  return { items, reordered };
}

/** Merge main levels and IML into one descending table. */
export function mergeLevels(levels: Level[], iml: Array<Level & { side?: Side }>): MergedRow[] {
  const rows: MergedRow[] = [
    ...levels.map((l) => ({ ...l, type: 'main' as const, side: sideOf(l.name), valid: l.price > 0 })),
    // IML dari calcIML() sudah membawa side hasil imlSide(); jangan ditimpa sideOf(nama)
    // yang hanya mengenali "R1"/"S2" murni dan akan menjatuhkan IML ke 'neutral'.
    // Fallback sideOf() hanya untuk pemanggil yang mengirim IML polos tanpa side.
    ...iml.map((l) => ({ ...l, type: 'iml' as const, side: l.side ?? sideOf(l.name), valid: l.price > 0 })),
  ];
  rows.sort((a, b) => b.price - a.price);
  return rows;
}

export interface Zone {
  above: MergedRow | null;
  below: MergedRow | null;
  exact: MergedRow | null;
}

/** Nearest valid level above and below the given price. */
export function findZone(rows: MergedRow[], price: number): Zone {
  const valid = rows.filter((r) => r.valid);
  const eps = 1e-9 * Math.max(1, Math.abs(price));
  const exact = valid.find((r) => Math.abs(r.price - price) <= eps) ?? null;
  let above: MergedRow | null = null;
  let below: MergedRow | null = null;
  for (const r of valid) {
    if (r.price > price && (above === null || r.price < above.price)) above = r;
    if (r.price < price && (below === null || r.price > below.price)) below = r;
  }
  return { above, below, exact };
}

export type Bias = 'Bullish' | 'Bearish' | 'Netral';

export function pivotBias(price: number, pivotPrice: number | null): Bias {
  if (pivotPrice === null) return 'Netral';
  if (price > pivotPrice) return 'Bullish';
  if (price < pivotPrice) return 'Bearish';
  return 'Netral';
}

/* ---------------- Validation ---------------- */

export interface FieldErrors {
  high?: string;
  low?: string;
  close?: string;
  open?: string;
  currentPrice?: string;
  decimals?: string;
}

export interface RawInput {
  high: string;
  low: string;
  close: string;
  open: string;
  currentPrice: string;
}

export interface ParseResult {
  errors: FieldErrors;
  ok: boolean;
  values: { high: number; low: number; close: number; open?: number; currentPrice?: number };
}

const FIELD_LABEL: Record<string, string> = {
  high: 'High',
  low: 'Low',
  close: 'Close',
  open: 'Open',
  currentPrice: 'Harga saat ini',
};

function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '');
  if (t === '') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function validateInput(raw: RawInput, method: PivotMethod, decimals: number): ParseResult {
  const errors: FieldErrors = {};
  const values: ParseResult['values'] = { high: 0, low: 0, close: 0 };

  const need = (key: keyof RawInput): number | null => {
    const v = parseNum(raw[key]);
    if (v === null) {
      errors[key] = `${FIELD_LABEL[key]} harus angka`;
      return null;
    }
    if (!(v > 0)) {
      errors[key] = `${FIELD_LABEL[key]} harus lebih dari 0`;
      return null;
    }
    return v;
  };

  const high = need('high');
  const low = need('low');
  const close = need('close');

  let open: number | undefined;
  if (method === 'demark') {
    const v = parseNum(raw.open);
    if (v === null || !(v > 0)) {
      errors.open = v === null ? 'Open harus angka' : 'Open harus lebih dari 0';
    } else {
      open = v;
    }
  }

  if (high !== null && low !== null && high < low) {
    errors.high = 'High harus lebih besar atau sama dengan Low';
  }
  if (high !== null && low !== null && close !== null) {
    if (close < low || close > high) {
      errors.close = 'Close harus berada di antara Low dan High';
    }
  }
  if (method === 'demark' && open !== undefined && high !== null && low !== null) {
    if (open < low || open > high) {
      errors.open = 'Open harus berada di antara Low dan High';
    }
  }

  let currentPrice: number | undefined;
  if (raw.currentPrice.trim() !== '') {
    const v = parseNum(raw.currentPrice);
    if (v === null || !(v > 0)) {
      errors.currentPrice = v === null ? 'Harga saat ini harus angka' : 'Harga saat ini harus lebih dari 0';
    } else {
      currentPrice = v;
    }
  }

  if (!Number.isInteger(decimals) || decimals < 2 || decimals > 6) {
    errors.decimals = 'Jumlah desimal tidak valid';
  }

  if (high !== null) values.high = high;
  if (low !== null) values.low = low;
  if (close !== null) values.close = close;
  if (open !== undefined) values.open = open;
  if (currentPrice !== undefined) values.currentPrice = currentPrice;

  return { errors, ok: Object.keys(errors).length === 0, values };
}

/* ---------------- Formatting ---------------- */

export function fmt(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPips(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* ---------------- Step-by-step formulas ---------------- */

export interface Step {
  label: string;
  formula: string;
  result: string;
}

export function buildPivotSteps(method: PivotMethod, i: PivotInput, d: number): Step[] {
  const H = i.high;
  const L = i.low;
  const C = i.close;
  const O = i.open ?? C;
  const R = H - L;
  const f = (v: number) => fmt(v, d);
  const steps: Step[] = [];

  switch (method) {
    case 'classic': {
      const P = (H + L + C) / 3;
      steps.push({ label: 'P', formula: `P = (${f(H)} + ${f(L)} + ${f(C)}) / 3`, result: f(P) });
      steps.push({ label: 'R1', formula: `R1 = 2P − L = 2 × ${f(P)} − ${f(L)}`, result: f(2 * P - L) });
      steps.push({ label: 'S1', formula: `S1 = 2P − H = 2 × ${f(P)} − ${f(H)}`, result: f(2 * P - H) });
      steps.push({ label: 'R2', formula: `R2 = P + range = ${f(P)} + ${f(R)}`, result: f(P + R) });
      steps.push({ label: 'S2', formula: `S2 = P − range = ${f(P)} − ${f(R)}`, result: f(P - R) });
      steps.push({ label: 'R3', formula: `R3 = H + 2(P − L) = ${f(H)} + 2 × (${f(P)} − ${f(L)})`, result: f(H + 2 * (P - L)) });
      steps.push({ label: 'S3', formula: `S3 = L − 2(H − P) = ${f(L)} − 2 × (${f(H)} − ${f(P)})`, result: f(L - 2 * (H - P)) });
      steps.push({ label: 'R4', formula: `R4 = H + 3(P − L) = ${f(H)} + 3 × (${f(P)} − ${f(L)})`, result: f(H + 3 * (P - L)) });
      steps.push({ label: 'S4', formula: `S4 = L − 3(H − P) = ${f(L)} − 3 × (${f(H)} − ${f(P)})`, result: f(L - 3 * (H - P)) });
      break;
    }
    case 'fibonacci': {
      const P = (H + L + C) / 3;
      steps.push({ label: 'P', formula: `P = (${f(H)} + ${f(L)} + ${f(C)}) / 3`, result: f(P) });
      steps.push({ label: 'R1', formula: `R1 = P + 0,382 × range = ${f(P)} + 0,382 × ${f(R)}`, result: f(P + 0.382 * R) });
      steps.push({ label: 'S1', formula: `S1 = P − 0,382 × range = ${f(P)} − 0,382 × ${f(R)}`, result: f(P - 0.382 * R) });
      steps.push({ label: 'R2', formula: `R2 = P + 0,618 × range = ${f(P)} + 0,618 × ${f(R)}`, result: f(P + 0.618 * R) });
      steps.push({ label: 'S2', formula: `S2 = P − 0,618 × range = ${f(P)} − 0,618 × ${f(R)}`, result: f(P - 0.618 * R) });
      steps.push({ label: 'R3', formula: `R3 = P + 1,000 × range = ${f(P)} + ${f(R)}`, result: f(P + R) });
      steps.push({ label: 'S3', formula: `S3 = P − 1,000 × range = ${f(P)} − ${f(R)}`, result: f(P - R) });
      steps.push({ label: 'R4', formula: `R4 = P + 1,272 × range = ${f(P)} + 1,272 × ${f(R)}`, result: f(P + 1.272 * R) });
      steps.push({ label: 'S4', formula: `S4 = P − 1,272 × range = ${f(P)} − 1,272 × ${f(R)}`, result: f(P - 1.272 * R) });
      break;
    }
    case 'woodie': {
      const P = (H + L + 2 * C) / 4;
      steps.push({ label: 'P', formula: `P = (${f(H)} + ${f(L)} + 2 × ${f(C)}) / 4`, result: f(P) });
      steps.push({ label: 'R1', formula: `R1 = 2P − L = 2 × ${f(P)} − ${f(L)}`, result: f(2 * P - L) });
      steps.push({ label: 'S1', formula: `S1 = 2P − H = 2 × ${f(P)} − ${f(H)}`, result: f(2 * P - H) });
      steps.push({ label: 'R2', formula: `R2 = P + range = ${f(P)} + ${f(R)}`, result: f(P + R) });
      steps.push({ label: 'S2', formula: `S2 = P − range = ${f(P)} − ${f(R)}`, result: f(P - R) });
      steps.push({ label: 'R3', formula: `R3 = H + 2(P − L) = ${f(H)} + 2 × (${f(P)} − ${f(L)})`, result: f(H + 2 * (P - L)) });
      steps.push({ label: 'S3', formula: `S3 = L − 2(H − P) = ${f(L)} − 2 × (${f(H)} − ${f(P)})`, result: f(L - 2 * (H - P)) });
      steps.push({ label: 'R4', formula: `R4 = H + 3(P − L) = ${f(H)} + 3 × (${f(P)} − ${f(L)})`, result: f(H + 3 * (P - L)) });
      steps.push({ label: 'S4', formula: `S4 = L − 3(H − P) = ${f(L)} − 3 × (${f(H)} − ${f(P)})`, result: f(L - 3 * (H - P)) });
      break;
    }
    case 'camarilla': {
      const map: Record<string, number> = {
        R1: C + (R * 1.1) / 12,
        R2: C + (R * 1.1) / 6,
        R3: C + (R * 1.1) / 4,
        R4: C + (R * 1.1) / 2,
        S1: C - (R * 1.1) / 12,
        S2: C - (R * 1.1) / 6,
        S3: C - (R * 1.1) / 4,
        S4: C - (R * 1.1) / 2,
      };
      const div: Record<string, string> = { R1: '12', R2: '6', R3: '4', R4: '2', S1: '12', S2: '6', S3: '4', S4: '2' };
      for (const name of ['R1', 'S1', 'R2', 'S2', 'R3', 'S3', 'R4', 'S4']) {
        const sign = name[0] === 'R' ? '+' : '−';
        steps.push({
          label: name,
          formula: `${name} = C ${sign} range × 1,1/${div[name]} = ${f(C)} ${sign} ${f(R)} × 1,1/${div[name]}`,
          result: f(map[name]),
        });
      }
      break;
    }
    case 'demark': {
      const X = C < O ? H + 2 * L + C : C > O ? 2 * H + L + C : H + L + 2 * C;
      const cond = C < O ? 'C < O' : C > O ? 'C > O' : 'C = O';
      const expr = C < O ? `H + 2L + C = ${f(H)} + 2 × ${f(L)} + ${f(C)}` : C > O ? `2H + L + C = 2 × ${f(H)} + ${f(L)} + ${f(C)}` : `H + L + 2C = ${f(H)} + ${f(L)} + 2 × ${f(C)}`;
      steps.push({ label: `X (${cond})`, formula: `X = ${expr}`, result: f(X) });
      steps.push({ label: 'P', formula: `P = X / 4`, result: f(X / 4) });
      steps.push({ label: 'R1', formula: `R1 = X/2 − L = ${f(X / 2)} − ${f(L)}`, result: f(X / 2 - L) });
      steps.push({ label: 'S1', formula: `S1 = X/2 − H = ${f(X / 2)} − ${f(H)}`, result: f(X / 2 - H) });
      break;
    }
  }
  return steps;
}

export function buildIMLSteps(items: IMLLevel[], d: number): Step[] {
  const f = (v: number) => fmt(v, d);
  return items.map((it) => ({
    label: it.name,
    formula: `${it.name} = (${f(it.priceA)} + ${f(it.priceB)}) / 2`,
    result: f(it.price),
  }));
}
