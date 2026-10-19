import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildIMLSteps,
  buildPivotSteps,
  calcIML,
  calcPivot,
  findZone,
  fmt,
  fmtPips,
  mergeLevels,
  METHOD_LABELS,
  METHODS,
  pivotBias,
  validateInput,
  type MergedRow,
  type PivotInput,
  type PivotMethod,
} from './lib/pivot';
import InputPanel from './components/InputPanel';
import LevelTable from './components/LevelTable';
import Ladder from './components/Ladder';
import CompareView from './components/CompareView';
import StepsPanel from './components/StepsPanel';
import presets from './data/presets.json';

type Theme = 'light' | 'dark' | 'auto';

const EMPTY_RAW = { high: '', low: '', close: '', open: '', currentPrice: '' };
const EXAMPLE = { high: '1.1050', low: '1.0950', close: '1.1000', open: '', currentPrice: '' };
// Jumlah total level (utama + IML) per metode, untuk teks kerangka kosong.
const LEVEL_COUNT: Record<PivotMethod, number> = {
  classic: 17,
  fibonacci: 17,
  woodie: 17,
  camarilla: 15,
  demark: 5,
};

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function parseRaw(raw: Record<string, string>): Record<PivotMethod, PivotInput | null> {
  const n = (s: string) => {
    const v = Number(s.trim().replace(/\s/g, ''));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const high = n(raw.high);
  const low = n(raw.low);
  const close = n(raw.close);
  const open = n(raw.open);
  const base =
    high === null || low === null || close === null ? null : { high, low, close };
  const out = {} as Record<PivotMethod, PivotInput | null>;
  for (const m of METHODS) {
    if (!base) {
      out[m] = null;
    } else if (m === 'demark') {
      out[m] = { ...base, open: open ?? base.close };
    } else {
      out[m] = base;
    }
  }
  return out;
}

export default function App() {
  const [method, setMethod] = useState<PivotMethod>('classic');
  const [raw, setRaw] = useState({ ...EMPTY_RAW });
  const [decimals, setDecimals] = useState(5);
  const [preset, setPreset] = useState('EURUSD');
  const [showIML, setShowIML] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('tangga-pivot-theme') as Theme) ?? 'auto');
  const [showCompare, setShowCompare] = useState(false);
  const [mobileView, setMobileView] = useState<'tabel' | 'tangga'>('tabel');
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [live, setLive] = useState('');
  const [touched, setTouched] = useState<Set<keyof typeof EMPTY_RAW>>(new Set());
  const [stepsOpen, setStepsOpen] = useState(false);
  const hadResultRef = useRef(false);
  const prevRowsRef = useRef<Map<string, number>>(new Map());
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  const pip = useMemo(() => {
    if (preset === 'custom') return Math.pow(10, -decimals);
    return presets.find((p) => p.symbol === preset)?.pip ?? 0.0001;
  }, [preset, decimals]);

  // Tema
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    localStorage.setItem('tangga-pivot-theme', theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  // Validasi (langsung, untuk penanda field). Field kosong yang belum disentuh tidak ditandai merah.
  const validation = useMemo(() => {
    const v = validateInput(raw, method, decimals);
    const errors = { ...v.errors };
    for (const key of ['high', 'low', 'close', 'open', 'currentPrice'] as const) {
      if (raw[key].trim() === '' && !touched.has(key)) delete errors[key];
    }
    return { ...v, errors, ok: Object.keys(errors).length === 0 };
  }, [raw, method, decimals, touched]);

  // Perhitungan didebounce 150 ms
  const debouncedRaw = useDebounced(raw, 150);
  const debouncedValidation = useMemo(
    () => validateInput(debouncedRaw, method, decimals),
    [debouncedRaw, method, decimals],
  );

  const result = useMemo(() => {
    if (!debouncedValidation.ok) return null;
    const v = debouncedValidation.values;
    const input: PivotInput = {
      high: v.high,
      low: v.low,
      close: v.close,
      open: method === 'demark' ? (v.open ?? v.close) : undefined,
    };
    const levels = calcPivot(method, input);
    const { items, reordered } = calcIML(levels);
    const merged = mergeLevels(levels, items);
    const price = v.currentPrice ?? null;
    const zone = price !== null ? findZone(merged, price) : null;
    const rangeZero = input.high === input.low;
    const warnings: string[] = [];
    if (rangeZero) warnings.push('Range nol: semua level sama dengan P');
    if (reordered) warnings.push('Urutan level disesuaikan');
    return { input, levels, iml: items, merged, price, zone, warnings };
  }, [debouncedValidation, method]);

  // Umumkan perubahan hasil untuk pembaca layar + deteksi baris berubah (kedip)
  useEffect(() => {
    if (!result) {
      setLive('');
      return;
    }
    setLive(`${result.merged.length} level dihitung dengan metode ${METHOD_LABELS[method]}.`);
    const prev = prevRowsRef.current;
    const next = new Map<string, number>();
    const changed = new Set<string>();
    for (const r of result.merged) {
      next.set(r.name, r.price);
      if (prev.has(r.name) && prev.get(r.name) !== r.price) changed.add(r.name);
    }
    prevRowsRef.current = next;
    setFlashKeys(changed);
  }, [result, method]);

  // Di ponsel: form menyusut menjadi bar ringkasan begitu hasil pertama muncul
  useEffect(() => {
    if (result && !hadResultRef.current && window.innerWidth < 640) {
      setFormCollapsed(true);
    }
    hadResultRef.current = result !== null;
  }, [result]);

  const copy = useCallback((text: string, message: string) => {
    const done = () => {
      setToast(message);
      window.setTimeout(() => setToast(null), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    }
  }, []);

  const onCopyRow = useCallback(
    (row: MergedRow) => {
      if (!row.valid) return;
      copy(fmt(row.price, decimals), `Disalin ${fmt(row.price, decimals)}`);
    },
    [copy, decimals],
  );

  const onCopyTable = useCallback(() => {
    if (!result) return;
    const lines = [
      `Level\tHarga\tJarak (pips)`,
      ...result.merged.map((r, i) => {
        const below = result.merged[i + 1];
        const gap = below && r.valid && below.valid ? fmtPips((r.price - below.price) / pip) : '—';
        return `${r.name}\t${r.valid ? fmt(r.price, decimals) : 'Tidak valid'}\t${gap}`;
      }),
    ];
    copy(lines.join('\n'), 'Tabel disalin');
  }, [copy, decimals, pip, result]);

  const onDownloadCSV = useCallback(() => {
    if (!result) return;
    const d = decimals;
    const lines: string[] = [
      `Metode;${METHOD_LABELS[method]}`,
      `High;${fmt(result.input.high, d)}`,
      `Low;${fmt(result.input.low, d)}`,
      `Close;${fmt(result.input.close, d)}`,
      result.input.open !== undefined ? `Open;${fmt(result.input.open, d)}` : 'Open;-',
      `Harga saat ini;${result.price !== null ? fmt(result.price, d) : '-'}`,
      `Desimal;${d}`,
      `Ukuran pip;${pip}`,
      '',
      'Level;Tipe;Harga;Jarak ke baris di bawah (pips)',
      ...result.merged.map((r, i) => {
        const below = result.merged[i + 1];
        const gap = below && r.valid && below.valid ? fmtPips((r.price - below.price) / pip) : '';
        const val = r.valid ? fmt(r.price, d).replace(/\u00A0/g, '') : 'Tidak valid';
        return `${r.name};${r.type === 'main' ? 'Utama' : 'IML'};${val};${gap}`;
      }),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tangga-pivot-${method}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [decimals, method, pip, result]);

  const onExample = useCallback(() => {
    setRaw({ ...EXAMPLE });
    setPreset('EURUSD');
    setDecimals(5);
    setFormCollapsed(true);
  }, []);

  const onReset = useCallback(() => {
    setRaw({ ...EMPTY_RAW });
    setMethod('classic');
    setPreset('EURUSD');
    setDecimals(5);
    setShowIML(true);
    setShowCompare(false);
    setFormCollapsed(false);
    setHighlight(null);
    setTouched(new Set());
    prevRowsRef.current = new Map();
  }, []);

  const onPreset = useCallback((symbol: string) => {
    setPreset(symbol);
    if (symbol !== 'custom') {
      const p = presets.find((x) => x.symbol === symbol);
      if (p) setDecimals(p.decimals);
    }
  }, []);

  const bias = result?.price !== null && result ? pivotBias(result.price!, levelsP(result)) : null;

  const pivotSteps = result ? buildPivotSteps(method, result.input, decimals) : [];
  const imlSteps = result ? buildIMLSteps(result.iml, decimals) : [];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#hasil"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-ink focus:text-paper focus:px-3 focus:py-2"
      >
        Lompat ke hasil
      </a>

      {/* Header — band hijau hutan dengan garis oranye sebagai tanda tangan merek */}
      <header
        className="border-b-[3px]"
        style={{ background: 'var(--brand)', borderColor: 'var(--accent)' }}
      >
        <div className="mx-auto max-w-[1120px] px-4 py-4 flex items-center gap-4 flex-wrap">
          <h1
            className="font-display text-[30px] leading-[36px] tracking-tight"
            style={{ color: 'var(--band-ink)' }}
          >
            Tangga Pivot
          </h1>
          <p className="text-[13px] hidden sm:block" style={{ color: 'rgba(246,243,236,.72)' }}>
            Kalkulator Pivot Point &amp; IML
          </p>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStepsOpen(true);
                document.getElementById('langkah')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="h-11 px-2 text-[13px] underline underline-offset-4 hover:opacity-80"
              style={{ color: 'rgba(246,243,236,.82)' }}
            >
              Cara menghitung
            </button>
            <label htmlFor="theme" className="sr-only">
              Tema
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="h-11 px-2 border text-[13px] bg-transparent"
              style={{ color: 'var(--band-ink)', borderColor: 'rgba(246,243,236,.4)' }}
            >
              <option value="auto">Tema: otomatis</option>
              <option value="light">Tema: terang</option>
              <option value="dark">Tema: gelap</option>
            </select>
            <button
              type="button"
              onClick={() => setShowCompare((s) => !s)}
              className="h-11 px-3 border text-[13px] hover:opacity-80"
              style={{
                color: showCompare ? '#12161B' : 'var(--band-ink)',
                borderColor: showCompare ? 'var(--accent)' : 'rgba(246,243,236,.4)',
                background: showCompare ? 'var(--accent)' : 'transparent',
              }}
              aria-pressed={showCompare}
            >
              Bandingkan semua metode
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 py-6">
        {/* Bar ringkasan mobile setelah hasil muncul */}
        {formCollapsed && result ? (
          <div className="md:hidden sticky top-0 z-20 bg-paper border-b border-rule py-2 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[13px]">{METHOD_LABELS[method]}</span>
            <span className="num text-[12px] text-ink-muted">H {fmt(result.input.high, decimals)}</span>
            <span className="num text-[12px] text-ink-muted">L {fmt(result.input.low, decimals)}</span>
            <span className="num text-[12px] text-ink-muted">C {fmt(result.input.close, decimals)}</span>
            <button
              type="button"
              onClick={() => setFormCollapsed(false)}
              className="ml-auto h-11 px-3 border border-rule text-[13px]"
            >
              Ubah
            </button>
          </div>
        ) : null}

        <div className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-8 md:items-start lg:grid-cols-[320px_300px_minmax(0,440px)]">
          {/* Kolom input */}
          <div className={formCollapsed && result ? 'hidden md:block' : ''}>
            <InputPanel
              method={method}
              onMethod={setMethod}
              raw={raw}
              onRaw={(patch) => {
                setRaw((r) => ({ ...r, ...patch }));
                setTouched((t) => {
                  const next = new Set(t);
                  for (const k of Object.keys(patch)) next.add(k as keyof typeof EMPTY_RAW);
                  return next;
                });
              }}
              decimals={decimals}
              onDecimals={setDecimals}
              preset={preset}
              onPreset={onPreset}
              errors={validation.errors}
              onExample={onExample}
              onReset={onReset}
            />
          </div>

          {/* Kolom hasil */}
          <div id="hasil" className="mt-6 md:mt-0 min-w-0 lg:grid lg:grid-cols-[300px_minmax(0,440px)] lg:gap-6 lg:items-start">
            {/* Tab selector (di bawah lg) */}
            <div className="lg:hidden flex border border-rule divide-x divide-rule mb-4">
              {(['tabel', 'tangga'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMobileView(v)}
                  className={`flex-1 h-11 text-[13px] ${mobileView === v ? 'bg-ink text-paper' : ''}`}
                  aria-pressed={mobileView === v}
                >
                  {v === 'tabel' ? 'Tabel' : 'Tangga'}
                </button>
              ))}
            </div>

            {result ? (
              <>
                {/* Zona harga */}
                {result.price !== null && result.zone ? (
                  <div className="mb-4 border border-rule bg-surface px-4 py-3 text-[13px] leading-[20px] lg:col-span-2">
                    {result.zone.exact ? (
                      <p>
                        Tepat di <span className="font-semibold">{result.zone.exact.name}</span> (
                        <span className="num">{fmt(result.zone.exact.price, decimals)}</span>).
                      </p>
                    ) : result.zone.above && result.zone.below ? (
                      <p>
                        Harga di antara{' '}
                        <span className="font-semibold">{result.zone.above.name}</span> (
                        <span className="num">{fmt(result.zone.above.price, decimals)}</span>) dan{' '}
                        <span className="font-semibold">{result.zone.below.name}</span> (
                        <span className="num">{fmt(result.zone.below.price, decimals)}</span>). Jarak{' '}
                        <span className="num">
                          {fmtPips((result.zone.above.price - result.price) / pip)}
                        </span>{' '}
                        pips ke atas,{' '}
                        <span className="num">
                          {fmtPips((result.price - result.zone.below.price) / pip)}
                        </span>{' '}
                        pips ke bawah.
                      </p>
                    ) : result.zone.above ? (
                      <p>
                        Harga di bawah semua level. Level terdekat di atas: {result.zone.above.name} (
                        <span className="num">{fmt(result.zone.above.price, decimals)}</span>).
                      </p>
                    ) : (
                      <p>
                        Harga di atas semua level. Level terdekat di bawah: {result.zone.below!.name} (
                        <span className="num">{fmt(result.zone.below!.price, decimals)}</span>).
                      </p>
                    )}
                    {bias ? (
                      <p className="mt-1 text-ink-muted">
                        Bias terhadap Pivot:{' '}
                        <span className="font-medium text-ink">
                          {bias}
                          {bias !== 'Netral'
                            ? ` (harga ${bias === 'Bullish' ? 'di atas' : 'di bawah'} P)`
                            : ''}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className={mobileView === 'tabel' ? 'block' : 'hidden lg:block'}>
                  <LevelTable
                    rows={result.merged}
                    decimals={decimals}
                    pip={pip}
                    zone={result.zone}
                    showIML={showIML}
                    onToggleIML={() => setShowIML((s) => !s)}
                    highlight={highlight}
                    onHighlight={setHighlight}
                    onCopy={onCopyRow}
                    onCopyTable={onCopyTable}
                    onDownloadCSV={onDownloadCSV}
                    warnings={result.warnings}
                    flashKeys={flashKeys}
                  />
                  <StepsPanel pivotSteps={pivotSteps} imlSteps={imlSteps} open={stepsOpen} onToggle={setStepsOpen} />
                  {showCompare ? (
                    <CompareView
                      inputs={parseRaw(raw)}
                      decimals={decimals}
                      onClose={() => setShowCompare(false)}
                    />
                  ) : null}
                </div>

                <div className={mobileView === 'tangga' ? 'block' : 'hidden lg:block'}>
                  <Ladder
                    rows={result.merged.filter((r) => (showIML ? true : r.type === 'main'))}
                    price={result.price}
                    decimals={decimals}
                    zone={result.zone}
                    highlight={highlight}
                    onHighlight={setHighlight}
                    onCopy={onCopyRow}
                  />
                </div>
              </>
            ) : (
              <div className={mobileView === 'tabel' ? 'block' : 'hidden lg:block'}>
                {validation.ok ? null : (
                  <div className="border border-rule bg-surface px-4 py-3 text-[13px] text-ink-muted mb-4">
                    Perbaiki input yang ditandai merah untuk melihat hasil.
                  </div>
                )}
              </div>
            )}

            {/* Kerangka tangga saat belum ada hasil (empty state brief Bagian 9) */}
            {!result ? (
              <div className={mobileView === 'tangga' ? 'block' : 'hidden lg:block'}>
                <Ladder
                  rows={[]}
                  price={null}
                  decimals={decimals}
                  zone={null}
                  highlight={null}
                  onHighlight={setHighlight}
                  onCopy={() => {}}
                  expectedLevels={LEVEL_COUNT[method]}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="border-t border-rule mt-10">
        <div className="mx-auto max-w-[1120px] px-4 py-4 text-[12px] leading-[16px] text-ink-muted">
          Alat bantu hitung, bukan saran investasi. Seluruh perhitungan berjalan di sisi klien; tidak ada data
          yang dikirim ke server.
        </div>
      </footer>

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          className="fixed left-4 bottom-4 z-50 px-3 py-2 text-[13px]"
          style={{ background: 'var(--toast-bg)', color: 'var(--toast-ink)', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      ) : null}

      {/* Hasil diumumkan ke pembaca layar */}
      <div aria-live="polite" className="sr-only">
        {live}
      </div>
    </div>
  );
}

function levelsP(result: { levels: { name: string; price: number }[] }): number | null {
  const p = result.levels.find((l) => l.name === 'P');
  return p ? p.price : null;
}
