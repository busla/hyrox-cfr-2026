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
import { T, DIVISION_COLORS } from '../theme.js';

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
const NEUTRAL = T.grayDim;

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
      ...T.card,
    },
    card: {
      padding: 0,
    },
    title: T.sectionTitle,
    desc: { ...T.subTitle, lineHeight: 1.55, textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 13, marginBottom: 18 },
    pickRow: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      marginBottom: '18px',
    },
    pickCol: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 220 },
    label: { fontSize: 11, color: T.gray, fontFamily: T.font, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 },
    select: {
      background: '#111',
      color: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 0,
      padding: '8px 10px',
      fontSize: 14,
      fontFamily: T.font,
    },
    summary: {
      marginTop: '18px',
      padding: '14px 16px',
      background: T.dark2,
      border: `1px solid ${T.border}`,
      borderRadius: 0,
      fontSize: 13,
      color: T.white,
      lineHeight: 1.6,
      fontFamily: T.font,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '8px',
      marginTop: '10px',
    },
    statBox: {
      padding: '8px 10px',
      background: T.dark3,
      border: `1px solid ${T.border}`,
      borderRadius: 0,
      fontSize: 12,
      fontFamily: T.font,
    },
    statTitle: { color: T.gray, fontSize: 11, marginBottom: 2, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 },
    statVal: { fontWeight: 900, color: T.white },
  };

  const tooltipStyle = {
    background: T.dark2,
    border: `1px solid ${T.border}`,
    borderLeft: `3px solid ${T.yellow}`,
    borderRadius: 0,
    color: T.white,
    fontFamily: T.font,
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Samanburður tveggja keppenda</h2>
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
                  #{a.rank ?? '?'} {a.display_name || a.name} {a.division ? `(${a.division})` : ''}
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
                  #{a.rank ?? '?'} {a.display_name || a.name} {a.division ? `(${a.division})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ ...T.chartArea, width: '100%', height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, bottom: 30, left: 8 }}>
              <CartesianGrid stroke="#1e1e1e" strokeDasharray="3 3" />
              <XAxis
                dataKey="station"
                stroke={T.gray}
                tick={{ fill: T.gray, fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke={T.gray}
                tick={{ fill: T.gray, fontSize: 11 }}
                tickFormatter={formatMMSS}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: T.gray, fontFamily: T.font }}
                formatter={(value, name) => [formatMMSS(value), name === 'a' ? aName : bName]}
              />
              <Legend
                wrapperStyle={{ color: T.white, fontSize: 12, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }}
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
                  <div style={{ color: T.gray, fontSize: 11, fontFamily: T.font }}>
                    {formatMMSS(d.a)} vs {formatMMSS(d.b)}
                    {delta != null && (
                      <span style={{ marginLeft: 6, color: delta < 0 ? GREEN : delta > 0 ? RED : T.gray }}>
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
