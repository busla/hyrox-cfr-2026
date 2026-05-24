// HYROX CFR — shared design tokens
export const T = {
  // Core brand
  yellow:    '#ffed00',
  yellowDim: 'rgba(255,237,0,0.12)',
  black:     '#000000',
  dark2:     '#111111',
  dark3:     '#1a1a1a',
  border:    '#1e1e1e',
  gray:      '#999999',
  grayDim:   '#555555',
  white:     '#ffffff',
  font:      "'Barlow Condensed', system-ui, sans-serif",

  // Division colors (kept vivid for chart legibility)
  proKK:   '#ffed00',
  openKK:  '#60a5fa',
  proKVK:  '#f472b6',
  openKVK: '#c084fc',
  mixed:   '#4ade80',
  neutral: '#555555',

  // Reusable style objects
  card: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderLeft: '4px solid #ffed00',
    padding: '20px',
    color: '#ffffff',
    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
  },
  tooltip: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderLeft: '3px solid #ffed00',
    borderRadius: 0,
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: 13,
    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#ffffff',
    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
  },
  subTitle: {
    color: '#555555',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 16,
    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
  },
  rankCard: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderRadius: 0,
    padding: '14px 16px',
  },
  chartArea: {
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: 0,
    padding: 12,
  },
}

// Division color map for charts
export const DIVISION_COLORS = {
  'Pro KK':   T.proKK,
  'Open KK':  T.openKK,
  'Pro KVK':  T.proKVK,
  'Open KVK': T.openKVK,
  'PRO KK':   T.proKK,
  'OPEN KK':  T.openKK,
  'PRO KVK':  T.proKVK,
  'OPEN KVK': T.openKVK,
  MIXED:      T.mixed,
  default:    T.neutral,
}
