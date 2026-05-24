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
import { T, DIVISION_COLORS } from '../theme.js';

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
    <div style={T.tooltip}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: T.white, fontFamily: T.font }}>{d.display_name || d.name}</div>
      {d.members && d.members.length > 1 && (
        <div style={{ color: T.gray, fontSize: 11, marginBottom: 2, fontFamily: T.font }}>
          {d.members.join(' · ')}
        </div>
      )}
      {d.club && !d.members?.length && <div style={{ color: T.gray, fontSize: 12, fontFamily: T.font }}>{d.club}</div>}
      <div style={{ color: d.color, fontSize: 12, marginTop: 2, fontFamily: T.font }}>{d.division}</div>
      <div style={{ marginTop: 6, fontWeight: 600, fontFamily: T.font }}>{formatHMS(d.total_seconds)}</div>
    </div>
  );
}

// Custom shape function for recharts v3 — replaces deprecated <Cell> usage.
// Receives bar geometry (x, y, width, height) plus the entry's `payload` row.
function ColoredBar(props) {
  const { x, y, width, height, payload, radius = 0 } = props;
  const fill = (payload && payload.color) || DIVISION_COLORS.default;
  const r = Math.min(radius, width / 2, height / 2) || 0;
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

const RANK_LABEL = ['1', '2', '3', '4', '5'];

export default function FinishTimesChart({ athletes = [], category = 'einstaklingar' }) {
  const sorted = useMemo(() => {
    return (athletes || [])
      .filter((a) => Number(a.total_seconds || 0) > 0)
      .map((a) => ({
        ...a,
        total_seconds: Number(a.total_seconds) || 0,
        short: a.display_name ? a.display_name : shortName(a.name),
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
    <div style={T.card}>
      <h2 style={T.sectionTitle}>
        Heildarúrslit — Lokatími allra keppenda
      </h2>
      <p style={{ ...T.subTitle, lineHeight: 1.5 }}>
        Hér sjást lokatímar allra keppenda í {category === 'para' ? 'pörum' : 'einstaklingsflokki'},
        raðaðir frá fljótasta til hægasta. Litir tákna mismunandi flokka. Strikalínan sýnir
        meðaltíma — keppendur vinstra megin við línuna eru hraðari en meðaltalið.
      </p>

      {/* Main chart — explicit height wrapper required for ResponsiveContainer in recharts v3 */}
      <div style={{ ...T.chartArea, width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis
              dataKey="short"
              stroke={T.gray}
              tick={{ fill: T.gray, fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              stroke={T.gray}
              tick={{ fill: T.gray, fontSize: 11 }}
              tickFormatter={formatHM}
              domain={[minTime, (dataMax) => Math.ceil(dataMax * 1.02)]}
              allowDataOverflow={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,237,0,0.06)' }} />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke={T.yellow}
                strokeDasharray="4 4"
                label={{
                  value: `Meðaltal ${formatHM(avg)}`,
                  fill: T.yellow,
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
          <h3 style={{ ...T.sectionTitle, fontSize: 15, marginBottom: 12 }}>Top 5 — Verðlaunapallur</h3>
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
                  ...T.rankCard,
                  borderLeft: `4px solid ${a.color}`,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6, fontWeight: 900, color: T.yellow, fontFamily: T.font }}>{RANK_LABEL[i]}</div>
                <div style={{ fontWeight: 700, color: T.white, fontSize: 14, fontFamily: T.font }}>{a.display_name || a.name}</div>
                {a.club && (
                  <div style={{ color: T.gray, fontSize: 12, marginTop: 2, fontFamily: T.font }}>{a.club}</div>
                )}
                <div style={{ color: a.color, fontSize: 11, marginTop: 4, fontWeight: 600, fontFamily: T.font }}>
                  {a.division}
                </div>
                <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: T.white, fontFamily: T.font }}>
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
          <h3 style={{ ...T.sectionTitle, fontSize: 15, marginBottom: 12 }}>
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
                  ...T.rankCard,
                  borderTop: `3px solid ${s.color}`,
                }}
              >
                <div style={{ color: s.color, fontWeight: 700, fontSize: 13, fontFamily: T.font }}>{s.label}</div>
                <div style={{ color: T.gray, fontSize: 11, marginTop: 4, fontFamily: T.font }}>
                  {s.count} keppendur
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: T.white, fontFamily: T.font }}>
                  <div>Bestur: <strong>{formatHMS(s.best.total_seconds)}</strong></div>
                  <div style={{ color: T.gray }}>{s.best.name}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: T.gray, fontFamily: T.font }}>
                  Meðaltími: {formatHMS(s.avg)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: T.grayDim, padding: 32, fontFamily: T.font }}>
          Engin gögn til staðar.
        </div>
      )}
    </div>
  );
}
