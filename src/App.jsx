import { useCallback, useMemo, useState } from 'react'
import { Activity, FileSpreadsheet, Github, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react'
import CsvUploader from './components/CsvUploader'
import Dashboard from './components/Dashboard'
import Papa from 'papaparse'
import { detectSchema, parseDate, parseNumber } from './lib/csv'
import { INK, INK_2, MUTED, BORDER, fmtInt } from './theme'

const REQUIRED_HINTS = [
  ['status', 'Ticket Status / Status'],
  ['date', 'DateOccured / Date'],
]

function SchemaHint({ data }) {
  const schema = data?.schema
  if (!schema) return null
  const missing = REQUIRED_HINTS.filter(([key]) => !schema[key]).map(([, label]) => label)
  const countMetrics = [schema.status, schema.sla, schema.severity, schema.mttr, schema.date].filter(Boolean).length
  if (!missing.length && countMetrics >= 3) return null
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <span className="mt-0.5 shrink-0">ⓘ</span>
      <p>
        Kolom yang dikenali: <strong>{countMetrics} / 5 metrik dasar</strong>.
        {missing.length > 0 && <> Tidak ditemukan: {missing.join(', ')}.</>}
        {' '}Grafik atau KPI yang memerlukan kolom tersebut tidak akan ditampilkan secara valid.
      </p>
    </div>
  )
}

function Welcome({ onLoadSample, loading }) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: BORDER }}>
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <UploadCloud size={27} />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight" style={{ color: INK }}>Mulai dengan file CSV Anda</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: INK_2 }}>
          Unggah ekspor tiket untuk melihat tren, kepatuhan SLA, waktu penyelesaian, distribusi severity, dan banyak lagi.
          Semua pemrosesan berlangsung di peramban Anda.
        </p>
        <button
          onClick={onLoadSample}
          disabled={loading}
          className="mt-4 text-xs font-semibold text-blue-700 underline underline-offset-4 transition hover:text-blue-900 disabled:opacity-50"
        >
          {loading ? 'Memuat contoh…' : 'Belum punya file? Muat contoh data demo'}
        </button>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          {[
            { icon: Activity, title: 'Analitik otomatis', body: 'Ringkasan KPI & grafik dibuat dari kolom CSV.' },
            { icon: ShieldCheck, title: 'Privat & lokal', body: 'File tidak dikirim ke server mana pun.' },
            { icon: FileSpreadsheet, title: 'Data besar', body: 'Puluhan ribu baris tetap responsif.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border p-3" style={{ borderColor: BORDER }}>
              <Icon size={17} style={{ color: '#2a78d6' }} />
              <p className="mt-2 text-xs font-semibold" style={{ color: INK }}>{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: MUTED }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [sampleLoading, setSampleLoading] = useState(false)

  const handleParsed = useCallback((parsed) => {
    setData(parsed)
  }, [])

  const handleReset = useCallback(() => {
    setData(null)
  }, [])

  const loadSample = async () => {
    setSampleLoading(true)
    try {
      const response = await fetch('/sample.csv')
      if (!response.ok) throw new Error('sample unavailable')
      const text = await response.text()
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' })
      const headers = (result.meta?.fields || []).map((h) => String(h).replace(/^﻿/, '').trim())
      const schema = detectSchema(headers)
      const rows = result.data
      rows.forEach((r) => {
        r.__ts = schema.date ? parseDate(r[schema.date]) : null
        r.__mttr = schema.mttr ? parseNumber(r[schema.mttr]) : null
      })
      setData({ rows, headers, schema, rowCount: rows.length, fileName: 'sample.csv', errors: [] })
    } catch {
      // No bundled customer data; report this without breaking the empty state.
      window.alert('Contoh data belum tersedia. Silakan unggah file CSV Anda.')
    } finally {
      setSampleLoading(false)
    }
  }

  const currentYear = useMemo(() => new Date().getFullYear(), [])

  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa', color: INK }}>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white"><Activity size={18} /></span>
            <div>
              <p className="text-sm font-bold leading-tight tracking-tight" style={{ color: INK }}>Ops<span className="text-blue-600">Metrics</span></p>
              <p className="hidden text-[10px] leading-tight sm:block" style={{ color: MUTED }}>Dasbor KPI tiket & alarm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 sm:flex"><ShieldCheck size={11} /> Lokal & privat</span>
            <span className="rounded-full border px-2 py-1 text-[10px] font-medium" style={{ borderColor: BORDER, color: MUTED }}>CSV analytics</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#1c5cab' }}>
              <Sparkles size={12} /> Operations analytics
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: INK }}>Dasbor Kinerja Tiket</h1>
            <p className="mt-1 max-w-xl text-sm" style={{ color: INK_2 }}>
              Pantau volume insiden, kecepatan penyelesaian, dan kepatuhan SLA dalam satu tampilan.
            </p>
          </div>
          {data && <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:self-auto"><ShieldCheck size={13} /> {fmtInt(data.rowCount)} baris dimuat</span>}
        </section>

        <CsvUploader data={data} onParsed={handleParsed} onReset={handleReset} />

        {data ? (
          <>
            <SchemaHint data={data} />
            <Dashboard key={data.fileName + data.rowCount} data={data} />
          </>
        ) : (
          <Welcome onLoadSample={loadSample} loading={sampleLoading} />
        )}

        <footer className="flex flex-col items-center justify-between gap-2 border-t pt-4 text-[11px] sm:flex-row" style={{ borderColor: BORDER, color: MUTED }}>
          <p>© {currentYear} OpsMetrics · Analitik berjalan sepenuhnya di sisi klien</p>
          <p className="inline-flex items-center gap-1"><ShieldCheck size={11} /> File CSV Anda tidak pernah meninggalkan perangkat ini</p>
        </footer>
      </main>
    </div>
  )
}
