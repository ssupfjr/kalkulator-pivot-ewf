import { calcPivot, fmt, levelOrder, METHOD_LABELS, METHODS, type PivotInput, type PivotMethod } from '../lib/pivot';

interface Props {
  inputs: Record<PivotMethod, PivotInput | null>;
  decimals: number;
  onClose: () => void;
}

const ROW_ORDER = ['R4', 'R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3', 'S4'];

export default function CompareView({ inputs, decimals, onClose }: Props) {
  const maps = METHODS.map((m) => {
    const inp = inputs[m];
    if (!inp) return null;
    const levels = calcPivot(m, inp);
    const map: Record<string, number> = {};
    for (const l of levels) map[l.name] = l.price;
    return map;
  });

  const rows = ROW_ORDER.filter((name) =>
    METHODS.some((_m, i) => maps[i] && maps[i]![name] !== undefined),
  );

  return (
    <section aria-labelledby="compare-heading" className="mt-6 border border-rule bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 id="compare-heading" className="font-display text-[22px] leading-[28px]">
          Bandingkan semua metode
        </h2>
        <button type="button" onClick={onClose} className="h-11 px-3 border border-rule text-[13px]">
          Tutup
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th scope="col" className="label-caps text-left px-4 py-2 sticky left-0 bg-surface">
                Level
              </th>
              {METHODS.map((m) => (
                <th key={m} scope="col" className="label-caps text-right px-4 py-2">
                  {METHOD_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((name) => (
              <tr key={name}>
                <th scope="row" className="text-left px-4 py-2 text-[15px] font-semibold sticky left-0 bg-surface">
                  {name}
                </th>
                {METHODS.map((m, i) => {
                  const map = maps[i];
                  const v = map ? map[name] : undefined;
                  const inOrder = levelOrder(m).includes(name);
                  return (
                    <td key={m} className="num px-4 py-2 text-[15px]">
                      {v !== undefined ? (
                        fmt(v, decimals)
                      ) : (
                        <span className="text-ink-muted">{inOrder ? '—' : '–'}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
