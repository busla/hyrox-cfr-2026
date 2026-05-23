import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 16 segments: alternating run + station
const SEGMENT_LABELS = [
  'Hlaup 1', 'Ski-Erg',
  'Hlaup 2', 'Ýta sleða',
  'Hlaup 3', 'Draga sleða',
  'Hlaup 4', 'Burpee',
  'Hlaup 5', 'Róður',
  'Hlaup 6', 'Bændaganga',
  'Hlaup 7', 'Lunges',
  'Hlaup 8', 'Wall Balls',
];

// Possible station key variants in athlete.splits
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

const RUN_KEYS = [
  'Hlaup 1', 'Hlaup 2', 'Hlaup 3', 'Hlaup 4',
  'Hlaup 5', 'Hlaup 6', 'Hlaup 7', 'Hlaup 8',
];

const DIVISION_COLORS = {
  KK: '#3b82f6',
  KVK: '#ec4899',
  PRO: '#f59e0b',
  OPEN: '#10b981',
  DEFAULT: '#a78bfa',
};

function parseTime(val) {
  if (val == null) return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  const s = String(val).trim();
  if (!s) return null;
  const parts = s.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function formatHMS(sec) {
  if (sec == null || isNaN(sec)) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Recharts v3 dataKey works with any string, but to be safe
// we sanitize to a stable ASCII-friendly key.
function sanitizeKey(name, idx) {
  const base = String(name || `athlete_${idx}`)
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `a${idx}_${base || 'x'}`;
}

function colorFor(division, idx) {
  const key = (division || '').toUpperCase();
  const base = DIVISION_COLORS[key] || DIVISION_COLORS.DEFAULT;
  // light variation per athlete inside a division
  const variants = [base, base + 'cc', base + '99', base + 'dd', base + 'bb'];
  return variants[idx % variants.length];
}

export default function CumulativeTimeChart({ athletes = [] }) {
  // Top 10 by rank
  const top10 = useMemo(() => {
    return [...athletes]
      .filter((a) => a && a.name)
      .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))
      .slice(0, 10)
      .map((a, idx) => ({
        ...a,
        _key: sanitizeKey(a.display_name || a.name, idx),
        _color: colorFor(a.division, idx),
        _idx: idx,
      }));
  }, [athletes]);

  const [hidden, setHidden] = useState({});

  // Build chartData: 16 rows, each with one key per athlete (sanitized)
  const chartData = useMemo(() => {
    // Per athlete: compute cumulative seconds per segment index 0..15
    const cumPerAthlete = top10.map((a) => {
      const segs = new Array(16).fill(null);
      let cum = 0;
      let broken = false;
      // run_times array preferred; fallback to splits[RUN_KEYS[i]]
      const runs = Array.isArray(a.run_times) ? a.run_times : null;
      for (let i = 0; i < 8; i++) {
        const runSec =
          (runs && parseTime(runs[i])) ??
          parseTime(a.splits?.[RUN_KEYS[i]]);
        if (runSec == null || broken) {
          broken = true;
          segs[i * 2] = null;
        } else {
          cum += runSec;
          segs[i * 2] = cum;
        }
        const stSec = parseTime(a.splits?.[STATION_KEYS[i]]);
        if (stSec == null || broken) {
          broken = true;
          segs[i * 2 + 1] = null;
        } else {
          cum += stSec;
          segs[i * 2 + 1] = cum;
        }
      }
      // If we have a total_seconds and the last segment is missing, anchor it
      if (segs[15] == null && a.total_seconds && !broken) {
        segs[15] = a.total_seconds;
      }
      return segs;
    });

    return SEGMENT_LABELS.map((label, i) => {
      const row = { segment: label };
      top10.forEach((a, ai) => {
        row[a._key] = cumPerAthlete[ai][i];
      });
      return row;
    });
  }, [top10]);

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
    title: {
      fontSize: '22px',
      fontWeight: 700,
      margin: '0 0 8px 0',
      color: '#fff',
    },
    desc: {
      fontSize: '14px',
      color: '#9ca3af',
      lineHeight: 1.55,
      marginBottom: '18px',
    },
    legend: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '16px',
    },
    chip: (color, off) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      borderRadius: '999px',
      border: `1px solid ${off ? '#2a3041' : color}`,
      background: off ? '#0f1117' : '#1a1f2e',
      color: off ? '#6b7280' : '#e5e7eb',
      fontSize: '12px',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.15s ease',
    }),
    dot: (color) => ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
    }),
    empty: {
      color: '#6b7280',
      fontSize: 14,
      textAlign: 'center',
      padding: '40px 20px',
    },
  };

  // Map sanitized key -> athlete name for tooltip
  const keyToName = useMemo(() => {
    const m = {};
    top10.forEach((a) => { m[a._key] = a.display_name || a.name; });
    return m;
  }, [top10]);

  if (top10.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2 style={styles.title}>📈 Heildartími í gegnum brautina</h2>
          <div style={styles.empty}>Engin gögn í boði.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>📈 Heildartími í gegnum brautina</h2>
        <p style={styles.desc}>
          Línuritið sýnir uppsafnaðan tíma efstu 10 keppenda í gegnum öll 16 stig keppninnar
          (8 hlaup og 8 stöðvar til skiptis). Þeir sem halda lægri línu eru framar í
          keppninni, og bilið milli lína sýnir hvar tíminn vinnst eða tapast. Smelltu á
          nafn keppanda fyrir neðan til að fela eða sýna línuna hans.
        </p>

        <div style={{ width: '100%', height: 460 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 24, bottom: 40, left: 16 }}
            >
              <CartesianGrid stroke="#2a3041" strokeDasharray="3 3" />
              <XAxis
                dataKey="segment"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={formatHMS}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f1117',
                  border: '1px solid #2a3041',
                  borderRadius: '6px',
                  color: '#e5e7eb',
                }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#e5e7eb' }}
                formatter={(value, key) => [formatHMS(value), keyToName[key] || key]}
              />
              {top10.map((a) => {
                if (hidden[a._key]) return null;
                return (
                  <Line
                    key={a._key}
                    type="monotone"
                    dataKey={a._key}
                    name={a.display_name || a.name}
                    stroke={a._color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: a._color, stroke: a._color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.legend}>
          {top10.map((a) => {
            const off = !!hidden[a._key];
            return (
              <span
                key={a._key}
                style={styles.chip(a._color, off)}
                onClick={() =>
                  setHidden((prev) => ({ ...prev, [a._key]: !prev[a._key] }))
                }
                title="Smelltu til að fela/sýna"
              >
                <span style={styles.dot(off ? '#374151' : a._color)} />
                #{a.rank ?? a._idx + 1} {a.display_name || a.name}
                <span style={{ color: '#6b7280', marginLeft: 4 }}>
                  {a.division || ''}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
