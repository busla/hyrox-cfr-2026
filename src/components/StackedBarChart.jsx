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
  Cell,
  LabelList,
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
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#f9fafb' }}>{d.name}</div>
      <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 8 }}>{d.division}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#3b82f6' }}>● Hlaup:</span>
        <span>{formatTime(d.run_total)} ({runPct}%)</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#f97316' }}>● Stöðvar:</span>
        <span>{formatTime(d.station_total)} ({stationPct}%)</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid #2d3548',
          fontWeight: 600,
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
      .filter((a) => (a.total_seconds || 0) > 0)
      .sort((a, b) => (a.total_seconds || 0) - (b.total_seconds || 0))
      .map((a) => ({
        name: a.name,
        short: shortName(a.name),
        run_total: a.run_total || 0,
        station_total: a.station_total || 0,
        total_seconds: a.total_seconds || 0,
        division: a.division,
      }));
  }, [athletes, division]);

  const chartHeight = Math.max(320, data.length * 28 + 80);

  return (
    <div
      style={{
        background: '#0f1117',
        borderRadius: 12,
        padding: '20px 20px 24px',
        color: '#e5e7eb',
      }}
    >
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
        <h2 style={{ margin: 0, fontSize: 20, color: '#f9fafb' }}>
          📊 Tímaúthlutun — Hlaup vs stöðvar
        </h2>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          style={{
            background: '#1a1f2e',
            color: '#e5e7eb',
            border: '1px solid #2d3548',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
          }}
        >
          <option value="all">Allir flokkar</option>
          {divisions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>
        Súluritið sýnir hvernig heildartíma hvers keppanda skiptist milli hlaupa (8×1 km) og
        vinnustöðva. Lengri blá svæði þýða meiri hlaupatíma; lengri appelsínugul svæði þýða meiri
        tíma á stöðvunum. Þetta afhjúpar styrkleika og veikleika — hver er sterkur hlaupari og hver
        afgreiðir stöðvarnar hraðast.
      </p>

      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatTime(v)}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="short"
              stroke="#9ca3af"
              tick={{ fill: '#e5e7eb', fontSize: 11 }}
              width={90}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              wrapperStyle={{ color: '#e5e7eb', fontSize: 12 }}
              formatter={(value) => (value === 'run_total' ? 'Hlaup' : 'Stöðvar')}
            />
            <Bar dataKey="run_total" stackId="t" fill="#3b82f6" name="run_total">
              {data.map((_, i) => (
                <Cell key={`r-${i}`} fill="#3b82f6" />
              ))}
            </Bar>
            <Bar dataKey="station_total" stackId="t" fill="#f97316" name="station_total">
              {data.map((_, i) => (
                <Cell key={`s-${i}`} fill="#f97316" />
              ))}
              <LabelList
                dataKey="total_seconds"
                position="right"
                formatter={(v) => formatTime(v)}
                style={{ fill: '#e5e7eb', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
          Engin gögn til að sýna fyrir valinn flokk.
        </div>
      )}
    </div>
  );
}
