import { useState, useMemo } from 'react';
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

function shortName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const total = (d.run_total || 0) + (d.station_total || 0);
  const runPct = total > 0 ? ((d.run_total / total) * 100).toFixed(1) : '0.0';
  const stationPct = total > 0 ? ((d.station_total / total) * 100).toFixed(1) : '0.0';

  return (
    <div style={T.tooltip}>
      <div style={{ fontWeight: 900, marginBottom: 6, color: T.white, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }}>{d.name}</div>
      {d.division && (
        <div style={{ color: T.gray, fontSize: 11, marginBottom: 8, fontFamily: T.font }}>{d.division}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: T.font }}>
        <span style={{ color: T.yellow }}>Hlaup:</span>
        <span>{formatTime(d.run_total)} ({runPct}%)</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: T.font }}>
        <span style={{ color: T.gray }}>Stöðvar:</span>
        <span>{formatTime(d.station_total)} ({stationPct}%)</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${T.border}`,
          fontWeight: 700,
          fontFamily: T.font,
        }}
      >
        <span>Heild:</span>
        <span>{formatTime(total)}</span>
      </div>
    </div>
  );
}

export default function StackedBarChart({ athletes = [] }) {
  const divisions = useMemo(() => {
    const set = new Set();
    athletes.forEach((a) => {
      if (a.division) set.add(a.division);
    });
    return Array.from(set).sort();
  }, [athletes]);

  const [division, setDivision] = useState('all');

  const data = useMemo(() => {
    return athletes
      .filter((a) => (division === 'all' ? true : a.division === division))
      .filter((a) => Number(a.total_seconds || 0) > 0)
      .sort((a, b) => Number(a.total_seconds || 0) - Number(b.total_seconds || 0))
      .map((a) => ({
        name: a.display_name || a.name,
        short: a.display_name ? a.display_name : shortName(a.name),
        run_total: Number(a.run_total) || 0,
        station_total: Number(a.station_total) || 0,
        total_seconds: Number(a.total_seconds) || 0,
        division: a.division,
      }));
  }, [athletes, division]);

  const chartHeight = Math.max(320, data.length * 28 + 80);

  return (
    <div style={T.card}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <h2 style={T.sectionTitle}>
          Tímaúthlutun — Hlaup vs stöðvar
        </h2>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          style={{
            background: '#111',
            color: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: 0,
            padding: '6px 10px',
            fontSize: 13,
            fontFamily: T.font,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          <option value="all">Allir flokkar</option>
          {divisions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <p style={{ ...T.subTitle, lineHeight: 1.5, textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 13 }}>
        Súluritið sýnir hvernig heildartíma hvers keppanda skiptist milli hlaupa (8×1 km) og
        vinnustöðva. Lengri gul svæði þýða meiri hlaupatíma; lengri grá svæði þýða meiri
        tíma á stöðvunum. Þetta afhjúpar styrkleika og veikleika — hver er sterkur hlaupari og hver
        afgreiðir stöðvarnar hraðast. Heildartími hvers keppanda sést í tooltip þegar bendillinn er
        yfir súlu.
      </p>

      {/* Explicit-height wrapper required for ResponsiveContainer in recharts v3 */}
      <div style={{ ...T.chartArea, width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatTime(v)}
              stroke={T.gray}
              tick={{ fill: T.gray, fontSize: 11 }}
              domain={[0, (dataMax) => Math.ceil(dataMax * 1.05)]}
            />
            <YAxis
              type="category"
              dataKey="short"
              stroke={T.gray}
              tick={{ fill: T.white, fontSize: 11 }}
              width={90}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,237,0,0.06)' }} />
            <Legend
              wrapperStyle={{ color: T.white, fontSize: 12, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }}
              formatter={(value) => (value === 'run_total' ? 'Hlaup' : 'Stöðvar')}
            />
            <Bar
              dataKey="run_total"
              stackId="t"
              fill={T.yellow}
              name="run_total"
              isAnimationActive={false}
            />
            <Bar
              dataKey="station_total"
              stackId="t"
              fill={T.grayDim}
              name="station_total"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div style={{ textAlign: 'center', color: T.grayDim, padding: 32, fontFamily: T.font }}>
          Engin gögn til að sýna fyrir valinn flokk.
        </div>
      )}
    </div>
  );
}
