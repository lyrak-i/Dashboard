import { parseDate, parseNumber } from './csv.js'

// ---------- Filter vocabulary helpers ----------

const val = (row, col) => (col ? String(row[col] ?? '').trim() : '')

/** Unique sorted values of a filter column across the whole dataset. */
export function distinctValues(rows, col) {
  if (!col) return []
  const set = new Set()
  for (const r of rows) {
    const v = val(r, col)
    if (v) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'id'))
}

export const OPEN_STATUSES = new Set(['CLOSED', 'RESOLVED', 'SELESAI', 'CLOSE', 'CLOSE DONE'])

export const INITIAL_FILTERS = { nop: '', cluster: '', severity: '', status: '', sla: '', from: '', to: '' }

function tsOf(fromISO, rows, mode) {
  if (fromISO) {
    const t = parseDate(fromISO)
    if (t != null) return mode === 'end' ? t + 86399999 : t
  }
  let best = mode === 'end' ? 0 : Infinity
  for (const r of rows) {
    if (r.__ts == null) continue
    if (mode === 'end' ? r.__ts > best : r.__ts < best) best = r.__ts
  }
  return mode === 'end' ? (best === 0 ? null : best) : best === Infinity ? null : best
}

export function applyFilters(rows, schema, filters) {
  const fromTs = tsOf(filters.from, rows, 'start')
  const toTs = tsOf(filters.to, rows, 'end')
  return rows.filter((r) => {
    if (filters.nop && val(r, schema.nop) !== filters.nop) return false
    if (filters.cluster && val(r, schema.cluster) !== filters.cluster) return false
    if (filters.severity && val(r, schema.severity) !== filters.severity) return false
    if (filters.status && val(r, schema.status) !== filters.status) return false
    if (filters.sla && val(r, schema.sla) !== filters.sla) return false
    if (fromTs != null || toTs != null) {
      if (r.__ts == null) return false // rows outside the date window are excluded
      if (fromTs != null && r.__ts < fromTs) return false
      if (toTs != null && r.__ts > toTs) return false
    }
    return true
  })
}

export function activeFilterCount(filters) {
  return Object.values(filters).filter(Boolean).length
}

// ---------- KPI ----------

export function computeKpis(rows, schema) {
  const total = rows.length
  let open = 0
  let inSla = 0
  let outSla = 0
  let mttrSum = 0
  let mttrN = 0
  const sites = new Set()
  const mttrAll = []

  for (const r of rows) {
    const st = val(r, schema.status).toUpperCase()
    if (st && !OPEN_STATUSES.has(st)) open++ // anything not CLOSED/RESOLVED is open

    const sla = val(r, schema.sla).toUpperCase()
    if (sla === 'IN SLA') inSla++
    else if (sla === 'OUT SLA') outSla++

    if (schema.site) {
      const s = val(r, schema.site)
      if (s) sites.add(s)
    }

    const m = r.__mttr
    if (m != null && m >= 0) {
      mttrAll.push(m)
      if (st === 'CLOSED' || st === 'SELESAI') {
        mttrSum += m
        mttrN++
      }
    }
  }

  mttrAll.sort((a, b) => a - b)
  const median = mttrAll.length ? mttrAll[Math.floor(mttrAll.length / 2)] : null

  return {
    total,
    open,
    openPct: total ? (open / total) * 100 : 0,
    inSla,
    outSla,
    slaPct: inSla + outSla ? (inSla / (inSla + outSla)) * 100 : null,
    mttrAvg: mttrN ? mttrSum / mttrN : null,
    mttrN,
    mttrMedian: median,
    sites: sites.size,
  }
}

// ---------- Trend ----------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function dailyBuckets(rows) {
  const map = new Map()
  for (const r of rows) {
    if (r.__ts == null) continue
    const d = new Date(r.__ts)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [y, m, dd] = key.split('-').map(Number)
      return { key, label: `${dd} ${MONTH_NAMES[m - 1]}`, count, sortKey: key }
    })
}

function monthlyBuckets(rows) {
  const map = new Map()
  for (const r of rows) {
    if (r.__ts == null) continue
    const d = new Date(r.__ts)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [y, m] = key.split('-').map(Number)
      return { key, label: `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`, count, sortKey: key }
    })
}

/** Volume over time. > 62 distinct days → monthly, otherwise daily. */
export function buildTrend(rows) {
  const days = new Set()
  for (const r of rows) {
    if (r.__ts == null) continue
    const d = new Date(r.__ts)
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }
  return days.size > 62 ? { granularity: 'bulan', data: monthlyBuckets(rows) } : { granularity: 'hari', data: dailyBuckets(rows) }
}

// ---------- Categorical counts ----------

/**
 * Count occurrences of a column. `mapLabel` (e.g. "Belum diisi") labels blanks,
 * `pick` can pre-normalise a value. Returns [{ name, value }] sorted desc.
 */
export function countBy(rows, col, { pick, mapLabel, ignoreEmpty } = {}) {
  if (!col) return []
  const map = new Map()
  for (const r of rows) {
    let v = String(r[col] ?? '').trim()
    if (!v) {
      if (ignoreEmpty) continue
      if (mapLabel) v = mapLabel
      else continue
    }
    if (pick) v = pick(v) || v
    map.set(v, (map.get(v) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'id'))
}

/** Keep the top `max` categories and fold the rest into "Lainnya". */
export function topN(data, max, otherLabel = 'Lainnya') {
  if (data.length <= max) return data
  const head = data.slice(0, max)
  const rest = data.slice(max).reduce((s, d) => s + d.value, 0)
  if (rest > 0) head.push({ name: otherLabel, value: rest, isOther: true })
  return head
}

// ---------- Severity ordering (Low → Critical) ----------

export const SEVERITY_ORDER = { low: 0, 'very low': 1, minor: 2, major: 3, critical: 4 }
export function sortSeverity(data) {
  return data.map((d, i) => ({ ...d, _o: SEVERITY_ORDER[d.name.trim().toLowerCase()] ?? i }))
    .sort((a, b) => a._o - b._o)
    .map(({ _o, ...d }) => d)
}

// ---------- Table ----------

/** Map a raw row onto the visible table columns; shows em-dashes for missing schema. */
export function tableRow(row, schema) {
  const c = (k) => (schema[k] ? row[schema[k]] ?? '' : null)
  return {
    date: row.__ts,
    wo: c('wo'),
    siteName: c('siteName'),
    nop: c('nop'),
    cluster: c('cluster'),
    status: c('status'),
    severity: c('severity'),
    sla: c('sla'),
    mttr: row.__mttr,
    rootcause1: c('rootcause1'),
    pic: c('pic'),
    remarks: c('remarks'),
    faultLevel: c('faultLevel'),
    ticketType: c('ticketType'),
    raw: row,
  }
}
