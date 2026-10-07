import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Ticket, ShieldAlert, Timer, Clock, FilterX, MapPin, Calendar, Layers, AlertTriangle, Map, Activity,
} from 'lucide-react'
import {
  applyFilters, buildTrend, computeKpis, countBy, distinctValues, sortSeverity, topN,
  INITIAL_FILTERS, activeFilterCount,
} from '../lib/analytics'
import { Card, ChartView, KpiCard, Select, fmtPct1 } from './ui'
import { fmtInt } from '../theme'
import DataTable from './DataTable'
import {
  CATEGORICAL, SERIES_1, STATUS, INK, INK_2, MUTED, GRID, AXIS, BORDER, SURFACE,
} from '../theme'

/* ---------- chart chrome ---------- */

const axisProps = {
  stroke: AXIS,
  tick: { fill: MUTED, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: AXIS },
}

const tooltipStyle = {
  contentStyle: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    fontSize: 12,
    color: INK,
    boxShadow: '0 8px 24px rgba(11,11,11,0.10)',
    padding: '8px 11px',
  },
  labelStyle: { color: INK_2, fontWeight: 600, marginBottom: 4 },
  itemStyle: { padding: '1px 0' },
  cursor: { stroke: AXIS, strokeWidth: 1, strokeDasharray: '4 4' },
}

function EmptyHint({ children }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 text-center">
      <Layers size={22} style={{ color: MUTED }} />
      <p className="text-sm font-medium" style={{ color: INK_2 }}>{children}</p>
    </div>
  )
}

/* ---------- Dashboard ---------- */

export default function Dashboard({ data }) {
  const { rows, schema, headers, fileName } = data
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  // Filter vocabulary computed once per dataset.
  const options = useMemo(
    () => ({
      nop: distinctValues(rows, schema.nop),
      cluster: distinctValues(rows, schema.cluster),
      severity: sortSeverity(countBy(rows, schema.severity)).map((d) => d.name),
      status: distinctValues(rows, schema.status),
      sla: distinctValues(rows, schema.sla),
    }),
    [rows, schema],
  )

  const filtered = useMemo(() => applyFilters(rows, schema, filters), [rows, schema, filters])
  const kpis = useMemo(() => computeKpis(filtered, schema), [filtered, schema])

  const trend = useMemo(() => buildTrend(filtered), [filtered])
  const statusData = useMemo(() => countBy(filtered, schema.status), [filtered, schema])
  const severityData = useMemo(() => sortSeverity(countBy(filtered, schema.severity)), [filtered, schema])
  const slaData = useMemo(
    () => countBy(filtered, schema.sla).filter((d) => d.name === 'IN SLA' || d.name === 'OUT SLA'),
    [filtered, schema],
  )
  const rootData = useMemo(
    () => topN(countBy(filtered, schema.rootcause, { mapLabel: 'Belum diisi', ignoreEmpty: false }), 6),
    [filtered, schema],
  )
  const clusterData = useMemo(() => topN(countBy(filtered, schema.cluster), 8), [filtered, schema])
  const nopData = useMemo(() => countBy(filtered, schema.nop), [filtered, schema])

  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }))
  const resetFilters = () => setFilters(INITIAL_FILTERS)
  const activeCount = activeFilterCount(filters)

  const hasTrend = trend.data.length > 0
  const hasSla = slaData.length > 0
  const slaColors = { 'IN SLA': STATUS.good, 'OUT SLA': STATUS.critical }

  return (
    <div className="space-y-5">
      {/* ---------- filter bar ---------- */}
      <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
            <Calendar size={13} /> Rentang
          </span>
          <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: BORDER }}>
            <span className="text-xs font-medium" style={{ color: INK_2 }}>Dari</span>
            <input
              type="date" value={filters.from} max={filters.to || undefined}
              onChange={(e) => set('from')(e.target.value)}
              className="bg-transparent text-xs outline-none" style={{ color: INK }}
              aria-label="Tanggal mulai"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: BORDER }}>
            <span className="text-xs font-medium" style={{ color: INK_2 }}>Sampai</span>
            <input
              type="date" value={filters.to} min={filters.from || undefined}
              onChange={(e) => set('to')(e.target.value)}
              className="bg-transparent text-xs outline-none" style={{ color: INK }}
              aria-label="Tanggal akhir"
            />
          </label>

          <span className="mx-1 hidden h-6 w-px sm:block" style={{ background: GRID }} />

          <Select label="NOP" value={filters.nop} options={options.nop} onChange={set('nop')} icon={Map} />
          <Select label="Cluster" value={filters.cluster} options={options.cluster} onChange={set('cluster')} icon={Layers} />
          <Select label="Severity" value={filters.severity} options={options.severity} onChange={set('severity')} icon={AlertTriangle} />
          <Select label="Status" value={filters.status} options={options.status} onChange={set('status')} icon={Activity} />
          <Select label="SLA" value={filters.sla} options={options.sla} onChange={set('sla')} icon={ShieldAlert} />

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs tabular-nums" style={{ color: MUTED }}>
              {fmtInt(filtered.length)} / {fmtInt(rows.length)} baris
            </span>
            <button
              onClick={resetFilters}
              disabled={!activeCount}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
              style={{ borderColor: BORDER, color: INK_2 }}
            >
              <FilterX size={14} /> Reset{activeCount ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- KPI row ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Ticket}
          label="Total Tiket"
          value={fmtInt(kpis.total)}
          sub={kpis.sites ? `${fmtInt(kpis.sites)} site unik` : undefined}
          hint="Seluruh baris yang cocok dengan filter"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Kepatuhan SLA"
          value={kpis.slaPct == null ? '—' : fmtPct1(kpis.slaPct)}
          sub={kpis.inSla + kpis.outSla ? `${fmtInt(kpis.inSla)} IN · ${fmtInt(kpis.outSla)} OUT` : 'Tidak ada data SLA'}
          hint="IN SLA ÷ (IN SLA + OUT SLA)"
        />
        <KpiCard
          icon={Timer}
          label="MTTR Rata-rata"
          value={kpis.mttrAvg == null ? '—' : `${kpis.mttrAvg.toFixed(2).replace('.', ',')} jam`}
          sub={kpis.mttrMedian != null ? `Median ${kpis.mttrMedian.toFixed(2).replace('.', ',')} jam` : undefined}
          hint={`Tiket CLOSED saja · n=${fmtInt(kpis.mttrN)}`}
        />
        <KpiCard
          icon={Clock}
          label="Tiket Terbuka"
          value={fmtInt(kpis.open)}
          sub={`${fmtPct1(kpis.openPct)} dari total`}
          hint="Status selain CLOSED / RESOLVED"
        />
      </div>

      {/* ---------- trend (full width) ---------- */}
      <Card
        title="Tren Volume Tiket"
        subtitle={`Dikelompokkan per ${trend.granularity} · ${fmtInt(trend.data.length)} titik data`}
        headerAfter={
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: '#eff6ff', color: '#1c5cab' }}>
            {trend.granularity === 'hari' ? 'Harian' : 'Bulanan'}
          </span>
        }
      >
        <ChartView
          rows={trend.data}
          columns={[
            { key: 'label', label: 'Periode' },
            { key: 'count', label: 'Jumlah Tiket', render: (r) => fmtInt(r.count) },
          ]}
          emptyText="Tidak ada baris bertanggal pada filter ini."
        >
          {hasTrend && (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend.data} margin={{ top: 8, right: 14, bottom: 4, left: -8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} interval="preserveStartEnd" />
                <YAxis {...axisProps} tickFormatter={(v) => fmtInt(v)} width={54} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} />
                <Line
                  type="monotone" dataKey="count" name="Jumlah tiket"
                  stroke={SERIES_1} strokeWidth={2} dot={false}
                  activeDot={{ r: 4.5, strokeWidth: 2, stroke: SURFACE, fill: SERIES_1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartView>
      </Card>

      {/* ---------- status + SLA ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Sebaran Status Tiket" subtitle="Perbandingan jumlah tiket per status">
          <ChartView
            rows={statusData}
            columns={[{ key: 'name', label: 'Status' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barCategoryGap="28%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} tick={{ fill: MUTED, fontSize: 10 }} interval={0} angle={-24} textAnchor="end" height={64} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtInt(v)} width={54} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                  {statusData.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartView>
        </Card>

        <Card title="Kepatuhan SLA" subtitle="IN SLA dibanding OUT SLA">
          <ChartView
            rows={slaData}
            columns={[{ key: 'name', label: 'SLA' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
            emptyText="Kolom SLA tidak ditemukan pada file ini."
          >
            {hasSla && (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                <div className="relative h-[210px] w-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={slaData} dataKey="value" nameKey="name"
                        innerRadius="66%" outerRadius="100%" paddingAngle={2}
                        stroke={SURFACE} strokeWidth={2} startAngle={90} endAngle={-270}
                      >
                        {slaData.map((d) => <Cell key={d.name} fill={slaColors[d.name] || SERIES_1} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(v, n) => [fmtInt(v), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tabular-nums" style={{ color: INK }}>
                      {kpis.slaPct == null ? '—' : `${kpis.slaPct.toFixed(1)}%`}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: MUTED }}>kepatuhan</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {slaData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2.5" style={{ color: INK }}>
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: slaColors[d.name] || SERIES_1 }} />
                      <span className="font-medium">{d.name}</span>
                      <span className="tabular-nums" style={{ color: MUTED }}>{fmtInt(d.value)}</span>
                      <span className="tabular-nums text-xs" style={{ color: MUTED }}>
                        {slaData.reduce((s, x) => s + x.value, 0)
                          ? `${((d.value / slaData.reduce((s, x) => s + x.value, 0)) * 100).toFixed(1)}%` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartView>
        </Card>
      </div>

      {/* ---------- severity + rootcause + cluster ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Severity" subtitle="Kelas keparahan tiket">
          <ChartView
            rows={severityData}
            columns={[{ key: 'name', label: 'Severity' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={severityData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barCategoryGap="26%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtInt(v)} width={54} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                  {severityData.map((d, i) => <Cell key={d.name} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartView>
        </Card>

        <Card title="Akar Masalah" subtitle="6 kategori teratas, sisanya digabung">
          <ChartView
            rows={rootData}
            columns={[{ key: 'name', label: 'Akar Masalah' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rootData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap="26%">
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtInt(v)} height={24} />
                <YAxis type="category" dataKey="name" {...axisProps} width={110} tick={{ fill: MUTED, fontSize: 10 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                <Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>
                  {rootData.map((d, i) => <Cell key={d.name} fill={d.isOther ? MUTED : CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartView>
        </Card>

        <Card title="Tiket per Cluster" subtitle="8 cluster teratas, sisanya digabung" className="lg:col-span-2 xl:col-span-1">
          <ChartView
            rows={clusterData}
            columns={[{ key: 'name', label: 'Cluster' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={clusterData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap="26%">
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtInt(v)} height={24} />
                <YAxis type="category" dataKey="name" {...axisProps} width={140} tick={{ fill: MUTED, fontSize: 10 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                <Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>
                  {clusterData.map((d, i) => <Cell key={d.name} fill={d.isOther ? MUTED : CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartView>
        </Card>
      </div>

      {nopData.length > 0 && (
        <Card title="Tiket per NOP" subtitle="Regional operations point">
          <ChartView
            rows={nopData}
            columns={[{ key: 'name', label: 'NOP' }, { key: 'value', label: 'Jumlah', render: (r) => fmtInt(r.value) }]}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nopData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barCategoryGap="30%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtInt(v)} width={54} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtInt(v), 'Jumlah tiket']} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                  {nopData.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartView>
        </Card>
      )}

      {/* ---------- raw rows ---------- */}
      <DataTable rows={filtered} schema={schema} headers={headers} fileName={fileName} />
    </div>
  )
}
