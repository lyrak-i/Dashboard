import Papa from 'papaparse'

// Canonical field names → accepted header variants (compared case/space-insensitively).
export const FIELD_ALIASES = {
  nop: ['nop'],
  cluster: ['cluster'],
  severity: ['severity'],
  status: ['ticket status', 'status'],
  sla: ['sla'],
  date: ['dateoccured', 'date occurred', 'date occurred', 'tanggal', 'date'],
  mttr: ['mttr (hours)', 'mttr', 'mttr hours'],
  rootcause: ['rootcause category', 'kategori akar masalah'],
  rootcause1: ['rootcause 1'],
  ticketType: ['ticket type', 'tipe tiket'],
  siteName: ['site name'],
  site: ['site'],
  wo: ['wo ticket no', 'wo no'],
  pic: ['pic name', 'pic'],
  remarks: ['remarks'],
  duration: ['duration'],
  faultLevel: ['fault level'],
  isCheckin: ['is checkin'],
  inapNo: ['inap no'],
}

const normHeader = (h) => String(h ?? '').replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ')

/** Map canonical field → actual header present in the file (null when absent). */
export function detectSchema(headers) {
  const byNorm = new Map(headers.map((h) => [normHeader(h), h]))
  const schema = {}
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    let found = null
    for (const a of aliases) {
      if (byNorm.has(a)) { found = byNorm.get(a); break }
    }
    schema[key] = found
  }
  return schema
}

/**
 * Parse a DD-MM-YYYY HH:mm:ss (or ISO) timestamp to epoch ms.
 * The supplied export is DD-MM-YYYY; 25k+ rows have a day > 12, proving the order.
 */
export function parseDate(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const dmy = /^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s)
  if (dmy) {
    const ts = new Date(+dmy[3], +dmy[2] - 1, +dmy[1], +(dmy[4] || 0), +(dmy[5] || 0), +(dmy[6] || 0)).getTime()
    return Number.isNaN(ts) ? null : ts
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const ts = new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime()
    return Number.isNaN(ts) ? null : ts
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

/** Numeric parse tolerant of "1.08", "1,08", blanks and junk → number or null. */
export function parseNumber(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Strip BOM from the first header and trim all headers/keys of every row. */
function cleanHeaders(headers) {
  return headers.map((h) => String(h ?? '').replace(/^﻿/, '').trim())
}

/**
 * Parse a CSV File in the browser. Returns { rows, headers, schema, error }.
 * `rows` keep every original column plus precomputed `__ts` and `__mttr`.
 */
export function parseCsvFile(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => String(h ?? '').replace(/^﻿/, '').trim(),
      complete(results) {
        const headers = cleanHeaders(results.meta?.fields || [])
        if (!headers.length || !results.data.length) {
          resolve({ error: 'File tidak berisi baris data yang terbaca. Pastikan file CSV dengan baris judul.' })
          return
        }
        const schema = detectSchema(headers)
        const rows = results.data
        for (const row of rows) {
          row.__ts = schema.date ? parseDate(row[schema.date]) : null
          row.__mttr = schema.mttr ? parseNumber(row[schema.mttr]) : null
        }
        const errors = results.errors?.slice(0, 3).map((e) => e.message) || []
        resolve({ rows, headers, schema, errors, rowCount: rows.length, fileName: file.name })
      },
      error(err) {
        resolve({ error: `Gagal membaca file: ${err?.message || 'tidak diketahui'}` })
      },
    })
  })
}

/** Export filtered rows back to CSV (delimiter matched to the source file). */
export function exportRowsToCsv(headers, rows, fileName = 'data-filter.csv') {
  const out = Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? '')) }, { delimiter: ';' })
  const blob = new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
