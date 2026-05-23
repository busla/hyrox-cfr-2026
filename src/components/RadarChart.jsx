import React, { useMemo, useState } from 'react'
import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const STATION_KEYS = [
  '1. Ski-Erg',
  '2 .Ýta sleða',
  '3. Draga sleða',
  '4. Burpee langstökk',
  '5. Róður',
  '6. Bændaganga',
  '7. Lunges',
  '8. Wall Balls',
]

const STATION_LABELS = [
  'Ski-Erg',
  'Ýta sleða',
  'Draga sleða',
  'Burpee',
  'Róður',
  'Bændaganga',
  'Lunges',
  'Wall Balls',
]

const DIVISION_COLORS = {
  'PRO KK': '#f97316',
  'OPEN KK': '#3b82f6',
  'PRO KVK': '#ec4899',
  'OPEN KVK': '#a855f7',
}

const DIVISIONS = ['PRO KK', 'OPEN KK', 'PRO KVK', 'OPEN KVK']

function parseTime(val) {
  if (val == null) return null
  if (typeof val === 'number') return val
  const s = String(val).trim()
  if (!s) return null
  const parts = s.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

function avgSecondsPerStation(athletes, stationKey) {
  const vals = athletes
    .map((a) => parseTime(a?.splits?.[stationKey]))
    .filter((v) => v != null && v > 0)
  if (!vals.length) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

function toScore(seconds) {
  if (seconds == null) return 0
  return Math.max(0, 600 - seconds)
}

function formatSeconds(s) {
  if (s == null || isNaN(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function RadarChart({ athletes = [] }) {
  const [selectedAthleteName, setSelectedAthleteName] = useState('')

  // Build aggregated data: one row per station, with one key per division
  const aggregatedData = useMemo(() => {
    const byDivision = {}
    DIVISIONS.forEach((d) => {
      byDivision[d] = athletes.filter((a) => a.division === d)
    })

    return STATION_KEYS.map((key, i) => {
      const row = { station: STATION_LABELS[i] }
      DIVISIONS.forEach((d) => {
        const avg = avgSecondsPerStation(byDivision[d], key)
        row[d] = toScore(avg)
        row[`${d}__sec`] = avg
      })
      return row
    })
  }, [athletes])

  const presentDivisions = DIVISIONS.filter((d) =>
    athletes.some((a) => a.division === d)
  )

  // Athlete dropdown
  const athleteOptions = useMemo(
    () =>
      [...athletes]
        .filter((a) => a && a.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'is')),
    [athletes]
  )

  const selectedAthlete = useMemo(
    () => athleteOptions.find((a) => a.name === selectedAthleteName),
    [athleteOptions, selectedAthleteName]
  )

  const athleteData = useMemo(() => {
    if (!selectedAthlete) return []
    const division = selectedAthlete.division
    const divisionAthletes = athletes.filter((a) => a.division === division)
    return STATION_KEYS.map((key, i) => {
      const athleteSec = parseTime(selectedAthlete?.splits?.[key])
      const divAvg = avgSecondsPerStation(divisionAthletes, key)
      return {
        station: STATION_LABELS[i],
        Íþróttamaður: toScore(athleteSec),
        'Meðaltal deildar': toScore(divAvg),
        athleteSec,
        divAvg,
      }
    })
  }, [selectedAthlete, athletes])

  const tooltipStyle = {
    backgroundColor: '#1a1d28',
    border: '1px solid #2a2f3e',
    borderRadius: 6,
    color: '#e5e7eb',
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </div>
        {payload.map((p) => {
          const secKey = `${p.dataKey}__sec`
          const sec =
            p.payload?.[secKey] ??
            (p.dataKey === 'Íþróttamaður'
              ? p.payload?.athleteSec
              : p.dataKey === 'Meðaltal deildar'
              ? p.payload?.divAvg
              : null)
          return (
            <div key={p.dataKey} style={{ color: p.color, fontSize: 13 }}>
              {p.dataKey}: {formatSeconds(sec)} ({Math.round(p.value)} stig)
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#0f1117',
        padding: 24,
        borderRadius: 12,
        color: '#e5e7eb',
      }}
    >
      <h2 style={{ margin: 0, color: '#fff', fontSize: 22 }}>
        🕸️ Radar graf — Styrkleikar og veikleikar
      </h2>
      <p style={{ color: '#9ca3af', marginTop: 8, marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>
        Radarinn sýnir meðalframmistöðu á hverri af átta stöðvum, eftir deild.
        Stigin eru reiknuð sem <strong>600 − sekúndur</strong> (lægstu tímar gefa
        hæstu stig), þannig að stærra svæði táknar betri heildarframmistöðu.
        Berðu saman lögun ferlanna til að sjá hvar hver deild er sterkust og
        hvar tækifæri liggja.
      </p>

      <div style={{ width: '100%', height: 480 }}>
        <ResponsiveContainer>
          <RechartsRadar data={aggregatedData} outerRadius="75%">
            <PolarGrid stroke="#2a2f3e" />
            <PolarAngleAxis
              dataKey="station"
              tick={{ fill: '#e5e7eb', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 600]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              stroke="#2a2f3e"
            />
            {presentDivisions.map((d) => (
              <Radar
                key={d}
                name={d}
                dataKey={d}
                stroke={DIVISION_COLORS[d]}
                fill={DIVISION_COLORS[d]}
                fillOpacity={0.18}
                strokeWidth={2}
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#e5e7eb', paddingTop: 8 }} />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>

      {/* Individual athlete section */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid #2a2f3e',
        }}
      >
        <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>
          👤 Einstaklingsgreining
        </h3>
        <p style={{ color: '#9ca3af', marginTop: 6, marginBottom: 16, fontSize: 13 }}>
          Veldu íþróttamann til að sjá hans radar í samanburði við meðaltal deildar.
        </p>

        <select
          value={selectedAthleteName}
          onChange={(e) => setSelectedAthleteName(e.target.value)}
          style={{
            backgroundColor: '#1a1d28',
            color: '#e5e7eb',
            border: '1px solid #2a2f3e',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 14,
            minWidth: 280,
            marginBottom: 16,
          }}
        >
          <option value="">— Veldu íþróttamann —</option>
          {athleteOptions.map((a) => (
            <option key={`${a.name}-${a.division}`} value={a.name}>
              {a.name} ({a.division})
            </option>
          ))}
        </select>

        {selectedAthlete && (
          <div style={{ width: '100%', height: 460 }}>
            <ResponsiveContainer>
              <RechartsRadar data={athleteData} outerRadius="75%">
                <PolarGrid stroke="#2a2f3e" />
                <PolarAngleAxis
                  dataKey="station"
                  tick={{ fill: '#e5e7eb', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 600]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  stroke="#2a2f3e"
                />
                <Radar
                  name="Meðaltal deildar"
                  dataKey="Meðaltal deildar"
                  stroke="#6b7280"
                  fill="#6b7280"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Radar
                  name={selectedAthlete.name}
                  dataKey="Íþróttamaður"
                  stroke={DIVISION_COLORS[selectedAthlete.division] || '#22d3ee'}
                  fill={DIVISION_COLORS[selectedAthlete.division] || '#22d3ee'}
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#e5e7eb', paddingTop: 8 }} />
              </RechartsRadar>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
