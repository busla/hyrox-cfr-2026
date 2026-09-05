/**
 * Reading results off timataka.net/hyrox2026.
 *
 * Everything that knows about timataka's HTML lives here. The parser is driven
 * by each table's <thead> rather than by column positions, and it refuses to
 * guess: an unfamiliar header layout or a row it cannot classify throws, so a
 * change on timataka's side surfaces as a loud failure instead of silently
 * missing competitors.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(HERE, '..', '..')
export const DATA_PATH = join(REPO_ROOT, 'src', 'data.json')
export const CACHE_DIR = join(REPO_ROOT, '.cache', 'timataka')

export const BASE_URL = 'https://timataka.net/hyrox2026/'

/** The eight HYROX stations, in order, exactly as timataka labels them. */
export const STATION_KEYS = [
  '1. Ski-Erg',
  '2 .Ýta sleða',
  '3. Draga sleða',
  '4. Burpee langstökk',
  '5. Róður',
  '6. Bændaganga',
  '7. Lunges',
  '8. Wall Balls',
]

/** Division labels we expect, keyed by their lowercased form. */
export const DIVISIONS = {
  'pro kk': 'Pro KK',
  'pro kvk': 'Pro KVK',
  'open kk': 'Open KK',
  'open kvk': 'Open KVK',
  mixed: 'MIXED',
}

/**
 * The series. Individual races are served from /urslit/, pair races from
 * /hyrox/ — same table markup, different endpoint.
 */
export const SERIES = {
  name: 'HYROX mótaröðin 2026',
  organizer: 'Crossfit Reykjavík',
  events: [
    {
      id: 'mot1',
      name: '1. mót — 23. maí',
      date: '2026-05-23',
      races: {
        einstaklingar: { endpoint: 'urslit', race: 2 },
        para: { endpoint: 'hyrox', race: 1 },
      },
    },
    {
      id: 'mot2',
      name: '2. mót — 11. júlí',
      date: '2026-07-11',
      races: {
        einstaklingar: { endpoint: 'urslit', race: 8 },
        para: { endpoint: 'hyrox', race: 4 },
      },
    },
    {
      id: 'mot3',
      name: '3. mót — 5. september',
      date: '2026-09-05',
      races: {
        einstaklingar: { endpoint: 'urslit', race: 32 },
        para: { endpoint: 'hyrox', race: 16 },
      },
    },
  ],
}

/**
 * data.json subcategory -> timataka `cat` parameter. "overall" is the
 * Heildarúrslit page; it is the authority on who took part, and the category
 * pages must add up to it.
 */
export const SUBCATEGORIES = {
  einstaklingar: { overall: 'overall', karlar: 'm', konur: 'f' },
  para: { overall: 'overall', karlar: 'm', konur: 'f', blandað: 'mixed' },
}

export const CATEGORIES = Object.keys(SUBCATEGORIES)

/**
 * Which gender listing a division belongs to. The division filter needs both
 * `cat` and `division`; getting the pair wrong yields an empty page rather than
 * an error, which is exactly how timataka's own "Parakeppni KVK OPEN" link is
 * broken (it asks for cat=f with division="Open KK" and returns nothing). We
 * build these URLs ourselves rather than trusting the links on the index page.
 */
export const DIVISION_LISTING = {
  'Pro KK': 'm',
  'Open KK': 'm',
  'Pro KVK': 'f',
  'Open KVK': 'f',
  MIXED: 'mixed',
}

/** data.json subcategory a division should be listed under. */
export const DIVISION_SUBCATEGORY = {
  'Pro KK': 'karlar',
  'Open KK': 'karlar',
  'Pro KVK': 'konur',
  'Open KVK': 'konur',
  MIXED: 'blandað',
}

export function pageUrl(event, category, subcategory) {
  const { endpoint, race } = event.races[category]
  const cat = SUBCATEGORIES[category][subcategory]
  const params = new URLSearchParams({ race: String(race), cat })
  // The mixed listing is only reachable through the division filter.
  if (cat === 'mixed') {
    params.set('age_from', '10')
    params.set('age_to', '99')
    params.set('division', 'MIXED')
  }
  return `${BASE_URL}${endpoint}/?${params}`
}

/** URL of the division-filtered listing ("Einstaklingar KK PRO" and friends). */
export function divisionPageUrl(event, category, division) {
  const { endpoint, race } = event.races[category]
  const cat = DIVISION_LISTING[division]
  if (!cat) throw new Error(`No listing known for division "${division}"`)
  const params = new URLSearchParams({
    race: String(race),
    cat,
    age_from: '10',
    age_to: '99',
    division,
  })
  return `${BASE_URL}${endpoint}/?${params}`
}

/* ── HTML helpers ───────────────────────────────────────────────────────── */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ENTITIES[name])
}

/** Cell text with <br> preserved as newlines (team members, split lists). */
function cellText(html) {
  return decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
}

const TABLE_RE = /<table[^>]*>([\s\S]*?)<\/table>/g
const THEAD_RE = /<thead>([\s\S]*?)<\/thead>/
const TBODY_RE = /<tbody>([\s\S]*?)<\/tbody>/
const ROW_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/g
const CELL_RE = /<td[^>]*>([\s\S]*?)<\/td>/g
const HEAD_CELL_RE = /<th[^>]*>([\s\S]*?)<\/th>/g

export function hmsToSeconds(text) {
  const parts = text.split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n))) throw new Error(`Bad time: ${text}`)
  while (parts.length < 3) parts.unshift(0)
  const [h, m, s] = parts
  return h * 3600 + m * 60 + s
}

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/

/* ── Table shapes ───────────────────────────────────────────────────────── */

/**
 * The two table layouts timataka serves on a results page, identified by their
 * header row. `results` carries finishers (and sometimes a competitor with an
 * empty time); `dnf` is the separate table of non-finishers that appears below
 * the results on some races.
 */
const LAYOUTS = [
  {
    shape: 'results',
    category: 'einstaklingar',
    headers: ['Rank', 'BIB', 'Contestant', 'Division', 'Team', 'Club', 'Split', 'Time'],
  },
  {
    shape: 'results',
    category: 'para',
    headers: ['Rank', 'BIB', 'Team', 'Division', 'Members', 'Club', 'Split', 'Time'],
  },
  {
    shape: 'dnf',
    category: 'einstaklingar',
    headers: ['BIB', 'Contestant', 'Division', 'Team', 'Club'],
  },
  {
    shape: 'dnf',
    category: 'para',
    headers: ['BIB', 'Team', 'Division', 'Members', 'Club'],
  },
]

function matchLayout(headers) {
  // Trailing unlabelled columns (chip time, status) vary; match on the named ones.
  const named = headers.filter((h) => h !== '')
  return LAYOUTS.find(
    (l) => l.headers.length === named.length && l.headers.every((h, i) => h === named[i]),
  )
}

/* ── Parsing ────────────────────────────────────────────────────────────── */

function parseSplits(text) {
  const runs = []
  const stations = {}
  for (const m of text.matchAll(/(\d{1,2}:\d{2}:\d{2})\s*\(([^)]+)\)/g)) {
    const seconds = hmsToSeconds(m[1])
    const label = m[2].trim()
    if (label === 'Hlaup') runs.push(seconds)
    else stations[label] = seconds
  }
  return { runs, stations }
}

function buildRecord({ layout, cells, headerCount }) {
  const isPara = layout.category === 'para'
  const at = (name) => {
    const idx = layout.headers.indexOf(name)
    return idx === -1 ? '' : (cells[idx] ?? '')
  }

  // "Team" means the club for an individual and the team name for a pair.
  const teamCell = at('Team')
  const name = isPara ? at('Members') : at('Contestant')
  const club = isPara ? teamCell : teamCell

  const record = {
    rank: null,
    bib: at('BIB'),
    name,
    club,
    division: DIVISIONS[at('Division').trim().toLowerCase()] ?? at('Division').trim(),
    total_time: null,
    total_seconds: 0,
    run_total: 0,
    station_total: 0,
    splits: {},
    run_times: [],
  }

  if (layout.shape === 'results') {
    const rank = at('Rank')
    const totalTime = at('Time').split('\n')[0].trim()
    if (TIME_RE.test(totalTime)) {
      const { runs, stations } = parseSplits(at('Split'))
      record.rank = /^\d+$/.test(rank) ? Number(rank) : null
      record.total_time = totalTime
      record.total_seconds = hmsToSeconds(totalTime)
      record.run_total = runs.reduce((a, b) => a + b, 0)
      record.station_total = Object.values(stations).reduce((a, b) => a + b, 0)
      record.splits = stations
      record.run_times = runs
    } else if (totalTime === '') {
      record.status = 'DNF' // started, no finish time recorded
    } else {
      throw new Error(`Unrecognised time cell: ${JSON.stringify(at('Time'))}`)
    }
  } else {
    // The DNF table puts the status in the trailing unlabelled column.
    const status = (cells[headerCount - 1] ?? cells[cells.length - 1] ?? '').trim()
    record.status = status.toUpperCase() || 'DNF'
  }

  if (isPara) {
    record.members = at('Members').split('\n').filter(Boolean)
    record.team_name = teamCell
    record.display_name = teamCell
  }

  // Key order matters only for a readable data.json diff; rebuild it here.
  const { status, members, team_name, display_name, ...rest } = record
  return {
    rank: rest.rank,
    bib: rest.bib,
    name: rest.name,
    club: rest.club,
    division: rest.division,
    total_time: rest.total_time,
    total_seconds: rest.total_seconds,
    ...(status ? { status } : {}),
    run_total: rest.run_total,
    station_total: rest.station_total,
    splits: rest.splits,
    run_times: rest.run_times,
    ...(isPara ? { members, team_name, display_name } : {}),
  }
}

/**
 * Parse one results page.
 *
 * Returns every row on the page — finishers and non-finishers alike — plus the
 * counts needed to prove nothing was dropped.
 */
export function parsePage(html, { url = '' } = {}) {
  const records = []
  let rawRows = 0
  let tables = 0
  let category = null

  for (const table of html.matchAll(TABLE_RE)) {
    const inner = table[1]
    const head = THEAD_RE.exec(inner)
    const body = TBODY_RE.exec(inner)
    if (!head || !body) continue
    tables += 1

    const headers = [...head[1].matchAll(HEAD_CELL_RE)].map((m) => cellText(m[1]))
    const layout = matchLayout(headers)
    if (!layout) {
      throw new Error(`Unknown table layout on ${url}: ${JSON.stringify(headers)}`)
    }
    if (category && category !== layout.category) {
      throw new Error(`Mixed individual/pair tables on ${url}`)
    }
    category = layout.category

    for (const row of body[1].matchAll(ROW_RE)) {
      rawRows += 1
      const cells = [...row[1].matchAll(CELL_RE)].map((m) => cellText(m[1]))
      if (cells.length < layout.headers.length) {
        throw new Error(
          `Short row on ${url}: expected ${layout.headers.length} cells, got ${cells.length}`,
        )
      }
      records.push(buildRecord({ layout, cells, headerCount: headers.length }))
    }
  }

  if (!tables) throw new Error(`No results table found on ${url}`)
  return { category, records, rawRows, tables }
}

/* ── Fetching ───────────────────────────────────────────────────────────── */

function cacheName(url) {
  return url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_') + '.html'
}

/**
 * Fetch a page, memoised on disk. `offline` reads the cache only, so a verify
 * run can be repeated without hammering timataka.
 */
export async function fetchPageHtml(url, { offline = false, refresh = false } = {}) {
  const file = join(CACHE_DIR, cacheName(url))
  if (!refresh) {
    try {
      return await readFile(file, 'utf8')
    } catch {
      if (offline) throw new Error(`Not cached and --offline given: ${url}`)
    }
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'hyrox-cfr-2026 data sync' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, html)
  return html
}

/**
 * Fetch and parse every page of the series.
 * -> Map keyed "eventId/category/subcategory".
 */
export async function loadAllPages(options = {}) {
  const pages = new Map()
  for (const event of SERIES.events) {
    for (const category of CATEGORIES) {
      for (const subcategory of Object.keys(SUBCATEGORIES[category])) {
        const url = pageUrl(event, category, subcategory)
        const html = await fetchPageHtml(url, options)
        const parsed = parsePage(html, { url })
        if (parsed.category !== category) {
          throw new Error(`${url} looks like a ${parsed.category} page, expected ${category}`)
        }
        pages.set(`${event.id}/${category}/${subcategory}`, { ...parsed, url, event, category, subcategory })
      }
    }
  }
  return pages
}

/** Identity of a competitor within one race — bib is reused across teams. */
export function identity(record) {
  return `${record.bib}|${record.display_name ?? record.name}`
}

export function readData() {
  return readFile(DATA_PATH, 'utf8').then(JSON.parse)
}

/* ── Overrides ──────────────────────────────────────────────────────────── */

export const OVERRIDES_PATH = join(HERE, '..', 'overrides.json')

/** Key an override to one competitor in one race. */
export function overrideKey(eventId, category, record) {
  return `${eventId}/${category}/${identity(record)}`
}

export async function readOverrides() {
  const { overrides } = JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'))
  return overrides.map((o) => ({
    ...o,
    key: `${o.event}/${o.category}/${o.bib}|${o.name}`,
  }))
}

/**
 * Apply the declared corrections to a list of parsed records.
 *
 * Returns the records with overrides applied plus, for each one applied, what
 * the source actually said — so the caller can tell whether the override is
 * still doing the job it was written for.
 */
export function applyOverrides(records, eventId, category, overrides) {
  const applied = []
  const out = records.map((record) => {
    const match = overrides.find((o) => o.key === overrideKey(eventId, category, record))
    if (!match) return record
    applied.push({ override: match, was: record[match.field] })
    return { ...record, [match.field]: match.value }
  })
  return { records: out, applied }
}

/** data.json is written without a trailing newline; keep it that way. */
export function serialiseData(data) {
  return JSON.stringify(data, null, 2)
}
