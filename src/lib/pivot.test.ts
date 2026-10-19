import { describe, expect, it } from 'vitest';
import {
  buildIMLSteps,
  buildPivotSteps,
  calcIML,
  calcPivot,
  findZone,
  fmt,
  mergeLevels,
  pivotBias,
  validateInput,
  type Level,
  type MergedRow,
} from './pivot';

const T = { high: 1.105, low: 1.095, close: 1.1 };
const TOL = 1e-9;

const byName = (levels: Level[], name: string) => {
  const l = levels.find((x) => x.name === name);
  if (!l) throw new Error(`level ${name} tidak ada`);
  return l.price;
};

describe('12.1 Pivot — H=1,1050 L=1,0950 C=1,1000', () => {
  it('Classic', () => {
    const lv = calcPivot('classic', T);
    expect(byName(lv, 'P')).toBeCloseTo(1.1, 9);
    expect(byName(lv, 'R1')).toBeCloseTo(1.105, 9);
    expect(byName(lv, 'R2')).toBeCloseTo(1.11, 9);
    expect(byName(lv, 'R3')).toBeCloseTo(1.115, 9);
    expect(byName(lv, 'S1')).toBeCloseTo(1.095, 9);
    expect(byName(lv, 'S2')).toBeCloseTo(1.09, 9);
    expect(byName(lv, 'S3')).toBeCloseTo(1.085, 9);
  });

  it('Fibonacci', () => {
    const lv = calcPivot('fibonacci', T);
    expect(byName(lv, 'P')).toBeCloseTo(1.1, 9);
    expect(byName(lv, 'R1')).toBeCloseTo(1.10382, 9);
    expect(byName(lv, 'R2')).toBeCloseTo(1.10618, 9);
    expect(byName(lv, 'R3')).toBeCloseTo(1.11, 9);
    expect(byName(lv, 'S1')).toBeCloseTo(1.09618, 9);
    expect(byName(lv, 'S2')).toBeCloseTo(1.09382, 9);
    expect(byName(lv, 'S3')).toBeCloseTo(1.09, 9);
  });

  it('Camarilla', () => {
    // Nilai acuan PRD dibulatkan sampai 6 desimal → toleransi 5e-7.
    const lv = calcPivot('camarilla', T);
    expect(byName(lv, 'R1')).toBeCloseTo(1.100917, 6);
    expect(byName(lv, 'R2')).toBeCloseTo(1.101833, 6);
    expect(byName(lv, 'R3')).toBeCloseTo(1.10275, 9);
    expect(byName(lv, 'R4')).toBeCloseTo(1.1055, 9);
    expect(byName(lv, 'S1')).toBeCloseTo(1.099083, 6);
    expect(byName(lv, 'S2')).toBeCloseTo(1.098167, 6);
    expect(byName(lv, 'S3')).toBeCloseTo(1.09725, 9);
    expect(byName(lv, 'S4')).toBeCloseTo(1.0945, 9);
    expect(lv.some((l) => l.name === 'P')).toBe(false);
  });

  it('DeMark (O=1,0980, C > O)', () => {
    const lv = calcPivot('demark', { ...T, open: 1.098 });
    expect(byName(lv, 'P')).toBeCloseTo(1.10125, 9);
    expect(byName(lv, 'R1')).toBeCloseTo(1.1075, 9);
    expect(byName(lv, 'S1')).toBeCloseTo(1.0975, 9);
  });
});

describe('12.2 IML Classic dan Fibonacci', () => {
  const check = (method: 'classic' | 'fibonacci', name: string, expected: number) => {
    const { items } = calcIML(calcPivot(method, T));
    const it = items.find((x) => x.name === name);
    expect(it, `${method} ${name}`).toBeDefined();
    expect(it!.price).toBeCloseTo(expected, 9);
  };

  it('Classic 8 IML (termasuk R4/S4)', () => {
    const { items } = calcIML(calcPivot('classic', T));
    expect(items).toHaveLength(8);
    check('classic', 'IML R3\u2013R4', 1.1175);
    check('classic', 'IML R2\u2013R3', 1.1125);
    check('classic', 'IML R1\u2013R2', 1.1075);
    check('classic', 'IML P\u2013R1', 1.1025);
    check('classic', 'IML P\u2013S1', 1.0975);
    check('classic', 'IML S1\u2013S2', 1.0925);
    check('classic', 'IML S2\u2013S3', 1.0875);
    check('classic', 'IML S3\u2013S4', 1.0825);
  });

  it('Fibonacci 8 IML (termasuk R4/S4 = 1,272 × range)', () => {
    const { items } = calcIML(calcPivot('fibonacci', T));
    expect(items).toHaveLength(8);
    check('fibonacci', 'IML R3\u2013R4', 1.11136);
    check('fibonacci', 'IML R2\u2013R3', 1.10809);
    check('fibonacci', 'IML R1\u2013R2', 1.105);
    check('fibonacci', 'IML P\u2013R1', 1.10191);
    check('fibonacci', 'IML P\u2013S1', 1.09809);
    check('fibonacci', 'IML S1\u2013S2', 1.095);
    check('fibonacci', 'IML S2\u2013S3', 1.09191);
    check('fibonacci', 'IML S3\u2013S4', 1.08864);
  });
});

describe('12.3 IML Woodie, Camarilla, DeMark', () => {
  const find = (method: Parameters<typeof calcPivot>[0], input: Parameters<typeof calcPivot>[1], name: string) => {
    const { items } = calcIML(calcPivot(method, input));
    const it = items.find((x) => x.name === name);
    expect(it, name).toBeDefined();
    return it!.price;
  };

  it('Woodie 8 IML (R3/S3 dan R4/S4 tambahan)', () => {
    const { items } = calcIML(calcPivot('woodie', T));
    expect(items).toHaveLength(8);
    expect(find('woodie', T, 'IML R3\u2013R4')).toBeCloseTo(1.1175, 9);
    expect(find('woodie', T, 'IML R2\u2013R3')).toBeCloseTo(1.1125, 9);
    expect(find('woodie', T, 'IML R1\u2013R2')).toBeCloseTo(1.1075, 9);
    expect(find('woodie', T, 'IML P\u2013R1')).toBeCloseTo(1.1025, 9);
    expect(find('woodie', T, 'IML P\u2013S1')).toBeCloseTo(1.0975, 9);
    expect(find('woodie', T, 'IML S1\u2013S2')).toBeCloseTo(1.0925, 9);
    expect(find('woodie', T, 'IML S2\u2013S3')).toBeCloseTo(1.0875, 9);
    expect(find('woodie', T, 'IML S3\u2013S4')).toBeCloseTo(1.0825, 9);
  });

  it('Camarilla 7 IML, termasuk R1–S1 = Close', () => {
    const { items } = calcIML(calcPivot('camarilla', T));
    expect(items).toHaveLength(7);
    expect(find('camarilla', T, 'IML R3\u2013R4')).toBeCloseTo(1.104125, 9);
    expect(find('camarilla', T, 'IML R2\u2013R3')).toBeCloseTo(1.102292, 6);
    expect(find('camarilla', T, 'IML R1\u2013R2')).toBeCloseTo(1.101375, 9);
    expect(find('camarilla', T, 'IML R1\u2013S1')).toBeCloseTo(1.1, 9);
    expect(find('camarilla', T, 'IML S1\u2013S2')).toBeCloseTo(1.098625, 9);
    expect(find('camarilla', T, 'IML S2\u2013S3')).toBeCloseTo(1.097708, 6);
    expect(find('camarilla', T, 'IML S3\u2013S4')).toBeCloseTo(1.095875, 9);
  });

  it('DeMark 2 IML', () => {
    const input = { ...T, open: 1.098 };
    const { items } = calcIML(calcPivot('demark', input));
    expect(items).toHaveLength(2);
    expect(find('demark', input, 'IML P\u2013R1')).toBeCloseTo(1.104375, 9);
    expect(find('demark', input, 'IML P\u2013S1')).toBeCloseTo(1.099375, 9);
  });
});

describe('FR-M3 jumlah IML per metode (dengan R4/S4)', () => {
  it.each([
    ['classic', 8],
    ['fibonacci', 8],
    ['woodie', 8],
    ['camarilla', 7],
    ['demark', 2],
  ] as const)('%s = %i IML', (method, count) => {
    const input = method === 'demark' ? { ...T, open: 1.098 } : T;
    expect(calcIML(calcPivot(method, input)).items).toHaveLength(count);
  });
});

describe('R4/S4 per metode', () => {
  it('Classic: R4 = H + 3(P−L), S4 = L − 3(H−P)', () => {
    const lv = calcPivot('classic', T);
    expect(byName(lv, 'R4')).toBeCloseTo(1.12, 9);
    expect(byName(lv, 'S4')).toBeCloseTo(1.08, 9);
  });

  it('Fibonacci: R4/S4 = P ± 1,272 × range', () => {
    const lv = calcPivot('fibonacci', T);
    expect(byName(lv, 'R4')).toBeCloseTo(1.11272, 9);
    expect(byName(lv, 'S4')).toBeCloseTo(1.08728, 9);
  });

  it('Woodie: R3/R4 mengikuti pola Classic dengan P Woodie', () => {
    const lv = calcPivot('woodie', T); // P Woodie = 1,1000 (sama dengan Classic pada test case ini)
    expect(byName(lv, 'R3')).toBeCloseTo(1.115, 9);
    expect(byName(lv, 'R4')).toBeCloseTo(1.12, 9);
    expect(byName(lv, 'S4')).toBeCloseTo(1.08, 9);
  });

  it('Camarilla dan DeMark tidak berubah', () => {
    expect(byName(calcPivot('camarilla', T), 'R4')).toBeCloseTo(1.1055, 9);
    expect(byName(calcPivot('camarilla', T), 'S4')).toBeCloseTo(1.0945, 9);
    const dm = calcPivot('demark', { ...T, open: 1.098 });
    expect(dm.some((l) => l.name === 'R4' || l.name === 'S4')).toBe(false);
  });
});

describe('FR-M4 tabel gabungan terurut menurun', () => {
  it('Classic: 9 utama + 8 IML = 17 baris menurun', () => {
    const levels = calcPivot('classic', T);
    const { items } = calcIML(levels);
    const merged = mergeLevels(levels, items);
    expect(merged).toHaveLength(17);
    for (let i = 0; i < merged.length - 1; i++) {
      expect(merged[i].price).toBeGreaterThanOrEqual(merged[i + 1].price);
    }
    expect(merged[0].type).toBe('main');
    expect(merged.some((r) => r.type === 'iml')).toBe(true);
  });

  it('IML mewarisi sisi pasangannya, bukan jatuh ke neutral', () => {
    const levels = calcPivot('classic', T);
    const merged = mergeLevels(levels, calcIML(levels).items);
    const byName = new Map(merged.map((r) => [r.name, r]));
    // IML antara dua level resist = resist; antara dua support = support.
    expect(byName.get('IML R3–R4')?.side).toBe('resist');
    expect(byName.get('IML S3–S4')?.side).toBe('support');
    // IML yang menyentuh P tetap mengikuti sisi non-pivotnya.
    expect(byName.get('IML P–R1')?.side).toBe('resist');
    expect(byName.get('IML P–S1')?.side).toBe('support');
    // Tidak ada IML yang berwarna netral (warna sisi diperlukan tangga & tabel).
    for (const r of merged.filter((x) => x.type === 'iml')) {
      expect(r.side).not.toBe('neutral');
    }
  });
});

describe('FR-Z zona harga', () => {
  const merged: MergedRow[] = mergeLevels(calcPivot('classic', T), calcIML(calcPivot('classic', T)).items);

  it('harga di antara dua level', () => {
    const z = findZone(merged, 1.106);
    expect(z.exact).toBeNull();
    expect(z.above!.name).toBe('IML R1\u2013R2');
    expect(z.below!.name).toBe('R1');
  });

  it('harga tepat di level', () => {
    const z = findZone(merged, 1.105);
    expect(z.exact!.name).toBe('R1');
  });

  it('harga di bawah semua level → semua level di atasnya', () => {
    const z = findZone(merged, 1.0);
    expect(z.above!.name).toBe('S4');
    expect(z.below).toBeNull();
    expect(z.exact).toBeNull();
  });

  it('bias terhadap pivot', () => {
    expect(pivotBias(1.106, 1.1)).toBe('Bullish');
    expect(pivotBias(1.09, 1.1)).toBe('Bearish');
    expect(pivotBias(1.1, 1.1)).toBe('Netral');
  });
});

describe('Bagian 7 validasi', () => {
  const base = { high: '1,1050', low: '1,0950', close: '1,1000', open: '', currentPrice: '' };
  void base;
  const raw = { high: '1.1050', low: '1.0950', close: '1.1000', open: '1.0980', currentPrice: '' };

  it('input valid', () => {
    expect(validateInput(raw, 'classic', 5).ok).toBe(true);
  });

  it('High < Low', () => {
    const r = validateInput({ ...raw, high: '1.0900' }, 'classic', 5);
    expect(r.errors.high).toBe('High harus lebih besar atau sama dengan Low');
  });

  it('Close di luar rentang', () => {
    const r = validateInput({ ...raw, close: '1.1100' }, 'classic', 5);
    expect(r.errors.close).toBe('Close harus berada di antara Low dan High');
  });

  it('Open di luar rentang (DeMark)', () => {
    const r = validateInput({ ...raw, open: '1.2000' }, 'demark', 5);
    expect(r.errors.open).toBe('Open harus berada di antara Low dan High');
  });

  it('harga <= 0', () => {
    const r = validateInput({ ...raw, low: '0' }, 'classic', 5);
    expect(r.errors.low).toBe('Low harus lebih dari 0');
  });

  it('desimal di luar 2–6', () => {
    expect(validateInput(raw, 'classic', 1).errors.decimals).toBe('Jumlah desimal tidak valid');
    expect(validateInput(raw, 'classic', 7).errors.decimals).toBe('Jumlah desimal tidak valid');
  });

  it('harga saat ini opsional, tetapi bila diisi harus > 0', () => {
    expect(validateInput({ ...raw, currentPrice: '1.1010' }, 'classic', 5).ok).toBe(true);
    const r = validateInput({ ...raw, currentPrice: '-1' }, 'classic', 5);
    expect(r.errors.currentPrice).toBe('Harga saat ini harus lebih dari 0');
  });

  it('input kosong/bukan angka → errors, tanpa NaN', () => {
    const r = validateInput({ high: '', low: 'abc', close: '', open: '', currentPrice: '' }, 'classic', 5);
    expect(r.ok).toBe(false);
    expect(r.errors.high).toBeDefined();
    expect(r.errors.low).toBeDefined();
    expect(r.errors.close).toBeDefined();
    expect(Object.values(r.errors).every((m) => typeof m === 'string')).toBe(true);
  });
});

describe('Kasus tepi Bagian 9', () => {
  it('Range nol: H = L → semua level = P', () => {
    const input = { high: 1.1, low: 1.1, close: 1.1 };
    const levels = calcPivot('classic', input);
    for (const l of levels) expect(Math.abs(l.price - 1.1)).toBeLessThanOrEqual(TOL);
    const { items } = calcIML(levels);
    for (const it of items) expect(Math.abs(it.price - 1.1)).toBeLessThanOrEqual(TOL);
  });

  it('level <= 0 ditandai tidak valid dan IML-nya dilewati', () => {
    const levels: Level[] = [
      { name: 'R1', price: 1.0 },
      { name: 'P', price: 0.5 },
      { name: 'S1', price: -0.1 },
    ];
    const { items } = calcIML(levels);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('IML P\u2013R1');
    const merged = mergeLevels(levels, items);
    const s1 = merged.find((r) => r.name === 'S1')!;
    expect(s1.valid).toBe(false);
  });

  it('urutan tidak menurun → disortir ulang + peringatan', () => {
    const scrambled: Level[] = [
      { name: 'S2', price: 1.09 },
      { name: 'R1', price: 1.105 },
      { name: 'P', price: 1.1 },
    ];
    const { reordered } = calcIML(scrambled);
    expect(reordered).toBe(true);
  });
});

describe('format tampilan id-ID', () => {
  it('koma desimal', () => {
    expect(fmt(1.1025, 4)).toBe('1,1025');
    expect(fmt(1.105, 5)).toBe('1,10500');
  });
});

describe('panel langkah perhitungan', () => {
  it('menghasilkan langkah dengan angka pengguna', () => {
    const steps = buildPivotSteps('classic', T, 4);
    expect(steps[0].formula).toContain('1,1050');
    expect(steps[0].result).toBe('1,1000');
    const iml = buildIMLSteps(calcIML(calcPivot('classic', T)).items, 4);
    const pR1 = iml.find((s) => s.label === 'IML P\u2013R1')!;
    expect(pR1.formula).toBe('IML P\u2013R1 = (1,1000 + 1,1050) / 2');
    expect(pR1.result).toBe('1,1025');
  });
});
