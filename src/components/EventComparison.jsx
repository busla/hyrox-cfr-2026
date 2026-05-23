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

function collectAthletes(event) {
  const list = [];
  if (!event) return list;
  const cats = event.categories || event.flokkar || {};
  const buckets = [];
  if (Array.isArray(event.athletes)) buckets.push(event.athletes);
  if (cats && typeof cats === 'object') {
    Object.values(cats).forEach((v) => {
      if (Array.isArray(v)) buckets.push(v);
      else if (v && typeof v === 'object') {
        Object.values(v).forEach((vv) => {
          if (Array.isArray(vv)) buckets.push(vv);
        });
      }
    });
  }
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
    <div
      style={{
        background: '#1a1f2e',
        border: '1px solid #2d3548',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#e5e7eb',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#f9fafb' }}>{label}</div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 2,
          }}
        >
          <span style={{ color: p.color }}>● {p.name}</span>
          <span>{formatTime(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const EVENT_COLORS = ['#3b82f6', '#f97316', '#22c55e'];

export default function EventComparison({ seriesData }) {
  const events = (seriesData && seriesData.events) || [];
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
      const athletes = collectAthletes(ev);
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
  }, [completedEvents]);

  return (
    <div
      style={{
        background: '#0f1117',
        borderRadius: 12,
        padding: '20px 20px 24px',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f9fafb' }}>
        📅 Mótaröðin — Samanburður yfir öll mót
      </h2>
      <p
        style={{
          color: '#9ca3af',
          fontSize: 14,
          marginTop: 6,
          marginBottom: 18,
          lineHeight: 1.55,
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
                background: '#1a1f2e',
                borderRadius: 10,
                padding: '14px 16px',
                border: `1px solid ${done ? '#22c55e44' : '#2d3548'}`,
                opacity: done ? 1 : 0.9,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Mót {ev.number || idx + 1}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 4,
                  color: '#f9fafb',
                }}
              >
                {ev.name || ev.title || `Mót ${idx + 1}`}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                {ev.date || ev.dagsetning || ''}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  color: done ? '#22c55e' : '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {done ? '✓ Lokið' : '⏳ Væntanlegt'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped bar chart for completed events */}
      <div
        style={{
          background: '#1a1f2e',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#f9fafb' }}>
          Bestu tímar á flokkum — samanburður milli móta
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af' }}>
          Besti tími hvers flokks í hverju móti sem er lokið.
        </p>
        {topByDivision.length > 0 && completedNames.length > 0 ? (
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topByDivision}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis
                  dataKey="division"
                  stroke="#9ca3af"
                  tick={{ fill: '#e5e7eb', fontSize: 12 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(v) => formatTime(v)}
                  width={70}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: 12 }} />
                {completedNames.map((n, i) => (
                  <Bar
                    key={n}
                    dataKey={n}
                    name={n}
                    fill={EVENT_COLORS[i % EVENT_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              color: '#6b7280',
              fontSize: 13,
              padding: 24,
              textAlign: 'center',
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
            background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)',
            borderRadius: 10,
            padding: 28,
            textAlign: 'center',
            border: '1px dashed #2d3548',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#f9fafb',
              marginBottom: 6,
            }}
          >
            Væntanleg mót
          </div>
          <div
            style={{
              color: '#9ca3af',
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
                  color: '#9ca3af',
                  fontSize: 13,
                  background: '#0f1117',
                  border: '1px solid #2d3548',
                  borderRadius: 8,
                  padding: '10px 16px',
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    color: '#f9fafb',
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 2,
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
