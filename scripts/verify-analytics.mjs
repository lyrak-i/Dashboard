// Verification harness: runs the app's real analytics code against a CSV file
// and prints the KPI baselines. Usage:
//   node scripts/verify-analytics.mjs path/to/KPI_DATA.csv
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { detectSchema, parseDate, parseNumber } from '../src/lib/csv.js'
import { applyFilters, buildTrend, computeKpis, countBy, INITIAL_FILTERS } from '../src/lib/analytics.js'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/verify-analytics.mjs <csv>')
  process.exit(1)
}

const t0 = Date.now()
const text = readFileSync(path, 'utf8')
const result = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' })
const headers = (result.meta.fields || []).map((h) => String(h).replace(/^﻿/, '').trim())
const schema = detectSchema(headers)
const rows = result.data
for (const r of rows) {
  r.__ts = schema.date ? parseDate(r[schema.date]) : null
  r.__mttr = schema.mttr ? parseNumber(r[schema.mttr]) : null
}
const tParse = Date.now() - t0

const kpis = computeKpis(rows, schema)
const filtered = applyFilters(rows, schema, INITIAL_FILTERS)
const trend = buildTrend(rows)
const sla = countBy(rows, schema.sla)
const status = countBy(rows, schema.status)

console.log('schema.date  =', schema.date)
console.log('schema.mttr  =', schema.mttr)
console.log('schema.status=', schema.status)
console.log('rows         =', rows.length)
console.log('filtered     =', filtered.length)
console.log('total KPI    =', kpis.total)
console.log('open KPI     =', kpis.open, `(${kpis.openPct.toFixed(2)}%)`)
console.log('SLA          =', kpis.slaPct?.toFixed(2) + '%', `IN=${kpis.inSla} OUT=${kpis.outSla}`)
console.log('MTTR avg     =', kpis.mttrAvg?.toFixed(2), `n=${kpis.mttrN} median=${kpis.mttrMedian?.toFixed(2)}`)
console.log('sites        =', kpis.sites)
console.log('trend        =', trend.granularity, `${trend.data.length} points, first=${trend.data[0]?.label}=${trend.data[0]?.count}, last=${trend.data.at(-1)?.label}=${trend.data.at(-1)?.count}`)
console.log('sla buckets  =', JSON.stringify(sla))
console.log('status top   =', JSON.stringify(status.slice(0, 3)))
console.log(`parse ${tParse}ms total ${Date.now() - t0}ms`)
