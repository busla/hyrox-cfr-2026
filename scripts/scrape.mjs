/**
 * Rebuild src/data.json from timataka.net.
 *
 *   npm run scrape            fetch (using the on-disk cache) and write data.json
 *   npm run scrape -- --refresh   ignore the cache and re-fetch every page
 *   npm run scrape -- --check     write nothing; exit 1 if data.json is stale
 *
 * The Heildarúrslit page is the authority on who took part in a race; the
 * category pages only decide which subcategory each competitor belongs to.
 * Anyone on Heildarúrslit but on no category page would be dropped by a
 * union-of-categories approach, so we take the overall list as-is and let
 * verify.mjs prove the two agree.
 */

import { writeFile } from 'node:fs/promises'

import {
  CATEGORIES,
  DATA_PATH,
  SERIES,
  SUBCATEGORIES,
  identity,
  loadAllPages,
  readData,
  serialiseData,
} from './lib/timataka.mjs'

const args = new Set(process.argv.slice(2))
const refresh = args.has('--refresh')
const checkOnly = args.has('--check')
const offline = args.has('--offline')

/** Finishers first, fastest to slowest and renumbered; non-finishers last. */
function orderOverall(records) {
  const finishers = records
    .filter((r) => r.total_seconds > 0)
    .sort((a, b) => a.total_seconds - b.total_seconds)
    .map((r, i) => ({ ...r, rank: i + 1 }))
  const others = records.filter((r) => !(r.total_seconds > 0)).map((r) => ({ ...r, rank: null }))
  return [...finishers, ...others]
}

const pages = await loadAllPages({ offline, refresh })

const events = SERIES.events.map((event) => {
  const built = {
    id: event.id,
    name: event.name,
    date: event.date,
    status: 'lokið', // downgraded below if the race has no results yet
  }

  for (const category of CATEGORIES) {
    const overall = pages.get(`${event.id}/${category}/overall`).records
    const bySubcat = { overall: orderOverall(overall) }

    for (const subcategory of Object.keys(SUBCATEGORIES[category])) {
      if (subcategory === 'overall') continue
      const page = pages.get(`${event.id}/${category}/${subcategory}`)
      // Keep the page's own ordering and ranks for a subcategory listing.
      bySubcat[subcategory] = page.records
    }

    // A competitor on Heildarúrslit but on no category page still needs a home,
    // otherwise switching to KK/KVK would make them vanish.
    const placed = new Set(
      Object.entries(bySubcat)
        .filter(([key]) => key !== 'overall')
        .flatMap(([, list]) => list.map(identity)),
    )
    const orphans = bySubcat.overall.filter((r) => !placed.has(identity(r)))
    if (orphans.length) {
      console.warn(
        `  ! ${event.id}/${category}: ${orphans.length} on Heildarúrslit but on no category page ` +
          `(${orphans.map(identity).join(', ')})`,
      )
    }

    built[category] = bySubcat
  }

  const anyResults = CATEGORIES.some((c) => built[c].overall.length > 0)
  if (!anyResults) built.status = 'væntanlegt'

  return built
})

const data = { series: { name: SERIES.name, organizer: SERIES.organizer, events } }
const serialised = serialiseData(data)

for (const event of events) {
  const line = CATEGORIES.map((category) => {
    const all = event[category].overall
    const done = all.filter((r) => r.total_seconds > 0).length
    return `${category} ${done}${all.length > done ? ` (+${all.length - done} án tíma)` : ''}`
  }).join(' · ')
  console.log(`${event.id}: ${line}`)
}

if (checkOnly) {
  const current = serialiseData(await readData())
  if (current === serialised) {
    console.log('\ndata.json is up to date with timataka.')
  } else {
    console.error('\ndata.json differs from a fresh scrape. Run: npm run scrape')
    process.exitCode = 1
  }
} else {
  await writeFile(DATA_PATH, serialised)
  console.log(`\nWrote ${DATA_PATH}`)
}
