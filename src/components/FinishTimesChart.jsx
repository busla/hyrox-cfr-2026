import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const DIVISION_COLORS = {
  'Pro KK': '#f97316',
  'Open KK': '#3b82f6',
  'Pro KVK': '#ec4899',
  'Open KVK': '#a855f7',
  MIXED: '#22c55e',
  default: '#64748b',
};

function colorForDivision(division) {
  if (!division) return DIVISION_COLORS.default;
  const d = division.toString();
  const hasPro = /pro/i.test(d);
  const hasOpen = /open/i.test(d);
  const hasKVK = /kvk/i.test(d);
  const hasKK = /kk/i.test(d) && !hasKVK;
  if (hasPro && hasKK) return DIVISION_COLORS['Pro KK'];
  if (hasOpen && hasKK) return DIVISION_COLORS['Open KK'];
  if (hasPro && hasKVK) return DIVISION_COLORS['Pro KVK'];
  if (hasOpen && hasKVK) return DIVISION_COLORS['Open KVK'];
  if (/mixed|mix/i.test(d)) return DIVISION_COLORS.MIXED;
  return DIVISION_COLORS.default;
}

function divisionLabel(division) {
  if (!division) return 'Annað';
  const d = division.toString();
  const hasPro = /pro/i.test(d);
  const hasOpen = /open/i.test(d);
  const hasKVK = /kvk/i.test(d);
  const hasKK = /kk/i.test(d) && !hasKVK;
  if (hasPro && hasKK) return 'Pro KK';
  if (hasOpen && hasKK) return 'Open KK';
  if (hasPro && hasKVK) return 'Pro KVK';
  if (hasOpen && hasKVK) return 'Open KVK';
  if (/mixed|mix/i.test(d)) return 'MIXED';
  return d;
}

function formatHM(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatHMS(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shortName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#1a1f2e',
        border: '1px solid #2d3548',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#e5e7eb',
        fontSize: 13,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#f9fafb' }}>{d.name}</div>
      {d.club && <div style={{ color: '#9ca3af', fontSize: 12 }}>{d.club}</div>}
      <div style={{ color: d.color, fontSize: 12, marginTop: 2 }}>{d.division}</div>
      <div style={{ marginTop: 6, fontWeight: 600 }}>⏱ {formatHMS(d.total_seconds)}</div>
    </div>
  );
}

// Custom shape function for recharts v3 — replaces deprecated <Cell> usage.
// Receives bar geometry (x, y, width, height) plus the entry's `payload` row.
function ColoredBar(props) {
  const { x, y, width, height, payload, radius = 4 } = props;
  const fill = (payload && payload.color) || DIVISION_COLORS.default;
  const r = Math.min(radius, width / 2, height / 2) || 0;
  // Render a rounded-top rectangle via path so radius prop survives the shape override
  if (height <= 0 || width <= 0) return null;
  const path = `
    M ${x},${y + r}
    Q ${x},${y} ${x + r},${y}
    L ${x + width - r},${y}
    Q ${x + width},${y} ${x + width},${y + r}
    L ${x + width},${y + height}
    L ${x},${y + height}
    Z
  `;
  return <path d={path} fill={fill} />;
}

const RANK_EMOJI = ['🥇', '🥈', '🥉', '#4', '#5'];

export default function FinishTimesChart({ athletes = [], category = 'einstaklingar' }) {
  const sorted = useMemo(() => {
    return (athletes || [])
      .filter((a) => Number(a.total_seconds || 0) > 0)
      .map((a) => ({
        ...a,
        total_seconds: Number(a.total_seconds) || 0,
        short: shortName(a.name),
        color: colorForDivision(a.division),
      }))
      .sort((a, b) => a.total_seconds - b.total_seconds);
  }, [athletes]);

  const avg = useMemo(() => {
    if (!sorted.length) return 0;
    const total = sorted.reduce((s, a) => s + a.total_seconds, 0);
    return total / sorted.length;
  }, [sorted]);

  const minTime = useMemo(() => {
    if (!sorted.length) return 0;
    return Math.max(0, Math.floor(sorted[0].total_seconds * 0.95));
  }, [sorted]);

  const podium = sorted.slice(0, 5);

  const divisionStats = useMemo(() => {
    const map = new Map();
    sorted.forEach((a) => {
      const label = divisionLabel(a.division);
      if (!map.has(label)) {
        map.set(label, {
          label,
          color: colorForDivision(a.division),
          count: 0,
          totalSecs: 0,
          best: a,
        });
      }
      const s = map.get(label);
      s.count += 1;
      s.totalSecs += a.total_seconds;
      if (a.total_seconds < s.best.total_seconds) s.best = a;
    });
    return Array.from(map.values()).map((s) => ({
      ...s,
      avg: s.totalSecs / s.count,
    }));
  }, [sorted]);

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
        🏆 Heildarúrslit — Lokatími allra keppenda
      </h2>
      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
        Hér sjást lokatímar allra keppenda í {category === 'para' ? 'pörum' : 'einstaklingsflokki'},
        raðaðir frá fljótasta til hægasta. Litir tákna mismunandi flokka. Strikalínan sýnir
        meðaltíma — keppendur undir línunni eru fyrir ofan meðaltal í hraða.
      </p>

      {/* Main chart — explicit height wrapper required for ResponsiveContainer in recharts v3 */}
      <div style={{ width: '100%', height: 400, background: '#1a1f2e', borderRadius: 10, padding: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
            <XAxis
              dataKey="short"
              stroke="#9ca3af"
              tick={{ fill: '#e5e7eb', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={formatHM}
              domain={[minTime, (dataMax) => Math.ceil(dataMax * 1.02)]}
              allowDataOverflow={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="#fbbf24"
                strokeDasharray="4 4"
                label={{
                  value: `Meðaltal ${formatHM(avg)}`,
                  fill: '#fbbf24',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
            )}
            <Bar
              dataKey="total_seconds"
              isAnimationActive={false}
              shape={<ColoredBar />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 podium */}
      {podium.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#f9fafb' }}>Top 5 — Verðlaunapallur</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {podium.map((a, i) => (
              <div
                key={i}
                style={{
                  background: '#1a1f2e',
                  borderRadius: 10,
                  padding: '14px 16px',
                  borderLeft: `4px solid ${a.color}`,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{RANK_EMOJI[i]}</div>
                <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 14 }}>{a.name}</div>
                {a.club && (
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{a.club}</div>
                )}
                <div style={{ color: a.color, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                  {a.division}
                </div>
                <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#e5e7eb' }}>
                  {formatHMS(a.total_seconds)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Division stats */}
      {divisionStats.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#f9fafb' }}>
            Flokkasundurliðun
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {divisionStats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#1a1f2e',
                  borderRadius: 10,
                  padding: '12px 14px',
                  borderTop: `3px solid ${s.color}`,
                }}
              >
                <div style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                  {s.count} keppendur
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#e5e7eb' }}>
                  <div>Bestur: <strong>{formatHMS(s.best.total_seconds)}</strong></div>
                  <div style={{ color: '#9ca3af' }}>{s.best.name}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
                  Meðaltími: {formatHMS(s.avg)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
          Engin gögn til staðar.
        </div>
      )}
    </div>
  );
}
