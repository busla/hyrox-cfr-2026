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
  // Try common shapes
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
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: p.color }}>● {p.name}</span>
          <span>{formatTime(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function EventComparison({ seriesData }) {
  const events = (seriesData && seriesData.events) || [];

  const completedEvents = events.filter((e) => e.status === 'lokið');
  const upcomingEvents = events.filter((e) => e.status === 'væntanlegt');

  // Build per-event top finisher rows for grouped bar chart
  const topByDivision = useMemo(() => {
    const divisionMap = new Map(); // division -> { division, [eventName]: time }
    completedEvents.forEach((ev) => {
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
        divisionMap.get(d)[ev.name || ev.title || `Mót ${ev.number || ''}`] = athlete.total_seconds;
        divisionMap.get(d)[`${ev.name}__athlete`] = athlete.name;
      });
    });
    return Array.from(divisionMap.values());
  }, [completedEvents]);

  // Build cross-event athlete progression
  const progressionRows = useMemo(() => {
    const map = new Map(); // name -> { name, division, club, times: { eventName: seconds } }
    events.forEach((ev) => {
      if (ev.status !== 'lokið') return;
      const evName = ev.name || ev.title || `Mót ${ev.number || ''}`;
      collectAthletes(ev).forEach((a) => {
        if (!a.total_seconds || a.total_seconds <= 0) return;
        const key = `${a.name}|${a.division || ''}`;
        if (!map.has(key)) {
          map.set(key, {
            name: a.name,
            division: a.division || '',
            club: a.club || '',
            times: {},
          });
        }
        map.get(key).times[evName] = a.total_seconds;
      });
    });
    return Array.from(map.values()).filter((r) => Object.keys(r.times).length >= 2);
  }, [events]);

  const completedNames = completedEvents.map(
    (e) => e.name || e.title || `Mót ${e.number || ''}`
  );
  const eventColors = ['#3b82f6', '#f97316', '#22c55e'];

  return (
    <div
      style={{
        background: '#0f1117',
        borderRadius: 12,
        padding: '20px 20px 24px',
        color: '#e5e7eb',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, color: '#f9fafb' }}>
        📅 Mótaröðin — Samanburður yfir öll mót
      </h2>
      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
        Hyrox Ísland 2026 samanstendur af þremur mótum. Hér sérðu samanburð á niðurstöðum á milli
        móta — bestu tímum í hverjum flokki og framvindu þeirra keppenda sem taka þátt í fleiri en
        einu móti. Þegar fleiri mót klárast bætast við frekari samanburðir.
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
                opacity: done ? 1 : 0.85,
              }}
            >
              <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Mót {ev.number || idx + 1}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: '#f9fafb' }}>
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
                }}
              >
                {done ? '✓ Lokið' : '⏳ Væntanlegt'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped bar chart for completed events */}
      <div style={{ background: '#1a1f2e', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#f9fafb' }}>
          Bestu tímar á flokkum — samanburður milli móta
        </h3>
        {topByDivision.length > 0 && completedNames.length > 0 ? (
          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topByDivision} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis dataKey="division" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 11 }} />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(v) => formatTime(v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: 12 }} />
                {completedNames.map((n, i) => (
                  <Bar key={n} dataKey={n} fill={eventColors[i % eventColors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 13, padding: 20, textAlign: 'center' }}>
            Engin gögn í boði enn — bíðum eftir niðurstöðum.
          </div>
        )}
      </div>

      {/* Progression table */}
      <div style={{ background: '#1a1f2e', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#f9fafb' }}>
          Framvinda keppenda yfir mót
        </h3>
        {progressionRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#9ca3af', textAlign: 'left', borderBottom: '1px solid #2d3548' }}>
                  <th style={{ padding: '8px 10px' }}>Keppandi</th>
                  <th style={{ padding: '8px 10px' }}>Flokkur</th>
                  {completedNames.map((n) => (
                    <th key={n} style={{ padding: '8px 10px' }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {progressionRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #2d354844' }}>
                    <td style={{ padding: '8px 10px', color: '#f9fafb', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{r.division}</td>
                    {completedNames.map((n) => (
                      <td key={n} style={{ padding: '8px 10px', color: '#e5e7eb' }}>
                        {r.times[n] ? formatTime(r.times[n]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 13, padding: 20, textAlign: 'center', lineHeight: 1.6 }}>
            Aðeins eitt mót er klárað í augnablikinu. Þegar mót 2 og 3 verða haldin birtist hér tafla
            sem sýnir hvernig keppendur þróast yfir mótaröðina.
          </div>
        )}
      </div>

      {/* Upcoming placeholder */}
      {upcomingEvents.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)',
            borderRadius: 10,
            padding: 24,
            textAlign: 'center',
            border: '1px dashed #2d3548',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>
            Væntanleg mót
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            {upcomingEvents.map((ev, i) => (
              <div key={i} style={{ color: '#9ca3af', fontSize: 13 }}>
                <div style={{ color: '#e5e7eb', fontWeight: 600 }}>
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
