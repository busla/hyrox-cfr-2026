import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const STATION_KEYS = [
  '1. Ski-Erg',
  '2 .Ýta sleða',
  '3. Draga sleða',
  '4. Burpee langstökk',
  '5. Róður',
  '6. Bændaganga',
  '7. Lunges',
  '8. Wall Balls',
];

const STATION_LABELS = [
  'Ski-Erg',
  'Ýta sleða',
  'Draga sleða',
  'Burpee',
  'Róður',
  'Bændaganga',
  'Lunges',
  'Wall Balls',
];

const GREEN = '#22c55e';
const RED = '#ef4444';
const NEUTRAL = '#64748b';

function parseTime(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return null;
  const parts = s.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function formatMMSS(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const sign = sec < 0 ? '-' : '';
  const v = Math.abs(sec);
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function signedSeconds(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const sign = sec > 0 ? '+' : '';
  return `${sign}${Math.round(sec)}s`;
}

export default function CompareChart({ athletes = [] }) {
  const sorted = useMemo(
    () => [...athletes].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)),
    [athletes]
  );

  const [aName, setAName] = useState('');
  const [bName, setBName] = useState('');

  useEffect(() => {
    if (!aName && sorted[0]) setAName(sorted[0].name);
    if (!bName && sorted[1]) setBName(sorted[1].name);
  }, [sorted, aName, bName]);

  const athleteA = sorted.find((x) => x.name === aName);
  const athleteB = sorted.find((x) => x.name === bName);

  const data = useMemo(() => {
    return STATION_KEYS.map((k, i) => {
      const va = athleteA ? parseTime(athleteA.splits?.[k]) : null;
      const vb = athleteB ? parseTime(athleteB.splits?.[k]) : null;
      let aColor = NEUTRAL;
      let bColor = NEUTRAL;
      if (va != null && vb != null) {
        if (va < vb) { aColor = GREEN; bColor = RED; }
        else if (vb < va) { aColor = RED; bColor = GREEN; }
      }
      return {
        station: STATION_LABELS[i],
        a: va,
        b: vb,
        aColor,
        bColor,
      };
    });
  }, [athleteA, athleteB]);

  const summary = useMemo(() => {
    let aWins = 0, bWins = 0, ties = 0;
    let totalA = 0, totalB = 0, both = 0;
    data.forEach((d) => {
      if (d.a != null && d.b != null) {
        if (d.a < d.b) aWins++;
        else if (d.b < d.a) bWins++;
        else ties++;
        totalA += d.a;
        totalB += d.b;
        both++;
      }
    });
    const totalDelta = both > 0 ? totalA - totalB : null;
    return { aWins, bWins, ties, totalA, totalB, totalDelta, both };
  }, [data]);

  const styles = {
    wrapper: {
      background: '#0f1117',
      padding: '24px',
      borderRadius: '12px',
      color: '#e5e7eb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    card: {
      background: '#1a1f2e',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    title: { fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' },
    desc: { fontSize: '14px', color: '#9ca3af', lineHeight: 1.55, marginBottom: '18px' },
    pickRow: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      marginBottom: '18px',
    },
    pickCol: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 220 },
    label: { fontSize: '12px', color: '#9ca3af' },
    select: {
      background: '#0f1117',
      color: '#e5e7eb',
      border: '1px solid #2a3041',
      borderRadius: '6px',
      padding: '8px 10px',
      fontSize: '14px',
    },
    summary: {
      marginTop: '18px',
      padding: '14px 16px',
      background: '#0f1117',
      border: '1px solid #2a3041',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#e5e7eb',
      lineHeight: 1.6,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '8px',
      marginTop: '10px',
    },
    statBox: {
      padding: '8px 10px',
      background: '#1a1f2e',
      borderRadius: '6px',
      fontSize: '12px',
    },
    statTitle: { color: '#9ca3af', fontSize: '11px', marginBottom: 2 },
    statVal: { fontWeight: 700, color: '#fff' },
  };

  const tooltipStyle = {
    background: '#0f1117',
    border: '1px solid #2a3041',
    borderRadius: '6px',
    color: '#e5e7eb',
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔍 Samanburður tveggja keppenda</h2>
        <p style={styles.desc}>
          Veldu tvo keppendur úr listunum að neðan og sjáðu hvernig þeir bera sig saman á
          hverri af 8 stöðvunum. Grænn dálkur sýnir hvor keppandinn var hraðari á þeirri
          stöð, og rauður dálkur sá sem var hægari. Að neðan birtist samantekt: hver vann
          hverja stöð og heildartímamunur milli keppendanna tveggja.
        </p>

        <div style={styles.pickRow}>
          <div style={styles.pickCol}>
            <span style={styles.label}>Keppandi A</span>
            <select
              style={styles.select}
              value={aName}
              onChange={(e) => setAName(e.target.value)}
            >
              {sorted.map((a) => (
                <option key={a.name} value={a.name}>
                  #{a.rank ?? '?'} {a.name} {a.division ? `(${a.division})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.pickCol}>
            <span style={styles.label}>Keppandi B</span>
            <select
              style={styles.select}
              value={bName}
              onChange={(e) => setBName(e.target.value)}
            >
              {sorted.map((a) => (
                <option key={a.name} value={a.name}>
                  #{a.rank ?? '?'} {a.name} {a.division ? `(${a.division})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, bottom: 30, left: 8 }}>
              <CartesianGrid stroke="#2a3041" strokeDasharray="3 3" />
              <XAxis
                dataKey="station"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={formatMMSS}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value, name) => [formatMMSS(value), name === 'a' ? aName : bName]}
              />
              <Legend
                wrapperStyle={{ color: '#e5e7eb', fontSize: 12 }}
                formatter={(value) => (value === 'a' ? aName : bName)}
              />
              <Bar dataKey="a" name="a">
                {data.map((d, i) => <Cell key={`a-${i}`} fill={d.aColor} />)}
              </Bar>
              <Bar dataKey="b" name="b">
                {data.map((d, i) => <Cell key={`b-${i}`} fill={d.bColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.summary}>
          <strong>Samantekt:</strong>{' '}
          {athleteA && athleteB ? (
            <>
              <span style={{ color: GREEN }}>{aName}</span> vann{' '}
              <strong>{summary.aWins}</strong> stöðvar,{' '}
              <span style={{ color: GREEN }}>{bName}</span> vann{' '}
              <strong>{summary.bWins}</strong> stöðvar
              {summary.ties ? `, ${summary.ties} jafntefli` : ''}.
              {summary.totalDelta != null && (
                <>
                  {' '}Heildartímamunur (A − B):{' '}
                  <strong style={{ color: summary.totalDelta < 0 ? GREEN : RED }}>
                    {signedSeconds(summary.totalDelta)}
                  </strong>{' '}
                  ({summary.totalDelta < 0 ? `${aName} hraðari` :
                    summary.totalDelta > 0 ? `${bName} hraðari` : 'jafnir'})
                </>
              )}
            </>
          ) : 'Veldu tvo keppendur til að sjá samanburð.'}

          <div style={styles.grid}>
            {data.map((d, i) => {
              const winner = d.a == null || d.b == null
                ? '—'
                : d.a < d.b ? aName
                : d.b < d.a ? bName
                : 'jafnt';
              const delta = d.a != null && d.b != null ? d.a - d.b : null;
              return (
                <div key={i} style={styles.statBox}>
                  <div style={styles.statTitle}>{d.station}</div>
                  <div style={styles.statVal}>{winner}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>
                    {formatMMSS(d.a)} vs {formatMMSS(d.b)}
                    {delta != null && (
                      <span style={{ marginLeft: 6, color: delta < 0 ? GREEN : delta > 0 ? RED : '#9ca3af' }}>
                        ({signedSeconds(delta)})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
