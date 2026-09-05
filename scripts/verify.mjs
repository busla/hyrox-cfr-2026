/**
 * Integrity check for src/data.json against timataka.net.
 *
 *   npm run verify                  fetch (using the cache) and check everything
 *   npm run verify -- --refresh     re-fetch every page first
 *   npm run verify -- --offline     work from the cache, never hit the network
 *   npm run verify -- --no-source   skip the source comparison entirely
 *   npm run verify -- --no-divisions   skip the division-page sweep
 *
 * Three classes of check:
 *
 *   SOURCE    — is timataka internally consistent, and did we read all of it?
 *               Every row on every page must parse, and the Heildarúrslit page
 *               must contain exactly the same competitors as the gender
 *               listings put together. This is the check that would have caught
 *               the four non-finishers we lost: they sit on Heildarúrslit only.
 *
 *   DATA      — does data.json say what the source says, and is it internally
 *               sound? Ranks, sorting, split arithmetic, station keys, and the
 *               invariants the charts rely on.
 *
 *   DIVISIONS — does every competitor appear on the division listing their own
 *               division claims, and does every division listing contain only
 *               competitors we have? This is the only check that reads the
 *               division field rather than just carrying it, so a mislabelled
 *               division fails here and nowhere else.
 *
 * Plus OVERRIDES: the corrections declared in overrides.json must each still
 * match a real competitor, still be reflected in data.json, and still be needed
 * — see the OVERRIDES section below.
 *
 * Exits non-zero if any check fails.
 */

import {
  CATEGORIES,
  DIVISIONS,
  DIVISION_SUBCATEGORY,
  SERIES,
  STATION_KEYS,
  SUBCATEGORIES,
  applyOverrides,
  divisionPageUrl,
  fetchPageHtml,
  hmsToSeconds,
  identity,
  loadAllPages,
  overrideId,
  overrideKey,
  parsePage,
  readData,
  readOverrides,
  sameValue,
} from './lib/timataka.mjs'

const args = new Set(process.argv.slice(2))
const offline = args.has('--offline')
const refresh = args.has('--refresh')
const skipSource = args.has('--no-source')
const skipDivisions = args.has('--no-divisions')

const failures = []
const warnings = []

function check(ok, label, detail) {
  if (ok) return true
  failures.push(detail ? `${label}\n      ${detail}` : label)
  return false
}

function warn(label) {
  warnings.push(label)
}

function counts(list) {
  const map = new Map()
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1)
  return map
}

/** Multiset difference, so a bib reused by two teams is not mistaken for a dup. */
function missingFrom(expected, actual) {
  const have = counts(actual)
  const out = []
  for (const [key, n] of counts(expected)) {
    const short = n - (have.get(key) ?? 0)
    for (let i = 0; i < short; i += 1) out.push(key)
  }
  return out
}

const data = await readData()
const events = data.series.events
const byId = new Map(events.map((e) => [e.id, e]))

/** Competitors whose own division contradicts the listing they appear in. */
const inconsistent = new Set()

/** Declared corrections, keyed "event/category/bib|name" -> overridden fields. */
const overrides = await readOverrides()
const overriddenFields = new Map()
for (const o of overrides) {
  if (!overriddenFields.has(o.key)) overriddenFields.set(o.key, new Set())
  overriddenFields.get(o.key).add(o.field)
}
const overrideSeen = new Set()
{
  const dupes = [...counts(overrides.map(overrideId))].filter(([, n]) => n > 1).map(([k]) => k)
  check(
    dupes.length === 0,
    'OVERRIDE: the same competitor and field is corrected more than once',
    dupes.join(', '),
  )
}

/* ── SOURCE ─────────────────────────────────────────────────────────────── */

let pages = null
if (!skipSource) {
  try {
    pages = await loadAllPages({ offline, refresh })
  } catch (err) {
    if (offline) throw err
    warn(`Could not reach timataka, source checks skipped: ${err.message}`)
  }
}

if (pages) {
  for (const [key, page] of pages) {
    check(
      page.records.length === page.rawRows,
      `SOURCE ${key}: parsed ${page.records.length} of ${page.rawRows} table rows`,
      page.url,
    )
  }

  for (const event of SERIES.events) {
    for (const category of CATEGORIES) {
      const overall = pages.get(`${event.id}/${category}/overall`).records.map(identity)
      const union = Object.keys(SUBCATEGORIES[category])
        .filter((s) => s !== 'overall')
        .flatMap((s) => pages.get(`${event.id}/${category}/${s}`).records.map(identity))

      const onlyOverall = missingFrom(overall, union)
      const onlyCategory = missingFrom(union, overall)

      check(
        onlyOverall.length === 0,
        `SOURCE ${event.id}/${category}: on Heildarúrslit but on no category page`,
        onlyOverall.join(', '),
      )
      check(
        onlyCategory.length === 0,
        `SOURCE ${event.id}/${category}: on a category page but not on Heildarúrslit`,
        onlyCategory.join(', '),
      )

      // The same competitor must read the same on both pages. Rank differs by
      // design (overall vs. within-category), everything else must not.
      const overallRecords = new Map(
        pages.get(`${event.id}/${category}/overall`).records.map((r) => [identity(r), r]),
      )
      for (const subcategory of Object.keys(SUBCATEGORIES[category])) {
        if (subcategory === 'overall') continue
        for (const record of pages.get(`${event.id}/${category}/${subcategory}`).records) {
          const other = overallRecords.get(identity(record))
          if (!other) continue
          const strip = ({ rank, ...rest }) => JSON.stringify(rest)
          check(
            strip(record) === strip(other),
            `SOURCE ${event.id}/${category} ${identity(record)}: differs between Heildarúrslit and the ${subcategory} page`,
          )
        }
      }
    }
  }

  // data.json must hold exactly what the source pages hold.
  for (const event of SERIES.events) {
    const stored = byId.get(event.id)
    if (!check(stored, `DATA: event ${event.id} missing from data.json`)) continue

    for (const category of CATEGORIES) {
      for (const subcategory of Object.keys(SUBCATEGORIES[category])) {
        const source = pages.get(`${event.id}/${category}/${subcategory}`).records.map(identity)
        const mine = (stored[category]?.[subcategory] ?? []).map(identity)
        const missing = missingFrom(source, mine)
        const extra = missingFrom(mine, source)
        check(
          missing.length === 0,
          `DATA ${event.id}/${category}/${subcategory}: ${missing.length} competitor(s) on timataka but not in data.json`,
          missing.join(', '),
        )
        check(
          extra.length === 0,
          `DATA ${event.id}/${category}/${subcategory}: ${extra.length} competitor(s) in data.json but no longer on timataka`,
          extra.join(', '),
        )
      }
    }
  }
}

/* ── DATA ───────────────────────────────────────────────────────────────── */

const stationKeys = JSON.stringify(STATION_KEYS)

for (const event of events) {
  for (const category of CATEGORIES) {
    const group = event[category]
    if (!check(group, `DATA ${event.id}: missing "${category}"`)) continue

    const subcategories = Object.keys(SUBCATEGORIES[category])
    check(
      subcategories.every((s) => Array.isArray(group[s])),
      `DATA ${event.id}/${category}: expected subcategories ${subcategories.join(', ')}`,
    )

    const overall = group.overall ?? []

    // Identity is bib for an individual and bib+team for a pair. Everything
    // else here matches competitors by it, so a collision would silently pair
    // up two different people.
    for (const subcategory of subcategories) {
      const list = group[subcategory] ?? []
      const dupes = [...counts(list.map(identity))].filter(([, n]) => n > 1).map(([k]) => k)
      check(
        dupes.length === 0,
        `DATA ${event.id}/${category}/${subcategory}: identity is not unique`,
        dupes.join(', '),
      )
    }

    // overall is the union of the subcategory lists — nobody added or lost.
    const union = subcategories.filter((s) => s !== 'overall').flatMap((s) => group[s] ?? [])
    check(
      missingFrom(overall.map(identity), union.map(identity)).length === 0 &&
        missingFrom(union.map(identity), overall.map(identity)).length === 0,
      `DATA ${event.id}/${category}: overall does not match the subcategory lists`,
      `overall ${overall.length}, subcategories ${union.length}`,
    )

    // A division that disagrees with the listing it appears in is timataka's
    // own inconsistency, not ours — surface it rather than silently normalise.
    for (const subcategory of subcategories) {
      if (subcategory === 'overall') continue
      for (const record of group[subcategory] ?? []) {
        const expected = DIVISION_SUBCATEGORY[record.division]
        if (expected && expected !== subcategory) {
          inconsistent.add(`${event.id}/${category}/${identity(record)}`)
          warn(
            `${event.id}/${category} #${record.bib} ${record.display_name ?? record.name}: ` +
              `division "${record.division}" but listed under ${subcategory} on timataka`,
          )
        }
      }
    }

    const finishers = overall.filter((r) => r.total_seconds > 0)

    check(
      finishers.every((r, i) => r.rank === i + 1),
      `DATA ${event.id}/${category}: overall finishers are not ranked 1..n in order`,
    )
    check(
      finishers.every((r, i) => i === 0 || finishers[i - 1].total_seconds <= r.total_seconds),
      `DATA ${event.id}/${category}: overall finishers are not sorted by time`,
    )

    for (const record of overall) {
      const who = `${event.id}/${category} #${record.bib} ${record.display_name ?? record.name}`

      if (record.total_seconds > 0) {
        check(
          hmsToSeconds(record.total_time) === record.total_seconds,
          `DATA ${who}: total_time ${record.total_time} != total_seconds ${record.total_seconds}`,
        )
        check(
          JSON.stringify(Object.keys(record.splits)) === stationKeys,
          `DATA ${who}: unexpected station keys`,
          JSON.stringify(Object.keys(record.splits)),
        )
        check(record.run_times.length === 8, `DATA ${who}: ${record.run_times.length} run splits, expected 8`)
        check(
          record.run_times.reduce((a, b) => a + b, 0) === record.run_total,
          `DATA ${who}: run_total does not match run_times`,
        )
        check(
          Object.values(record.splits).reduce((a, b) => a + b, 0) === record.station_total,
          `DATA ${who}: station_total does not match splits`,
        )
      } else {
        // Non-finishers carry no timing data and must stay out of the charts.
        check(record.status, `DATA ${who}: no time and no status`)
        check(record.total_time === null, `DATA ${who}: no time but total_time is set`)
        check(
          Object.keys(record.splits).length === 0 && record.run_times.length === 0,
          `DATA ${who}: no time but has splits`,
        )
      }

      if (record.division && !Object.values(DIVISIONS).includes(record.division)) {
        warn(`${who}: unknown division "${record.division}"`)
      }
      if (!record.division) {
        warn(`${who}: no division on timataka — on no division page, shows under "Annað"`)
      }
      if (category === 'para') {
        check(record.team_name && record.display_name, `DATA ${who}: pair without a team name`)
        check(record.members?.length >= 1, `DATA ${who}: pair without members`)
      }
    }
  }
}

/* ── OVERRIDES ──────────────────────────────────────────────────────────── */

/**
 * Every declared correction must still be needed and still be accurate.
 *
 * An override is a standing claim that timataka is wrong about one field. That
 * claim can go stale two ways: timataka fixes it (the override becomes a lie by
 * omission) or timataka changes it to something else again (the override was
 * written against a value that no longer exists). Both are reported, and an
 * override that matches no competitor at all is a hard failure.
 */
if (pages) {
  for (const event of SERIES.events) {
    for (const category of CATEGORIES) {
      const source = pages.get(`${event.id}/${category}/overall`).records
      const { applied } = applyOverrides(source, event.id, category, overrides)

      for (const { override, was } of applied) {
        overrideSeen.add(overrideId(override))

        if (sameValue(was, override.value)) {
          warn(
            `override ${override.key} is no longer needed — timataka now says ` +
              `${JSON.stringify(was)} for ${override.field}. Remove it from scripts/overrides.json.`,
          )
        } else if (!sameValue(was, override.source_value)) {
          warn(
            `override ${override.key}: timataka now says ${JSON.stringify(was)} for ` +
              `${override.field}, not ${JSON.stringify(override.source_value)} as recorded. ` +
              `Re-read scripts/overrides.json.`,
          )
        }

        // The corrected value must actually be in data.json.
        const stored = (byId.get(event.id)?.[category]?.overall ?? []).find(
          (r) => overrideKey(event.id, category, r) === override.key,
        )
        check(
          stored && sameValue(stored[override.field], override.value),
          `OVERRIDE ${override.key}: data.json has ${override.field} ` +
            `${JSON.stringify(stored?.[override.field])}, expected ` +
            `${JSON.stringify(override.value)} — run npm run scrape`,
        )
      }
    }
  }

  for (const override of overrides) {
    check(
      overrideSeen.has(overrideId(override)),
      `OVERRIDE ${override.key}: matches no competitor on timataka — stale entry in scripts/overrides.json`,
    )
  }
}

/* ── DIVISIONS ──────────────────────────────────────────────────────────── */

/**
 * Sweep the division-filtered listings — "Einstaklingar KK PRO", "Parakeppni
 * KVK OPEN" and the rest — and check them against data.json in both
 * directions.
 *
 * The URLs are built from the divisions in our own data rather than taken from
 * the links on timataka's index page, because those links are not reliable: the
 * "Parakeppni KVK OPEN" link for 3. mót asks for cat=f with division="Open KK"
 * and quietly returns an empty page, hiding 15 pairs. A sweep driven by the
 * index would inherit that blind spot; this one does not.
 */
let divisionPages = 0
if (pages && !skipDivisions) {
  for (const event of SERIES.events) {
    const stored = byId.get(event.id)
    if (!stored) continue

    for (const category of CATEGORIES) {
      const overall = stored[category]?.overall ?? []
      const divisions = [...new Set(overall.map((r) => r.division).filter(Boolean))]

      for (const division of divisions) {
        const url = divisionPageUrl(event, category, division)
        let records
        try {
          records = parsePage(await fetchPageHtml(url, { offline, refresh }), { url }).records
          divisionPages += 1
        } catch (err) {
          check(false, `DIVISION ${event.id}/${category} ${division}: could not read ${url}`, err.message)
          continue
        }

        const onPage = records.map(identity)
        const expected = overall
          .filter((r) => r.division === division)
          // Someone already flagged as inconsistent is absent from their own
          // division page by definition; don't report the same thing twice.
          .filter((r) => !inconsistent.has(`${event.id}/${category}/${identity(r)}`))
          // An overridden division deliberately disagrees with timataka, so the
          // source's division page cannot be expected to list them. The override
          // is checked against the source separately, below.
          .filter((r) => !overriddenFields.get(overrideKey(event.id, category, r))?.has('division'))
          .map(identity)

        const absent = missingFrom(expected, onPage)
        const unknown = missingFrom(onPage, overall.map(identity))

        check(
          absent.length === 0,
          `DIVISION ${event.id}/${category} ${division}: in data.json but not on the division page`,
          `${absent.join(', ')} — ${url}`,
        )
        check(
          unknown.length === 0,
          `DIVISION ${event.id}/${category} ${division}: on the division page but not in data.json`,
          `${unknown.join(', ')} — ${url}`,
        )
      }

    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

const totals = events.map((e) => {
  const parts = CATEGORIES.map((c) => {
    const all = e[c].overall
    const done = all.filter((r) => r.total_seconds > 0).length
    const dnf = all.length - done
    return `${c} ${done}${dnf ? ` +${dnf} DNF` : ''}`
  })
  return `  ${e.id} (${e.status}): ${parts.join(' · ')}`
})

console.log(
  `Checked ${events.length} events${
    pages
      ? ` against ${pages.size} result pages${divisionPages ? ` and ${divisionPages} division pages` : ''}`
      : ' (structure only)'
  }`,
)
console.log(totals.join('\n'))

if (warnings.length) {
  console.log(`\n${warnings.length} note(s):`)
  for (const w of warnings) console.log(`  - ${w}`)
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) FAILED:`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}

console.log('\nAll integrity checks passed.')
