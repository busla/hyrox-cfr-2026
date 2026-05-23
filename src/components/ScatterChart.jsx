import React, { useMemo } from 'react'
import {
  ScatterChart as RechartsScatter,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const DIVISION_COLORS = {
  'Pro KK': '#f97316',
  'Open KK': '#3b82f6',
  'Pro KVK': '#ec4899',
  'Open KVK': '#a855f7',
}

const DIVISIONS = ['Pro KK', 'Open KK', 'Pro KVK', 'Open KVK']

function formatMMSS(seconds) {
  if (seconds == null || isNaN(seconds)) return '—'
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatHMMSS(seconds) {
  if (seconds == null || isNaN(seconds)) return '—'
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        backgroundColor: '#1a1d28',
        border: '1px solid #2a2f3e',
        borderRadius: 6,
        padding: '10px 14px',
        color: '#e5e7eb',
        fontSize: 13,
      }}
    >
      <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>
        {d.name}
      </div>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{d.division}</div>
      <div>🏃 Hlaup: <strong>{formatHMMSS(d.run_total)}</strong></div>
      <div>💪 Stöðvar: <strong>{formatHMMSS(d.station_total)}</strong></div>
      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #2a2f3e' }}>
        ⏱️ Heild: <strong>{formatHMMSS(d.total_seconds)}</strong>
      </div>
    </div>
  )
}

export default function ScatterChart({ athletes = [] }) {
  const grouped = useMemo(() => {
    const out = {}
    DIVISIONS.forEach((d) => (out[d] = []))
    athletes.forEach((a) => {
      if (!a) return
      const run = Number(a.run_total)
      const stn = Number(a.station_total)
      if (!isFinite(run) || !isFinite(stn) || run <= 0 || stn <= 0) return
      if (!out[a.division]) out[a.division] = []
      out[a.division].push({
        x: run,
        y: stn,
        name: a.display_name || a.name,
        division: a.division,
        run_total: run,
        station_total: stn,
        total_seconds: a.total_seconds,
      })
    })
    return out
  }, [athletes])

  const allPoints = useMemo(
    () => Object.values(grouped).flat(),
    [grouped]
  )

  const { xMin, xMax, yMin, yMax, refLines } = useMemo(() => {
    if (!allPoints.length) {
      return { xMin: 0, xMax: 1, yMin: 0, yMax: 1, refLines: [] }
    }
    const xs = allPoints.map((p) => p.x)
    const ys = allPoints.map((p) => p.y)
    const xMin = Math.floor(Math.min(...xs) * 0.95)
    const xMax = Math.ceil(Math.max(...xs) * 1.05)
    const yMin = Math.floor(Math.min(...ys) * 0.95)
    const yMax = Math.ceil(Math.max(...ys) * 1.05)

    const totals = allPoints.map((p) => p.total_seconds || p.x + p.y)
    const minT = Math.min(...totals)
    const maxT = Math.max(...totals)
    const midT = (minT + maxT) / 2
    const lines = [minT, midT, maxT].map((t) => ({
      total: t,
      x1: xMin,
      y1: t - xMin,
      x2: xMax,
      y2: t - xMax,
    }))
    return { xMin, xMax, yMin, yMax, refLines: lines }
  }, [allPoints])

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
        ⚡ Hlaup vs stöðvar
      </h2>
      <p
        style={{
          color: '#9ca3af',
          marginTop: 8,
          marginBottom: 20,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Hver punktur er einn keppandi: X-ásinn sýnir heildartíma í hlaupi
        og Y-ásinn heildartíma á stöðvum. Skálínurnar tengja saman jafna
        heildartíma.
        <br />
        • <strong>Neðst til vinstri</strong> = bestur heildartími (hraður á
        bæði hlaupi og stöðvum).
        <br />
        • <strong>Efst til vinstri</strong> = sterkur hlaupari, hægari á
        stöðvum.
        <br />
        • <strong>Neðst til hægri</strong> = sterkur á stöðvum, hægari í
        hlaupi.
      </p>

      <div style={{ width: '100%', height: 520 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsScatter margin={{ top: 20, right: 30, bottom: 50, left: 60 }}>
            <CartesianGrid stroke="#2a2f3e" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Hlaup"
              domain={[xMin, xMax]}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatMMSS}
              stroke="#4b5563"
              label={{
                value: 'Heildartími í hlaupi',
                position: 'insideBottom',
                offset: -10,
                fill: '#e5e7eb',
                fontSize: 13,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Stöðvar"
              domain={[yMin, yMax]}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatMMSS}
              stroke="#4b5563"
              label={{
                value: 'Heildartími á stöðvum',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: '#e5e7eb',
                fontSize: 13,
                style: { textAnchor: 'middle' },
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: '3 3', stroke: '#4b5563' }}
            />
            <Legend wrapperStyle={{ color: '#e5e7eb', paddingTop: 12 }} />

            {refLines.map((ln, i) => (
              <ReferenceLine
                key={i}
                segment={[
                  { x: ln.x1, y: ln.y1 },
                  { x: ln.x2, y: ln.y2 },
                ]}
                stroke="#4b5563"
                strokeDasharray="4 4"
                ifOverflow="hidden"
                label={{
                  value: `Heild ${formatHMMSS(ln.total)}`,
                  fill: '#6b7280',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
            ))}

            {DIVISIONS.map((d) =>
              grouped[d] && grouped[d].length ? (
                <Scatter
                  key={d}
                  name={d}
                  data={grouped[d]}
                  fill={DIVISION_COLORS[d]}
                  fillOpacity={0.75}
                />
              ) : null
            )}
          </RechartsScatter>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
