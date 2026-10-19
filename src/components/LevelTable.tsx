import type { MergedRow, Zone } from '../lib/pivot';
import { fmt, fmtPips } from '../lib/pivot';

interface Props {
  rows: MergedRow[];
  decimals: number;
  pip: number;
  zone: Zone | null;
  showIML: boolean;
  onToggleIML: () => void;
  highlight: string | null;
  onHighlight: (name: string | null) => void;
  onCopy: (row: MergedRow) => void;
  onCopyTable: () => void;
  onDownloadCSV: () => void;
  warnings: string[];
  flashKeys: Set<string>;
}

const sideColor: Record<string, string> = {
  resist: 'var(--resist)',
  support: 'var(--support)',
  pivot: 'var(--ink)',
  neutral: 'var(--ink-muted)',
};

// IML mengikuti warna sisinya dengan intensitas lebih ringan.
const sideColorSoft: Record<string, string> = {
  resist: 'var(--resist-soft)',
  support: 'var(--support-soft)',
  pivot: 'var(--ink-muted)',
  neutral: 'var(--ink-muted)',
};

export default function LevelTable(props: Props) {
  const { rows, decimals, pip, zone, showIML, onToggleIML, highlight, onHighlight, onCopy } = props;
  const visible = showIML ? rows : rows.filter((r) => r.type === 'main');
  const zoneNames = new Set(
    [zone?.above, zone?.below, zone?.exact].filter(Boolean).map((r) => (r as MergedRow).name),
  );

  return (
    <section aria-labelledby="level-heading" className="flex flex-col min-w-0">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 id="level-heading" className="font-display text-[22px] leading-[28px]">
          Level
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer select-none min-h-11">
            <input
              type="checkbox"
              checked={showIML}
              onChange={onToggleIML}
              className="accent-[var(--price)]"
            />
            Tampilkan IML
          </label>
          <button
            type="button"
            onClick={props.onCopyTable}
            className="h-11 px-3 inline-flex items-center gap-2 border border-rule text-[13px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="9" y="9" width="11" height="11" rx="1" />
              <path d="M5 15V5a1 1 0 0 1 1-1h9" />
            </svg>
            Salin tabel
          </button>
          <button
            type="button"
            onClick={props.onDownloadCSV}
            className="h-11 px-3 inline-flex items-center gap-2 border border-rule text-[13px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M12 4v11" />
              <path d="m7 10 5 5 5-5" />
              <path d="M4 20h16" />
            </svg>
            Unduh CSV
          </button>
        </div>
      </div>

      {props.warnings.length > 0 ? (
        <div className="mt-3 space-y-2">
          {props.warnings.map((w) => (
            <p
              key={w}
              className="flex items-center gap-2 px-3 py-2 text-[13px]"
              style={{ background: 'var(--caution-bg)', color: 'var(--caution)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M12 4 2.5 20h19L12 4Z" />
                <path d="M12 10v4M12 17h.01" />
              </svg>
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="label-caps text-left pb-2">
              Level
            </th>
            <th scope="col" className="label-caps text-right pb-2">
              Harga
            </th>
            <th scope="col" className="label-caps text-right pb-2">
              Jarak (pips)
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => {
            const isMain = row.type === 'main';
            const below = visible[i + 1] ?? null;
            const gap = below && row.valid && below.valid ? (row.price - below.price) / pip : null;
            const color = (isMain ? sideColor : sideColorSoft)[row.side] ?? 'var(--ink-muted)';
            const inZone = zoneNames.has(row.name);
            return (
              <tr
                key={row.name}
                tabIndex={0}
                role="button"
                onMouseEnter={() => onHighlight(row.name)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(row.name)}
                onBlur={() => onHighlight(null)}
                onClick={() => onCopy(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCopy(row);
                  }
                }}
                className={`cursor-pointer ${highlight === row.name ? 'bg-paper' : ''} ${
                  inZone && highlight === null ? 'bg-paper' : ''
                } ${props.flashKeys.has(row.name) ? 'row-flash' : ''}`}
              >
                <td
                  title={!isMain ? 'Intermediate Level: titik tengah dua level yang bersebelahan.' : undefined}
                  className={`text-[15px] ${isMain ? 'font-semibold h-11' : 'text-[13px] h-11 md:h-9'} ${
                    isMain ? '' : 'pl-4'
                  }`}
                  style={{
                    borderLeft: isMain ? `2px solid ${color}` : undefined,
                    paddingLeft: isMain ? 8 : 16,
                    color: isMain ? undefined : color,
                  }}
                >
                  {isMain ? (
                    row.name
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                        <path
                          d="M5 0.8 9.2 5 5 9.2 0.8 5Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                      {row.name}
                    </span>
                  )}
                </td>
                <td className={`num text-right ${isMain ? 'text-[17px] font-medium' : 'text-[15px]'}`}>
                  {row.valid ? (
                    fmt(row.price, decimals)
                  ) : (
                    <span className="text-ink-muted italic text-[13px]">Tidak valid</span>
                  )}
                </td>
                <td className="num text-right text-[13px] text-ink-muted">
                  {gap !== null ? fmtPips(gap) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
