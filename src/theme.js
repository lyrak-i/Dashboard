// Design tokens — validated light-mode palette (dataviz skill reference palette).
// Light chart surface #fcfcfb; series hues validated for CVD separation & contrast.

export const SURFACE = '#fcfcfb'      // chart/card surface
export const PAGE = '#f9f9f7'         // page plane
export const INK = '#0b0b0b'          // primary text
export const INK_2 = '#52514e'        // secondary text
export const MUTED = '#898781'        // axis / labels
export const GRID = '#e1e0d9'         // hairline grid
export const AXIS = '#c3c2b7'         // baseline
export const BORDER = 'rgba(11,11,11,0.10)'

// Categorical slots (fixed order, never cycled)
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
export const SERIES_1 = '#2a78d6'

// Status palette (reserved for state — never reused as a series color)
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
}

// Sequential blue ramp (magnitude / ordinal intensity)
export const SEQ = {
  250: '#86b6ef',
  350: '#5598e7',
  450: '#2a78d6',
  550: '#1c5cab',
  650: '#104281',
}

export const num = new Intl.NumberFormat('id-ID')
export const pct = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const hours = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtInt = (n) => num.format(Math.round(n ?? 0))
export const fmtPct = (n) => `${pct.format(n ?? 0)}%`
export const fmtHours = (n) => `${hours.format(n ?? 0)} jam`
export const fmtDateID = (ts) =>
  new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
