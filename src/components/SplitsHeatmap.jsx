import React, { useState, useMemo } from 'react';

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

const DIVISIONS = ['Allt', 'KK', 'KVK', 'PRO', 'OPEN'];

function parseSplit(val) {
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
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function lerpColor(a, b, t) {
  const ah = a.match(/\w\w/g).map((x) => parseInt(x, 16));
  const bh = b.match(/\w\w/g).map((x) => parseInt(x, 16));
  const r = Math.round(ah[0] + (bh[0] - ah[0]) * t);
  const g = Math.round(ah[1] + (bh[1] - ah[1]) * t);
  const bl = Math.round(ah[2] + (bh[2] - ah[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function colorForDelta(delta, maxAbs) {
  // delta < 0 => faster than avg => green; delta > 0 => slower => red
  const NEUTRAL = '1e2535';
  const GREEN = '22c55e';
  const RED = 'ef4444';
  if (maxAbs === 0 || delta == null) return `#${NEUTRAL}`;
  const t = Math.max(-1, Math.min(1, delta / maxAbs));
  if (t < 0) return lerpColor(NEUTRAL, GREEN, -t);
  return lerpColor(NEUTRAL, RED, t);
}

export default function SplitsHeatmap({ athletes = [] }) {
  const [division, setDivision] = useState('Allt');

  const filtered = useMemo(() => {
    const list = division === 'Allt'
      ? athletes
      : athletes.filter((a) => (a.division || '').toUpperCase() === division);
    return [...list].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
  }, [athletes, division]);

  const { averages, maxAbsDelta } = useMemo(() => {
    const sums = new Array(STATION_KEYS.length).fill(0);
    const counts = new Array(STATION_KEYS.length).fill(0);
    filtered.forEach((a) => {
      STATION_KEYS.forEach((k, i) => {
        const v = parseSplit(a.splits?.[k]);
        if (v != null) {
          sums[i] += v;
          counts[i] += 1;
        }
      });
    });
    const avg = sums.map((s, i) => (counts[i] ? s / counts[i] : null));
    let maxAbs = 0;
    filtered.forEach((a) => {
      STATION_KEYS.forEach((k, i) => {
        const v = parseSplit(a.splits?.[k]);
        if (v != null && avg[i] != null) {
          const d = Math.abs(v - avg[i]);
          if (d > maxAbs) maxAbs = d;
        }
      });
    });
    return { averages: avg, maxAbsDelta: maxAbs };
  }, [filtered]);

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
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px',
    },
    label: { fontSize: '13px', color: '#9ca3af' },
    select: {
      background: '#0f1117',
      color: '#e5e7eb',
      border: '1px solid #2a3041',
      borderRadius: '6px',
      padding: '6px 10px',
      fontSize: '14px',
    },
    tableWrap: { overflowX: 'auto' },
    table: { borderCollapse: 'separate', borderSpacing: '4px', width: '100%' },
    th: {
      fontSize: '12px',
      color: '#9ca3af',
      fontWeight: 600,
      padding: '8px 6px',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    thLeft: {
      fontSize: '12px',
      color: '#9ca3af',
      fontWeight: 600,
      padding: '8px 6px',
      textAlign: 'left',
    },
    nameCell: {
      padding: '6px 10px',
      fontSize: '13px',
      whiteSpace: 'nowrap',
      color: '#e5e7eb',
      background: '#0f1117',
      borderRadius: '6px',
    },
    rankCell: {
      padding: '6px 10px',
      fontSize: '12px',
      color: '#9ca3af',
      background: '#0f1117',
      borderRadius: '6px',
      textAlign: 'center',
    },
    cell: {
      padding: '8px 10px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#fff',
      borderRadius: '6px',
      textAlign: 'center',
      minWidth: '64px',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    },
    legend: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '16px',
      fontSize: '12px',
      color: '#9ca3af',
    },
    swatch: (c) => ({
      display: 'inline-block',
      width: '14px',
      height: '14px',
      borderRadius: '3px',
      background: c,
      verticalAlign: 'middle',
      marginRight: '4px',
    }),
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔥 Hitakort — Tími á hverri stöð</h2>
        <p style={styles.desc}>
          Hér sést hitakort yfir tímann sem hver keppandi tók á hverri af 8 stöðvunum í Hyrox.
          Grænir reitir tákna hraðari tíma en meðaltal stöðvarinnar, rauðir reitir tákna hægari
          tíma. Þannig má fljótt greina styrkleika og veikleika hvers keppanda — hverjir
          rífa á Ski-Erg, hverjir tapa tíma í Bændagöngu og svo framvegis. Notaðu síuna að
          neðan til að bera saman keppendur innan sömu deildar.
        </p>

        <div style={styles.controls}>
          <span style={styles.label}>Deild:</span>
          <select
            style={styles.select}
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span style={{ ...styles.label, marginLeft: 'auto' }}>
            {filtered.length} keppendur
          </span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thLeft}>#</th>
                <th style={styles.thLeft}>Keppandi</th>
                {STATION_LABELS.map((s) => (
                  <th key={s} style={styles.th}>{s}</th>
                ))}
              </tr>
              <tr>
                <th style={styles.thLeft}></th>
                <th style={styles.thLeft} title="Meðaltími á hverri stöð">Meðaltal</th>
                {averages.map((a, i) => (
                  <th key={i} style={{ ...styles.th, color: '#6b7280' }}>
                    {formatMMSS(a)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((athlete, idx) => (
                <tr key={`${athlete.name}-${idx}`}>
                  <td style={styles.rankCell}>{athlete.rank ?? idx + 1}</td>
                  <td style={styles.nameCell}>
                    {athlete.name}
                    {athlete.division ? (
                      <span style={{ color: '#6b7280', marginLeft: 6, fontSize: 11 }}>
                        {athlete.division}
                      </span>
                    ) : null}
                  </td>
                  {STATION_KEYS.map((k, i) => {
                    const v = parseSplit(athlete.splits?.[k]);
                    const avg = averages[i];
                    const delta = v != null && avg != null ? v - avg : null;
                    const bg = colorForDelta(delta, maxAbsDelta);
                    return (
                      <td
                        key={k}
                        style={{ ...styles.cell, background: bg }}
                        title={
                          v != null && avg != null
                            ? `${formatMMSS(v)} (${delta >= 0 ? '+' : ''}${Math.round(delta)}s vs meðaltal)`
                            : 'Engin gögn'
                        }
                      >
                        {formatMMSS(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.legend}>
          <span><span style={styles.swatch('#22c55e')} />Hraðari en meðaltal</span>
          <span><span style={styles.swatch('#1e2535')} />Meðaltal</span>
          <span><span style={styles.swatch('#ef4444')} />Hægari en meðaltal</span>
        </div>
      </div>
    </div>
  );
}
