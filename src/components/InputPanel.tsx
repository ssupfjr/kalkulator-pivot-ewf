import type { FieldErrors } from '../lib/pivot';
import { METHOD_HINTS, METHOD_LABELS, METHODS, type PivotMethod } from '../lib/pivot';
import { IconReset } from './icons';
import presets from '../data/presets.json';

interface Props {
  method: PivotMethod;
  onMethod: (m: PivotMethod) => void;
  raw: { high: string; low: string; close: string; open: string; currentPrice: string };
  onRaw: (patch: Partial<Props['raw']>) => void;
  decimals: number;
  onDecimals: (d: number) => void;
  preset: string;
  onPreset: (s: string) => void;
  errors: FieldErrors;
  onExample: () => void;
  onReset: () => void;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] leading-[18px] font-medium text-ink">
        {label}
        {optional ? <span className="text-ink-muted font-normal"> (opsional)</span> : null}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`mt-1 h-11 w-full bg-transparent px-3 text-right num border ${
          error ? 'border-alert border-2' : 'border-rule'
        }`}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 flex items-center gap-1 text-[12px] leading-[16px] text-alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M12 4 2.5 20h19L12 4Z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function InputPanel(props: Props) {
  const { method, onMethod, raw, onRaw, decimals, onDecimals, preset, onPreset, errors } = props;
  const showOpen = method === 'demark';

  return (
    <section aria-labelledby="input-heading" className="bg-surface border border-rule p-6 space-y-5">
      <h2 id="input-heading" className="font-display text-[22px] leading-[28px]">
        Input periode sebelumnya
      </h2>

      {/* Preset instrumen */}
      <div>
        <label htmlFor="preset" className="label-caps block">
          Instrumen
        </label>
        <select
          id="preset"
          value={preset}
          onChange={(e) => onPreset(e.target.value)}
          className="mt-1 h-11 w-full bg-transparent px-2 border border-rule text-[15px]"
        >
          {presets.map((p) => (
            <option key={p.symbol} value={p.symbol}>
              {p.symbol} · {p.decimals} desimal
            </option>
          ))}
          <option value="custom">Kustom</option>
        </select>
      </div>

      {/* Metode: daftar radio */}
      <fieldset>
        <legend className="label-caps">Metode pivot</legend>
        <div className="mt-1 border border-rule divide-y divide-rule">
          {METHODS.map((m) => (
            <label
              key={m}
              className={`flex items-center gap-3 px-3 cursor-pointer min-h-11 ${
                method === m ? 'bg-paper' : ''
              }`}
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => onMethod(m)}
                className="accent-[var(--price)]"
              />
              <span className="flex-1 py-2">
                <span className={`block text-[15px] ${method === m ? 'font-semibold' : ''}`}>
                  {METHOD_LABELS[m]}
                </span>
                <span className="block text-[12px] leading-[16px] text-ink-muted num text-left">
                  {METHOD_HINTS[m]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Harga */}
      <div className="space-y-4">
        <Field id="f-high" label="High" value={raw.high} onChange={(v) => onRaw({ high: v })} error={errors.high} />
        <Field id="f-low" label="Low" value={raw.low} onChange={(v) => onRaw({ low: v })} error={errors.low} />
        <Field
          id="f-close"
          label="Close"
          value={raw.close}
          onChange={(v) => onRaw({ close: v })}
          error={errors.close}
        />
        <div
          className={`transition-all duration-150 overflow-hidden ${showOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <Field
            id="f-open"
            label="Open"
            value={raw.open}
            onChange={(v) => onRaw({ open: v })}
            error={errors.open}
          />
        </div>
      </div>

      {/* Harga sekarang */}
      <Field
        id="f-price"
        label="Harga sekarang"
        value={raw.currentPrice}
        onChange={(v) => onRaw({ currentPrice: v })}
        error={errors.currentPrice}
        optional
      />

      {/* Desimal */}
      <div>
        <span id="dec-label" className="label-caps block">
          Jumlah desimal
        </span>
        <div className="mt-1 flex items-center gap-2" role="group" aria-labelledby="dec-label">
          <button
            type="button"
            onClick={() => onDecimals(Math.max(2, decimals - 1))}
            className="h-11 w-11 border border-rule text-[17px]"
            aria-label="Kurangi desimal"
          >
            −
          </button>
          <output className="num h-11 flex-1 border border-rule flex items-center justify-center text-[15px]">
            {decimals}
          </output>
          <button
            type="button"
            onClick={() => onDecimals(Math.min(6, decimals + 1))}
            className="h-11 w-11 border border-rule text-[17px]"
            aria-label="Tambah desimal"
          >
            +
          </button>
        </div>
        {errors.decimals ? <p className="mt-1 text-[12px] text-alert">{errors.decimals}</p> : null}
      </div>

      {/* Aksi */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={props.onExample}
          className="h-11 px-4 font-medium text-[15px] border"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-ink)', borderColor: 'var(--btn-bg)' }}
        >
          Pakai contoh
        </button>
        <button
          type="button"
          onClick={props.onReset}
          className="h-11 px-3 inline-flex items-center gap-2 border border-rule text-[15px]"
        >
          <IconReset />
          Reset
        </button>
      </div>
    </section>
  );
}
