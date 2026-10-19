import { useEffect, useMemo, useRef, useState } from 'react';
import type { MergedRow, Zone } from '../lib/pivot';
import { fmt } from '../lib/pivot';

interface Props {
  rows: MergedRow[];
  price: number | null;
  decimals: number;
  zone: Zone | null;
  highlight: string | null;
  onHighlight: (name: string | null) => void;
  onCopy: (row: MergedRow) => void;
  /** Jumlah level yang akan muncul, untuk teks kerangka kosong. */
  expectedLevels?: number;
}

const MIN_GAP = 16; // px antar label

const sideColor: Record<string, string> = {
  resist: 'var(--resist)',
  support: 'var(--support)',
  pivot: 'var(--ink)',
  neutral: 'var(--ink-muted)',
};

// IML memakai varian lebih ringan dari warna sisinya.
const sideColorSoft: Record<string, string> = {
  resist: 'var(--resist-soft)',
  support: 'var(--support-soft)',
  pivot: 'var(--ink-muted)',
  neutral: 'var(--ink-muted)',
};

export default function Ladder({ rows, price, decimals, zone, highlight, onHighlight, onCopy, expectedLevels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const valid = rows.filter((r) => r.valid);

  // Skala proporsional
  const scale = useMemo(() => {
    if (valid.length === 0) return null;
    const prices = valid.map((r) => r.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    const outside = price !== null && (price > max || price < min);
    if (price !== null) {
      min = Math.min(min, price);
      max = Math.max(max, price);
    }
    let span = max - min;
    if (span === 0) span = Math.abs(max) * 0.001 || 1;
    const pad = span * (outside ? 0.04 : 0.08);
    return { min: min - pad, max: max + pad };
  }, [valid, price]);

  const y = (p: number) => {
    if (!scale) return 0;
    const t = (scale.max - p) / (scale.max - scale.min);
    return t * height;
  };

  // Posisi label dengan penghindaran tabrakan (dari atas ke bawah)
  const labels = useMemo(() => {
    const items = valid
      .map((r) => ({ row: r, y: y(r.price) }))
      .sort((a, b) => a.y - b.y)
      .map((it) => ({ ...it, labelY: it.y }));
    for (let i = 1; i < items.length; i++) {
      if (items[i].labelY - items[i - 1].labelY < MIN_GAP) {
        items[i].labelY = items[i - 1].labelY + MIN_GAP;
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, scale, height, decimals]);

  if (valid.length === 0) {
    const count = expectedLevels ?? 13;
    return (
      <div
        ref={containerRef}
        role="img"
        aria-label={`Tangga harga kosong: akan memunculkan ${count} level`}
        className="relative border border-rule bg-surface h-[520px] lg:h-[min(72vh,680px)] overflow-hidden"
      >
        {/* Kerangka garis putus-putus */}
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="absolute left-3"
            style={{
              top: `${8 + i * 13}%`,
              width: `${38 + ((i * 17) % 26)}%`,
              borderTop: '1px dashed var(--rule)',
            }}
          />
        ))}
        <p className="absolute inset-x-0 bottom-0 p-4 text-[13px] leading-[20px] text-ink-muted text-center">
          Isi High, Low, dan Close untuk memunculkan {count} level.
        </p>
      </div>
    );
  }

  const above = zone?.above ?? null;
  const below = zone?.below ?? null;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Tangga harga: ${valid.length} level dari ${fmt(valid[0].price, decimals)} sampai ${fmt(
        valid[valid.length - 1].price,
        decimals,
      )}`}
      className="relative border border-rule bg-surface h-[520px] lg:h-[min(72vh,680px)] overflow-hidden"
    >
      {/* Zona antara dua level terdekat */}
      {above && below && price !== null ? (
        <div
          className="absolute left-0 right-0"
          style={{
            top: y(above.price),
            height: Math.max(0, y(below.price) - y(above.price)),
            background: 'color-mix(in srgb, var(--price) 8%, transparent)',
          }}
        />
      ) : null}

      {/* Garis level */}
      {valid.map((r) => {
        const isMain = r.type === 'main';
        const active = highlight === r.name;
        const color = (isMain ? sideColor : sideColorSoft)[r.side] ?? 'var(--ink-muted)';
        return (
          <div key={r.name} className="absolute left-0 right-0" style={{ top: y(r.price) }}>
            {/* penanda di tulang kiri */}
            <div
              className="absolute -translate-y-1/2"
              style={{
                left: 8,
                width: 8,
                height: 8,
                background: isMain ? color : 'transparent',
                border: `1.5px solid ${color}`,
                transform: `translateY(-50%) rotate(${isMain ? 0 : 45}deg)`,
              }}
            />
            <div
              style={{
                marginLeft: isMain ? 20 : 20,
                width: isMain ? 'calc(100% - 20px)' : 'calc(50% - 20px)',
                borderTop: isMain
                  ? `1.5px solid ${color}`
                  : `1px dashed ${color}`,
                opacity: active ? 1 : isMain ? 0.9 : 0.7,
              }}
            />
          </div>
        );
      })}

      {/* Harga sekarang */}
      {price !== null && scale && price >= scale.min && price <= scale.max ? (
        <div className="absolute left-0 right-0" style={{ top: y(price) }}>
          <div style={{ borderTop: '2px solid var(--price)', width: '100%' }} />
          <span
            className="absolute right-1 -translate-y-1/2 num text-[13px] px-1"
            style={{ background: 'var(--price)', color: 'var(--paper)' }}
          >
            {fmt(price, decimals)}
          </span>
        </div>
      ) : null}

      {/* Label (dapat bergeser; penunjuk ke posisi asli) */}
      <div className="absolute inset-y-0 right-0 w-[168px]">
        {labels.map(({ row, y: lineY, labelY }) => {
          const isMain = row.type === 'main';
          const active = highlight === row.name;
          const color = (isMain ? sideColor : sideColorSoft)[row.side] ?? 'var(--ink-muted)';
          return (
            <div
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
              className={`absolute right-0 w-full px-2 cursor-pointer ${active ? 'bg-paper' : ''}`}
              style={{ top: labelY, transform: 'translateY(-50%)' }}
            >
              {Math.abs(labelY - lineY) > 1 ? (
                <span
                  className="absolute"
                  style={{
                    left: -10,
                    top: `calc(50% + ${lineY - labelY}px)`,
                    width: 10,
                    borderTop: '1px solid var(--rule)',
                  }}
                />
              ) : null}
              <span
                className={`block text-[12px] leading-[14px] num ${isMain ? 'font-medium' : ''}`}
                style={{ color }}
              >
                {isMain ? row.name : `◇ ${row.name.replace('IML ', '')}`}
              </span>
              <span className={`block num ${isMain ? 'text-[15px]' : 'text-[13px]'} text-ink`}>
                {fmt(row.price, decimals)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
