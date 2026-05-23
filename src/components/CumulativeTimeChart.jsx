import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

const RUN_KEYS = [
  'Hlaup 1', 'Hlaup 2', 'Hlaup 3', 'Hlaup 4',
  'Hlaup 5', 'Hlaup 6', 'Hlaup 7', 'Hlaup 8',
];

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

const DIVISION_COLORS = {
  KK: '#3b82f6',
  KVK: '#ec4899',
  PRO: '#f59e0b',
  OPEN: '#10b981',
  DEFAULT: '#a78bfa',
};

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

function formatHMS(sec) {
  if (sec == null || isNaN(sec)) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function colorFor(division, idx) {
  const key = (division || '').toUpperCase();
  const base = DIVISION_COLORS[key] || DIVISION_COLORS.DEFAULT;
  // small variation per athlete within a division
  const palette = [base, base + 'cc', base + '99'];
  return palette[idx % palette.length] || base;
}

export default function CumulativeTimeChart({ athletes = [] }) {
  const top10 = useMemo(() => {
    return [...athletes]
      .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))
      .slice(0, 10);
  }, [athletes]);

  const [hidden, setHidden] = useState({});

  const data = useMemo(() => {
    // build per-athlete cumulative arrays
    const perAthlete = top10.map((a) => {
      const segs = [];
      let cum = 0;
      for (let i = 0; i < 8; i++) {
        const run = parseTime(a.splits?.[RUN_KEYS[i]]);
        cum += run || 0;
        segs.push({ ok: run != null, cum });
        const stat = parseTime(a.splits?.[STATION_KEYS[i]]);
        cum += stat || 0;
        segs.push({ ok: stat != null, cum });
      }
      return segs;
    });

    return SEGMENT_LABELS.map((label, i) => {
      const row = { segment: label };
      top10.forEach((a) => {
        const seg = perAthlete[top10.indexOf(a)][i];
        row[a.name] = seg.ok ? seg.cum : null;
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
      marginTop: '12px',
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
    }),
    dot: (color) => ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: color,
    }),
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
        <h2 style={styles.title}>📈 Heildartími í gegnum brautina</h2>
        <p style={styles.desc}>
          Línuritið sýnir uppsafnaðan tíma efstu 10 keppenda í gegnum öll 16 stig keppninnar
          (8 hlaup og 8 stöðvar til skiptis). Þeir sem halda lægri línu eru framar í
          keppninni, og bilið milli lína sýnir hvar tíminn vinnst eða tapast. Smelltu á nafn
          keppanda í lýsingunni að neðan til að fela eða sýna línuna hans og einbeita þér
          að ákveðnum samanburði.
        </p>

        <div style={{ width: '100%', height: 460 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 24, bottom: 40, left: 16 }}>
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
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => formatHMS(value)}
              />
              <Legend wrapperStyle={{ display: 'none' }} />
              {top10.map((a, idx) => {
                if (hidden[a.name]) return null;
                const color = colorFor(a.division, idx);
                return (
                  <Line
                    key={a.name}
                    type="monotone"
                    dataKey={a.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color }}
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
          {top10.map((a, idx) => {
            const color = colorFor(a.division, idx);
            const off = !!hidden[a.name];
            return (
              <span
                key={a.name}
                style={styles.chip(color, off)}
                onClick={() =>
                  setHidden((prev) => ({ ...prev, [a.name]: !prev[a.name] }))
                }
                title="Smelltu til að fela/sýna"
              >
                <span style={styles.dot(off ? '#374151' : color)} />
                #{a.rank ?? idx + 1} {a.name}
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
