import { useMemo, useState } from 'react';
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
import { Target } from 'lucide-react';
import { T } from '../theme.js';

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

const EVENT_COLORS = [T.yellow, '#60a5fa', '#4ade80'];
const GREEN = '#22c55e'; // faster / improved
const RED = '#ef4444'; // slower / regressed

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

function fmtMMSS(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const sign = sec < 0 ? '-' : '';
  const v = Math.abs(Math.round(sec));
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

function fmtHMS(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const v = Math.round(sec);
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const s = v % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function signedMMSS(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const sign = sec > 0 ? '+' : sec < 0 ? '−' : '±';
  return `${sign}${fmtMMSS(Math.abs(sec))}`;
}

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* Segment definitions used across the delta table and "where to improve".
   Stations + aggregate running + aggregate stations + total. */
function segmentsFor(a) {
  if (!a) return {};
  const seg = {};
  STATION_KEYS.forEach((k, i) => {
    seg[STATION_LABELS[i]] = parseTime(a.splits?.[k]);
  });
  seg['Hlaup (samtals)'] = a.run_total ?? (a.run_times ? a.run_times.reduce((x, y) => x + y, 0) : null);
  seg['Stöðvar (samtals)'] = a.station_total ?? null;
  seg['Heild'] = a.total_seconds ?? null;
  return seg;
}

export default function ProgressionChart({ seriesData, category = 'einstaklingar' }) {
  const completedEvents = useMemo(
    () => ((seriesData && seriesData.events) || []).filter((e) => e.status === 'lokið'),
    [seriesData]
  );

  // Group finishers by normalized identity across events; keep the fastest
  // entry per event (handles a name entered twice in one event).
  const byId = useMemo(() => {
    const map = new Map();
    completedEvents.forEach((ev) => {
      const list = ev[category]?.overall || [];
      list.forEach((a) => {
        if (!a.total_seconds) return;
        const idKey = category === 'para' ? norm(a.team_name || a.name) : norm(a.name);
        if (!idKey) return;
        if (!map.has(idKey)) map.set(idKey, { label: a.team_name || a.name, byEvent: new Map() });
        const entry = map.get(idKey);
        const prev = entry.byEvent.get(ev.name);
        if (!prev || a.total_seconds < prev.total_seconds) {
          entry.byEvent.set(ev.name, a);
        }
      });
    });
    return map;
  }, [completedEvents, category]);

  // Candidates = competed (finished) in >= 2 distinct completed events.
  const candidates = useMemo(() => {
    const out = [];
    byId.forEach((v, k) => {
      if (v.byEvent.size >= 2) out.push({ key: k, label: v.label, count: v.byEvent.size });
    });
    return out.sort((a, b) => a.label.localeCompare(b.label, 'is'));
  }, [byId]);

  // Effective selection is derived, so switching category (which changes the
  // candidate list) transparently falls back to the first candidate.
  const [selected, setSelected] = useState('');
  const effectiveKey = candidates.some((c) => c.key === selected)
    ? selected
    : (candidates[0]?.key ?? '');

  const chosen = byId.get(effectiveKey);

  // Per-event entries for the chosen competitor, in event order.
  const timeline = useMemo(() => {
    if (!chosen) return [];
    return completedEvents
      .map((ev) => ({ event: ev.name, athlete: chosen.byEvent.get(ev.name) }))
      .filter((x) => x.athlete);
  }, [chosen, completedEvents]);

  const shortEv = (name) => name.split('—')[0].trim();

  // Station-by-station grouped bar data (one series per event).
  const stationData = useMemo(() => {
    return STATION_KEYS.map((k, i) => {
      const row = { station: STATION_LABELS[i] };
      timeline.forEach((t) => {
        row[t.event] = parseTime(t.athlete.splits?.[k]);
      });
      return row;
    });
  }, [timeline]);

  // Delta table rows (stations + aggregates), first vs last event.
  const deltaRows = useMemo(() => {
    if (timeline.length < 2) return [];
    const names = ['Ski-Erg', 'Ýta sleða', 'Draga sleða', 'Burpee', 'Róður',
      'Bændaganga', 'Lunges', 'Wall Balls', 'Hlaup (samtals)', 'Stöðvar (samtals)', 'Heild'];
    const segs = timeline.map((t) => segmentsFor(t.athlete));
    return names.map((name) => {
      const vals = segs.map((s) => s[name]);
      const first = vals[0];
      const last = vals[vals.length - 1];
      const delta = first != null && last != null ? last - first : null;
      return { name, vals, delta, emphasis: name === 'Heild' };
    });
  }, [timeline]);

  // "Where to improve": compare latest race to the field (same division; falls
  // back to whole category if the division is too small).
  const improve = useMemo(() => {
    if (!timeline.length) return null;
    const last = timeline[timeline.length - 1];
    const ev = completedEvents.find((e) => e.name === last.event);
    const all = (ev?.[category]?.overall || []).filter((a) => a.total_seconds);
    let field = all.filter((a) => a.division === last.athlete.division);
    let basis = last.athlete.division;
    if (field.length < 3) { field = all; basis = 'allir'; }

    const segNames = [...STATION_LABELS, 'Hlaup (samtals)'];
    const rows = segNames.map((name) => {
      const mine = segmentsFor(last.athlete)[name];
      const fieldVals = field.map((a) => segmentsFor(a)[name]).filter((v) => v != null).sort((a, b) => a - b);
      if (mine == null || !fieldVals.length) return null;
      const best = fieldVals[0];
      const mid = fieldVals[Math.floor(fieldVals.length / 2)];
      // percentile: share of field this competitor is faster than (0..1, higher=better)
      const slower = fieldVals.filter((v) => v > mine).length;
      const pct = fieldVals.length > 1 ? slower / (fieldVals.length - 1) : 1;
      return { name, mine, best, mid, gapToMid: mine - mid, gapToBest: mine - best, pct };
    }).filter(Boolean);
    rows.sort((a, b) => b.gapToMid - a.gapToMid);
    return { basis, event: last.event, rows, fieldSize: field.length };
  }, [timeline, completedEvents, category]);

  const styles = {
    select: {
      background: '#111', color: T.white, border: `1px solid ${T.border}`,
      borderRadius: 0, padding: '8px 10px', fontSize: 14, fontFamily: T.font, minWidth: 260,
    },
    label: { fontSize: 11, color: T.gray, fontFamily: T.font, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 },
    th: { textAlign: 'left', padding: '7px 10px', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: T.gray, fontWeight: 700, borderBottom: `1px solid ${T.border}`, fontFamily: T.font, whiteSpace: 'nowrap' },
    td: { padding: '7px 10px', fontSize: 13, color: T.white, fontFamily: T.font, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' },
  };

  const tooltipStyle = {
    background: T.dark2, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.yellow}`,
    borderRadius: 0, color: T.white, fontFamily: T.font,
  };

  if (completedEvents.length < 2) {
    return (
      <div style={T.card}>
        <h2 style={T.sectionTitle}>Framför milli móta</h2>
        <p style={{ color: T.gray, fontSize: 14, marginTop: 10, fontFamily: T.font }}>
          Þarf a.m.k. tvö lokin mót til að sýna framför. Kemur þegar fleiri mót klárast.
        </p>
      </div>
    );
  }

  const catNoun = category === 'para' ? 'lið' : 'keppendur';

  return (
    <div style={T.card}>
      <h2 style={T.sectionTitle}>Framför milli móta</h2>
      <p style={{ color: T.gray, fontSize: 13, marginTop: 6, marginBottom: 16, lineHeight: 1.55, fontFamily: T.font }}>
        Fyrir {catNoun} sem keppa í fleiri en einu móti undir sama nafni: sjáðu hvernig heildartími
        og hver stöð hefur þróast milli móta — og hvar mest er að sækja miðað við keppinauta.
      </p>

      {candidates.length === 0 ? (
        <div style={{ color: T.grayDim, fontSize: 13, padding: 24, textAlign: 'center', background: T.dark2, border: `1px solid ${T.border}`, fontFamily: T.font }}>
          Engir {catNoun} hafa lokið tveimur eða fleiri mótum undir sama nafni enn.
        </div>
      ) : (
        <>
          {/* Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
            <span style={styles.label}>{category === 'para' ? 'Lið' : 'Keppandi'}</span>
            <select style={styles.select} value={effectiveKey} onChange={(e) => setSelected(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.key} value={c.key}>{c.label} · {c.count} mót</option>
              ))}
            </select>
          </div>

          {/* Overview: one card per event with time, rank, delta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 22 }}>
            {timeline.map((t, i) => {
              const prev = timeline[i - 1]?.athlete;
              const delta = prev ? t.athlete.total_seconds - prev.total_seconds : null;
              const improved = delta != null && delta < 0;
              return (
                <div key={t.event} style={{ background: T.dark2, border: `1px solid ${T.border}`, borderLeft: `3px solid ${EVENT_COLORS[i % EVENT_COLORS.length]}`, padding: '12px 14px', fontFamily: T.font }}>
                  <div style={{ fontSize: 11, color: T.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{shortEv(t.event)}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: T.white, lineHeight: 1.1, marginTop: 4 }}>{fmtHMS(t.athlete.total_seconds)}</div>
                  <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>#{t.athlete.rank} · {t.athlete.division}</div>
                  {delta != null && (
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: improved ? GREEN : RED }}>
                      {improved ? '▼' : '▲'} {signedMMSS(delta)} {improved ? 'hraðari' : 'hægari'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Station progression bar chart */}
          <h3 style={{ ...T.sectionTitle, fontSize: 16, marginBottom: 4 }}>Tími á hverri stöð — milli móta</h3>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: T.gray, fontFamily: T.font }}>
            Lægri súla = hraðari. Berðu saman hæð súlanna til að sjá hvar þú bættir þig.
          </p>
          <div style={{ ...T.chartArea, width: '100%', height: 340, marginBottom: 22 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationData} margin={{ top: 10, right: 12, bottom: 26, left: 4 }}>
                <CartesianGrid stroke="#1e1e1e" strokeDasharray="3 3" />
                <XAxis dataKey="station" stroke={T.gray} tick={{ fill: T.gray, fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis stroke={T.gray} tick={{ fill: T.gray, fontSize: 11 }} tickFormatter={fmtMMSS} width={52} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.gray, fontFamily: T.font }} formatter={(v, n) => [fmtMMSS(v), shortEv(n)]} />
                <Legend wrapperStyle={{ color: T.white, fontSize: 12, fontFamily: T.font, letterSpacing: 1, textTransform: 'uppercase' }} formatter={(v) => shortEv(v)} />
                {timeline.map((t, i) => (
                  <Bar key={t.event} dataKey={t.event} name={t.event} fill={EVENT_COLORS[i % EVENT_COLORS.length]} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Delta table */}
          <h3 style={{ ...T.sectionTitle, fontSize: 16, marginBottom: 10 }}>Breyting frá fyrsta til síðasta móts</h3>
          <div style={{ overflowX: 'auto', marginBottom: 22 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
              <thead>
                <tr>
                  <th style={styles.th}>Hluti</th>
                  {timeline.map((t) => <th key={t.event} style={{ ...styles.th, textAlign: 'right' }}>{shortEv(t.event)}</th>)}
                  <th style={{ ...styles.th, textAlign: 'right' }}>Breyting</th>
                </tr>
              </thead>
              <tbody>
                {deltaRows.map((r) => {
                  const improved = r.delta != null && r.delta < 0;
                  const same = r.delta === 0;
                  return (
                    <tr key={r.name} style={r.emphasis ? { background: T.yellowDim } : undefined}>
                      <td style={{ ...styles.td, fontWeight: r.emphasis ? 900 : 400, color: r.emphasis ? T.yellow : T.white }}>{r.name}</td>
                      {r.vals.map((v, i) => (
                        <td key={i} style={{ ...styles.td, textAlign: 'right', color: T.gray }}>{v == null ? '—' : (r.name === 'Heild' ? fmtHMS(v) : fmtMMSS(v))}</td>
                      ))}
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: r.delta == null || same ? T.gray : improved ? GREEN : RED }}>
                        {r.delta == null ? '—' : `${improved ? '▼' : same ? '±' : '▲'} ${signedMMSS(r.delta)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Where to improve */}
          {improve && (
            <>
              <h3 style={{ ...T.sectionTitle, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color={T.yellow} /> Hvar á að bæta sig
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: T.gray, fontFamily: T.font }}>
                Síðasta mót ({shortEv(improve.event)}) borið saman við{' '}
                {improve.basis === 'allir' ? 'alla keppendur' : `flokkinn ${improve.basis}`}{' '}
                ({improve.fieldSize} {improve.fieldSize === 1 ? 'keppandi' : catNoun}).
                Rautt = hægari en miðgildi (tækifæri), grænt = hraðari.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {improve.rows.map((r, idx) => {
                  const worse = r.gapToMid > 0;
                  const flag = worse && idx < 3;
                  const maxGap = Math.max(1, ...improve.rows.map((x) => Math.abs(x.gapToMid)));
                  const w = Math.round((Math.abs(r.gapToMid) / maxGap) * 100);
                  return (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: flag ? 'rgba(239,68,68,0.07)' : T.dark2, border: `1px solid ${T.border}`, padding: '8px 12px', fontFamily: T.font }}>
                      <div style={{ width: 92, flexShrink: 0, fontSize: 13, color: flag ? T.white : T.gray, fontWeight: flag ? 700 : 400 }}>
                        {r.name === 'Hlaup (samtals)' ? 'Hlaup' : r.name}
                      </div>
                      <div style={{ flex: 1, minWidth: 60, height: 16, background: '#0a0a0a', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, [worse ? 'left' : 'right']: '50%', width: `${w / 2}%`, background: worse ? RED : GREEN, opacity: 0.7 }} />
                        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: T.grayDim }} />
                      </div>
                      <div style={{ width: 118, flexShrink: 0, textAlign: 'right', fontSize: 12, color: T.gray }}>
                        <span style={{ color: worse ? RED : GREEN, fontWeight: 700 }}>{signedMMSS(r.gapToMid)}</span>{' '}vs miðgildi
                      </div>
                    </div>
                  );
                })}
              </div>
              {improve.rows.some((r) => r.gapToMid > 0) && (
                <p style={{ fontSize: 13, color: T.white, fontFamily: T.font, marginTop: 10, lineHeight: 1.5 }}>
                  <strong style={{ color: T.yellow }}>Mesta tækifærið:</strong>{' '}
                  {improve.rows.filter((r) => r.gapToMid > 0).slice(0, 3).map((r) => r.name === 'Hlaup (samtals)' ? 'Hlaup' : r.name).join(', ')} —
                  hér tapast mestur tími miðað við keppinauta.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
