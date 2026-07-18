import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { T, DIVISION_COLORS } from '../theme.js';

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function collectAthletes(event, category) {
  const list = [];
  if (!event) return list;
  const buckets = [];
  // Results live under `einstaklingar` / `para`, each an object of arrays
  // ({ overall, karlar, konur[, blandað] }). The comparison follows the active
  // category so individuals and pairs are never mixed on the same division axis
  // (pairs run as relays and finish much faster). Older shapes
  // (`categories`/`flokkar`/`athletes`) are kept as fallbacks.
  const group =
    (category && event[category]) ||
    event.einstaklingar ||
    event.categories ||
    event.flokkar;
  if (group && typeof group === 'object') {
    Object.values(group).forEach((v) => {
      if (Array.isArray(v)) buckets.push(v);
      else if (v && typeof v === 'object') {
        Object.values(v).forEach((vv) => {
          if (Array.isArray(vv)) buckets.push(vv);
        });
      }
    });
  }
  if (Array.isArray(event.athletes)) buckets.push(event.athletes);
  buckets.forEach((arr) => {
    arr.forEach((a) => {
      if (a && a.name) list.push(a);
    });
  });
  return list;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={T.tooltip}>
      <div style={{ fontWeight: 900, marginBottom: 6, color: T.white, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 2,
            fontFamily: T.font,
          }}
        >
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{formatTime(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const EVENT_COLORS = [T.yellow, '#60a5fa', '#4ade80'];

export default function EventComparison({ seriesData, category = 'einstaklingar' }) {
  const events = (seriesData && seriesData.events) || [];
  const catNoun = category === 'para' ? 'liða' : 'einstaklinga';
  const completedEvents = events.filter((e) => e.status === 'lokið');
  const upcomingEvents = events.filter((e) => e.status === 'væntanlegt');

  const completedNames = completedEvents.map(
    (e) => e.name || e.title || `Mót ${e.number || ''}`
  );

  // Per-division best time per completed event
  const topByDivision = useMemo(() => {
    const divisionMap = new Map();
    completedEvents.forEach((ev) => {
      const evName = ev.name || ev.title || `Mót ${ev.number || ''}`;
      const athletes = collectAthletes(ev, category);
      const byDiv = new Map();
      athletes.forEach((a) => {
        if (!a.total_seconds || a.total_seconds <= 0) return;
        const d = a.division || 'Annað';
        const cur = byDiv.get(d);
        if (!cur || a.total_seconds < cur.total_seconds) {
          byDiv.set(d, a);
        }
      });
      byDiv.forEach((athlete, d) => {
        if (!divisionMap.has(d)) divisionMap.set(d, { division: d });
        divisionMap.get(d)[evName] = athlete.total_seconds;
      });
    });
    return Array.from(divisionMap.values());
  }, [completedEvents, category]);

  return (
    <div style={T.card}>
      <h2 style={T.sectionTitle}>
        Mótaröðin — Samanburður yfir öll mót
      </h2>
      <p
        style={{
          color: T.gray,
          fontSize: 14,
          marginTop: 6,
          marginBottom: 18,
          lineHeight: 1.55,
          fontFamily: T.font,
        }}
      >
        Hyrox Ísland 2026 samanstendur af þremur mótum. Hér sérðu stöðu hvers móts og
        samanburð á bestu tímum í hverjum flokki á þeim mótum sem þegar er lokið.
        Þegar fleiri mót klárast bætast við frekari samanburðir.
      </p>

      {/* Event status cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {events.map((ev, idx) => {
          const done = ev.status === 'lokið';
          return (
            <div
              key={idx}
              style={{
                background: T.dark2,
                borderRadius: 0,
                padding: '14px 16px',
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${done ? '#22c55e' : T.yellow}`,
                opacity: done ? 1 : 0.9,
                fontFamily: T.font,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: T.gray,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  fontWeight: 700,
                }}
              >
                Mót {ev.number || idx + 1}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  marginTop: 4,
                  color: T.white,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {ev.name || ev.title || `Mót ${idx + 1}`}
              </div>
              <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>
                {ev.date || ev.dagsetning || ''}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  color: done ? '#22c55e' : T.yellow,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                {done ? 'Lokið' : 'Væntanlegt'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped bar chart for completed events */}
      <div
        style={{
          ...T.chartArea,
          marginBottom: 20,
        }}
      >
        <h3 style={{ ...T.sectionTitle, fontSize: 16, marginBottom: 4 }}>
          Bestu tímar á flokkum — samanburður milli móta
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: T.gray, fontFamily: T.font }}>
          Besti tími {catNoun} í hverjum flokki, í hverju móti sem er lokið.
        </p>
        {topByDivision.length > 0 && completedNames.length > 0 ? (
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topByDivision}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis
                  dataKey="division"
                  stroke={T.gray}
                  tick={{ fill: T.white, fontSize: 12 }}
                />
                <YAxis
                  stroke={T.gray}
                  tick={{ fill: T.gray, fontSize: 11 }}
                  tickFormatter={(v) => formatTime(v)}
                  width={70}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255,237,0,0.06)' }}
                />
                <Legend wrapperStyle={{ color: T.white, fontSize: 12, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }} />
                {completedNames.map((n, i) => (
                  <Bar
                    key={n}
                    dataKey={n}
                    name={n}
                    fill={EVENT_COLORS[i % EVENT_COLORS.length]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              color: T.grayDim,
              fontSize: 13,
              padding: 24,
              textAlign: 'center',
              fontFamily: T.font,
            }}
          >
            Engin gögn í boði enn — bíðum eftir niðurstöðum.
          </div>
        )}
      </div>

      {/* Upcoming placeholder */}
      {upcomingEvents.length > 0 && (
        <div
          style={{
            background: T.dark2,
            borderRadius: 0,
            padding: 28,
            textAlign: 'center',
            border: `1px dashed ${T.border}`,
            fontFamily: T.font,
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: T.white,
              marginBottom: 6,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Væntanleg mót
          </div>
          <div
            style={{
              color: T.gray,
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Eftirfarandi mót eru ekki haldin enn. Niðurstöður birtast þegar
            keppninni er lokið.
          </div>
          <div
            style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {upcomingEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  color: T.gray,
                  fontSize: 13,
                  background: T.dark3,
                  border: `1px solid ${T.border}`,
                  borderRadius: 0,
                  padding: '10px 16px',
                  minWidth: 160,
                  fontFamily: T.font,
                }}
              >
                <div
                  style={{
                    color: T.white,
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 2,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {ev.name || ev.title || `Mót ${ev.number || ''}`}
                </div>
                <div>{ev.date || ev.dagsetning || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
