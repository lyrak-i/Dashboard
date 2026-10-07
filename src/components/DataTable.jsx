import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Inbox, ArrowUpDown } from 'lucide-react'
import { tableRow } from '../lib/analytics'
import { exportRowsToCsv } from '../lib/csv'
import { BORDER, GRID, INK, INK_2, MUTED, fmtInt, fmtDateID, hours } from '../theme'

const PAGE_SIZE = 50

const COLS = [
  { key: 'date', label: 'Tanggal', sortable: true, render: (r) => (r.date ? fmtDateID(r.date) : '—') },
  { key: 'wo', label: 'No. WO', render: (r) => r.wo || '—' },
  { key: 'siteName', label: 'Site', render: (r) => r.siteName || '—' },
  { key: 'nop', label: 'NOP', render: (r) => r.nop || '—' },
  { key: 'cluster', label: 'Cluster', render: (r) => r.cluster || '—' },
  { key: 'status', label: 'Status', render: (r) => r.status || '—' },
  { key: 'severity', label: 'Severity', render: (r) => r.severity || '—' },
  { key: 'sla', label: 'SLA', render: (r) => r.sla || '—' },
  { key: 'mttr', label: 'MTTR (jam)', sortable: true, render: (r) => (r.mttr == null ? '—' : hours.format(r.mttr)) },
  { key: 'rootcause1', label: 'Akar Masalah', render: (r) => r.rootcause1 || '—' },
  { key: 'pic', label: 'PIC', render: (r) => r.pic || '—' },
  { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '—' },
]

function statusTone(v) {
  const s = String(v || '').toUpperCase()
  if (s === 'CLOSED' || s === 'RESOLVED') return '#0ca30c'
  if (s === 'ESCALATED TO INSERA') return '#d03b3b'
  if (s === 'IN PROGRESS' || s === 'ASSIGNED') return '#ec835a'
  return INK_2
}

/** Paginated raw-row table over the filtered set — the drill-down for any KPI. */
export default function DataTable({ rows, schema, headers, fileName }) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })

  // Sort once per (rows, sort) change; 41k rows is comfortably fast.
  const sortedIdx = useMemo(() => {
    const idx = rows.map((_, i) => i)
    if (sort.key === 'date') {
      const vals = rows.map((r) => r.__ts ?? -Infinity)
      idx.sort((a, b) => (vals[a] - vals[b]) * (sort.dir === 'asc' ? 1 : -1))
    } else if (sort.key === 'mttr') {
      const vals = rows.map((r) => r.__mttr ?? -Infinity)
      idx.sort((a, b) => (vals[a] - vals[b]) * (sort.dir === 'asc' ? 1 : -1))
    }
    return idx
  }, [rows, sort])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageIdx = sortedIdx.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const pageRows = pageIdx.map((i) => tableRow(rows[i], schema))

  const toggleSort = (key) => {
    setPage(0)
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  const onExport = () => exportRowsToCsv(headers, rows, (fileName || 'data').replace(/\.csv$/i, '') + '-filtered.csv')

  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: BORDER }}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: INK }}>Data Tiket</h3>
          <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
            {fmtInt(rows.length)} baris cocok dengan filter · menampilkan {pageRows.length} baris per halaman
          </p>
        </div>
        <button
          onClick={onExport}
          disabled={!rows.length}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
          style={{ borderColor: BORDER, color: INK_2 }}
        >
          <Download size={14} /> Ekspor CSV tersaring
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Inbox size={26} style={{ color: MUTED }} />
          <p className="text-sm font-medium" style={{ color: INK_2 }}>Tidak ada baris yang cocok</p>
          <p className="text-xs" style={{ color: MUTED }}>Longgarkan filter untuk melihat data kembali.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border-t" style={{ borderColor: GRID }}>
            <table className="w-full min-w-[70rem] text-left text-xs">
              <thead>
                <tr style={{ background: '#fafaf9' }}>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap border-b px-3 py-2.5 font-semibold"
                      style={{ borderColor: GRID, color: INK_2 }}
                      aria-sort={c.sortable ? (sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                    >
                      {c.sortable ? (
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-black">
                          {c.label}
                          <ArrowUpDown size={11} className={sort.key === c.key ? 'opacity-100' : 'opacity-40'} />
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={pageIdx[i]} className="hover:bg-blue-50/40">
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        className="whitespace-nowrap border-b px-3 py-2 align-top"
                        style={{ borderColor: GRID, color: c.key === 'status' ? statusTone(r.status) : INK, fontVariantNumeric: c.key === 'mttr' || c.key === 'date' ? 'tabular-nums' : undefined, fontWeight: c.key === 'status' ? 600 : 400 }}
                      >
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" aria-label="Paginasi tabel">
            <p className="text-xs tabular-nums" style={{ color: MUTED }}>
              Halaman {fmtInt(safePage + 1)} dari {fmtInt(totalPages)}
            </p>
            <div className="flex items-center gap-1">
              {[
                { icon: ChevronsLeft, title: 'Halaman pertama', target: 0, disabled: safePage === 0 },
                { icon: ChevronLeft, title: 'Sebelumnya', target: safePage - 1, disabled: safePage === 0 },
                { icon: ChevronRight, title: 'Berikutnya', target: safePage + 1, disabled: safePage >= totalPages - 1 },
                { icon: ChevronsRight, title: 'Halaman terakhir', target: totalPages - 1, disabled: safePage >= totalPages - 1 },
              ].map(({ icon: Icon, title, target, disabled }, i) => (
                <button
                  key={title}
                  title={title}
                  aria-label={title}
                  disabled={disabled}
                  onClick={() => setPage(target)}
                  className="grid h-8 w-8 place-items-center rounded-md border transition hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  style={{ borderColor: BORDER, color: INK_2 }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
