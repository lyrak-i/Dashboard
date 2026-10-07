import { useState, useEffect, useRef } from 'react'
import { Table2, BarChart3, ChevronDown, Info } from 'lucide-react'
import { fmtInt, INK, INK_2, MUTED, GRID, AXIS, SURFACE, BORDER } from '../theme'

/* ---------- Formatting ---------- */
export const fmtVal = (n) => (n == null ? '—' : fmtInt(n))
export const fmtPct1 = (n) => (n == null ? '—' : `${n.toFixed(1).replace('.', ',')}%`)

/* ---------- Card ---------- */
export function Card({ title, subtitle, children, className = '', action, headerAfter }) {
  return (
    <section className={`rounded-xl border bg-white shadow-sm ${className}`} style={{ borderColor: BORDER }}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: INK }}>{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs" style={{ color: MUTED }}>{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {headerAfter}
          {action}
        </div>
      </header>
      <div className="px-3 pb-4 pt-2">{children}</div>
    </section>
  )
}

/* ---------- Chart ⇄ table toggle ---------- */
/**
 * Wraps a chart with a "Lihat sebagai tabel" toggle — the accessible relief
 * for sub-3:1 series colors and the way to inspect exact values.
 */
export function ChartView({ children, rows, columns, emptyText = 'Tidak ada data pada filter ini.' }) {
  const [asTable, setAsTable] = useState(false)
  const hasData = rows && rows.length > 0

  if (asTable) {
    if (!hasData) return <div className="px-2 py-8 text-center text-sm" style={{ color: MUTED }}>{emptyText}</div>
    return (
      <>
        <div className="max-h-[320px] overflow-auto rounded-lg border" style={{ borderColor: BORDER }}>
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white" style={{ color: INK_2 }}>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap border-b px-3 py-2 font-semibold" style={{ borderColor: GRID }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ color: INK }}>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-white even:[&>td]:bg-[#fafaf9]">
                {columns.map((c) => (
                  <td key={c.key} className="border-b px-3 py-1.5 tabular-nums" style={{ borderColor: GRID }}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="mt-1 flex justify-end">
          <TableBackButton onClick={() => setAsTable(false)} />
        </div>
      </>
    )
  }

  if (!hasData) return <div className="px-2 py-8 text-center text-sm" style={{ color: MUTED }}>{emptyText}</div>
  return (
    <>
      {children}
      <div className="mt-1 flex justify-end">
        <button
          onClick={() => setAsTable(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-black/5"
          style={{ color: INK_2 }}
        >
          <Table2 size={13} /> Lihat sebagai tabel
        </button>
      </div>
    </>
  )
}

export function TableBackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-black/5"
      style={{ color: INK_2 }}
    >
      <BarChart3 size={13} /> Kembali ke grafik
    </button>
  )
}

/* ---------- Select (filter control) ---------- */
export function Select({ label, value, options, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const current = value || label
  const isSet = Boolean(value)

  return (
    <div className="relative" ref={ref}>
      <label
        onClick={() => setOpen(!open)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }}
        className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[#2a78d6]/40 ${open ? 'ring-2 ring-[#2a78d6]/40' : ''}`}
        style={{ borderColor: isSet ? '#2a78d6' : BORDER, color: isSet ? '#1c5cab' : INK_2, background: isSet ? '#eff6ff' : '#fff' }}
      >
        {Icon && <Icon size={14} />}
        <span className="max-w-[10rem] truncate">{current}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </label>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-60 overflow-auto rounded-lg border bg-white py-1 shadow-lg" style={{ borderColor: BORDER }}>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
            style={{ color: isSet ? '#1c5cab' : MUTED, fontWeight: isSet ? 600 : 500 }}
            onClick={() => { onChange(''); setOpen(false) }}
          >
            Semua {label.toLowerCase()}
            {!value && <span style={{ color: '#2a78d6' }}>✓</span>}
          </button>
          <div className="my-1 h-px" style={{ background: GRID }} />
          {options.length === 0 && <div className="px-3 py-2 text-sm" style={{ color: MUTED }}>— tidak ada nilai —</div>}
          {options.map((o) => (
            <button
              key={o}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-black/[0.04]"
              style={{ color: INK, fontWeight: value === o ? 600 : 400, background: value === o ? '#f2f4f7' : undefined }}
              onClick={() => { onChange(o); setOpen(false) }}
            >
              <span className="truncate">{o}</span>
              {value === o && <span style={{ color: '#2a78d6' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- KPI card ---------- */
export function KpiCard({ icon: Icon, label, value, sub, hint }) {
  return (
    <div className="group relative rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5" style={{ borderColor: BORDER }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: '#eff6ff', color: '#1c5cab' }}>
          {Icon && <Icon size={15} />}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl" style={{ color: INK }}>{value}</p>
      {sub && <p className="mt-1 text-xs font-medium" style={{ color: INK_2 }}>{sub}</p>}
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
          <Info size={11} className="shrink-0" /> {hint}
        </p>
      )}
    </div>
  )
}
