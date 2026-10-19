import type { Step } from '../lib/pivot';

interface Props {
  pivotSteps: Step[];
  imlSteps: Step[];
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

export default function StepsPanel({ pivotSteps, imlSteps, open, onToggle }: Props) {
  return (
    <details
      id="langkah"
      className="mt-6 border border-rule bg-surface"
      open={open}
      onToggle={(e) => onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-4 py-3 font-display text-[17px] leading-[24px] select-none">
        Langkah perhitungan
      </summary>
      <div className="px-4 pb-4 space-y-4">
        <div>
          <h3 className="label-caps">Pivot</h3>
          <ul className="mt-1 space-y-1">
            {pivotSteps.map((s) => (
              <li key={s.label} className="num text-[13px] leading-[20px] text-left flex flex-wrap gap-x-2">
                <span className="font-medium w-16 shrink-0">{s.label}</span>
                <span className="text-ink-muted">{s.formula}</span>
                <span className="ml-auto">= {s.result}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="label-caps">IML (Intermediate Level)</h3>
          <ul className="mt-1 space-y-1">
            {imlSteps.map((s) => (
              <li key={s.label} className="num text-[13px] leading-[20px] text-left flex flex-wrap gap-x-2">
                <span className="font-medium w-24 shrink-0">{s.label}</span>
                <span className="text-ink-muted">{s.formula}</span>
                <span className="ml-auto">= {s.result}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
