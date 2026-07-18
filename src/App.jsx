import { useState } from 'react'
import rawData from './data.json'
import FinishTimesChart from './components/FinishTimesChart'
import SplitsHeatmap from './components/SplitsHeatmap'
import CumulativeTimeChart from './components/CumulativeTimeChart'
import RadarChart from './components/RadarChart'
import StackedBarChart from './components/StackedBarChart'
import ScatterChart from './components/ScatterChart'
import CompareChart from './components/CompareChart'
import EventComparison from './components/EventComparison'
import {
  Trophy, CalendarDays, Flame, TrendingUp, Radar,
  BarChart2, Zap, SlidersHorizontal,
  User, Users, Mars, Venus, Star, Flag, Lock
} from 'lucide-react'

/* ── HYROX brand ───────────────────────────────────────── */
const Y = '#ffed00'
const YDim = 'rgba(255,237,0,0.12)'
const BORDER = '1px solid #1e1e1e'

const seriesData = rawData.series

/* Default to the most recently completed event (currently 2. mót);
   falls through to the first event if none are marked "lokið". */
const defaultEventIdx = (() => {
  let idx = 0
  seriesData.events.forEach((ev, i) => {
    if (ev.status === 'lokið') idx = i
  })
  return idx
})()

const TABS = [
  { id: 'finish',     label: 'Heildarúrslit',   Icon: Trophy        },
  { id: 'series',     label: 'Mótaröðin',        Icon: CalendarDays  },
  { id: 'heatmap',    label: 'Hitakort',          Icon: Flame         },
  { id: 'cumulative', label: 'Uppsafnaður tími',  Icon: TrendingUp    },
  { id: 'radar',      label: 'Radar',             Icon: Radar         },
  { id: 'stacked',    label: 'Tímaúthlutun',      Icon: BarChart2     },
  { id: 'scatter',    label: 'Hlaup vs stöðvar',  Icon: Zap           },
  { id: 'compare',    label: 'Samanburður',        Icon: SlidersHorizontal },
]

/* ── Tiny style helpers ─────────────────────────────────── */
const seg = (active) => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '9px 13px', minHeight: 40,
  border: BORDER, cursor: 'pointer', transition: 'all .12s',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
  ...(active
    ? { background: Y, color: '#000', borderColor: Y }
    : { background: 'transparent', color: '#555' }),
})
const segGreen = (active) => ({
  ...seg(active),
  ...(active ? { background: '#00c853', borderColor: '#00c853', color: '#000' } : {}),
})
const segWhite = (active) => ({
  ...seg(active),
  ...(active ? { background: '#fff', borderColor: '#fff', color: '#000' } : {}),
})

export default function App() {
  const [activeTab, setActiveTab]   = useState('finish')
  const [eventIdx, setEventIdx]     = useState(defaultEventIdx)
  const [category, setCategory]     = useState('einstaklingar')
  const [subcat, setSubcat]         = useState('overall')
  const [divFilter, setDivFilter]   = useState('allt')

  const currentEvent = seriesData.events[eventIdx]

  const applyDivFilter = (list) => {
    if (!list) return []
    return list.filter(a => {
      if (!a.total_seconds) return false
      if (divFilter === 'pro')  return a.division?.toLowerCase().includes('pro')
      if (divFilter === 'open') return a.division?.toLowerCase().includes('open')
        || a.division?.toLowerCase().includes('mixed')
        || a.division?.toLowerCase().includes('blandað')
      return true
    })
  }

  const athletes    = applyDivFilter(currentEvent[category]?.[subcat])
  const allAthletes = applyDivFilter(currentEvent[category]?.overall)

  const subcats = category === 'einstaklingar'
    ? [
        { id: 'overall', label: 'Allt',  Icon: null  },
        { id: 'karlar',  label: 'KK',    Icon: Mars   },
        { id: 'konur',   label: 'KVK',   Icon: Venus  },
      ]
    : [
        { id: 'overall',  label: 'Allt',    Icon: null  },
        { id: 'karlar',   label: 'KK',      Icon: Mars  },
        { id: 'konur',    label: 'KVK',     Icon: Venus },
        { id: 'blandað',  label: 'Blandað', Icon: null  },
      ]

  const totalAthletes = currentEvent[category]?.overall?.filter(a => a.total_seconds > 0).length || 0
  const maleCount  = (currentEvent[category]?.karlar  || []).filter(a => a.total_seconds > 0).length
  const femaleCount = (currentEvent[category]?.konur  || []).filter(a => a.total_seconds > 0).length

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif" }}>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header style={{
        background: '#000',
        borderBottom: BORDER,
        borderLeft: `4px solid ${Y}`,
        position: 'sticky', top: 0, zIndex: 50,
      }}>

        {/* Brand + KPIs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderBottom: BORDER,
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 900,
              letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1, color: '#fff',
            }}>
              HYROX <span style={{ color: Y }}>CFR</span> 2026
            </h1>
            <p style={{
              fontSize: 'clamp(9px, 2vw, 11px)', fontWeight: 700,
              letterSpacing: 3, textTransform: 'uppercase', color: '#444', marginTop: 3,
            }}>
              Crossfit Reykjavík · Mótaröð 2026
            </p>
          </div>

          <div style={{ display: 'flex', gap: 0, marginLeft: 'auto', flexShrink: 0 }}>
            {[
              { n: totalAthletes, l: 'Þátttak.' },
              { n: maleCount,     l: 'Karlar'   },
              { n: femaleCount,   l: 'Konur'    },
            ].map(({ n, l }) => (
              <div key={l} style={{
                padding: '4px 12px', borderLeft: BORDER, textAlign: 'center', minWidth: 52,
              }}>
                <div style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 900, color: Y, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#444', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          padding: '8px 16px', borderBottom: BORDER,
        }}>

          {/* Category */}
          <div style={{ display: 'flex', gap: 0 }}>
            <button style={seg(category === 'einstaklingar')} onClick={() => { setCategory('einstaklingar'); setSubcat('overall') }}>
              <User size={13} /><span>Einstaklingar</span>
            </button>
            <button style={{ ...seg(category === 'para'), borderLeft: 'none' }} onClick={() => { setCategory('para'); setSubcat('overall') }}>
              <Users size={13} /><span>Para</span>
            </button>
          </div>

          {/* Gender/subcat */}
          <div style={{ display: 'flex', gap: 0 }}>
            {subcats.map(({ id, label, Icon }, i) => (
              <button
                key={id}
                style={{ ...segWhite(subcat === id), ...(i > 0 ? { borderLeft: 'none' } : {}) }}
                onClick={() => setSubcat(id)}
              >
                {Icon && <Icon size={13} />}<span>{label}</span>
              </button>
            ))}
          </div>

          {/* Division */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { id: 'allt', label: 'Allt', Icon: null  },
              { id: 'pro',  label: 'PRO',  Icon: Star  },
              { id: 'open', label: 'OPEN', Icon: null  },
            ].map(({ id, label, Icon: Ic }, i) => (
              <button
                key={id}
                style={{ ...segGreen(divFilter === id), ...(i > 0 ? { borderLeft: 'none' } : {}) }}
                onClick={() => setDivFilter(id)}
              >
                {Ic && <Ic size={13} />}<span>{label}</span>
              </button>
            ))}
          </div>

          {/* Events — scroll on mobile */}
          <div style={{
            display: 'flex', gap: 4, marginLeft: 'auto',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', flexShrink: 0,
          }}>
            {seriesData.events.map((ev, i) => {
              const active = eventIdx === i
              const locked = ev.status !== 'lokið'
              return (
                <button
                  key={ev.id}
                  onClick={() => !locked && setEventIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 13px', minHeight: 36,
                    border: BORDER, transition: 'all .12s',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 800, letterSpacing: 2,
                    textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                    ...(active
                      ? { borderColor: Y, color: Y, background: YDim }
                      : { color: '#444' }),
                    ...(locked ? { opacity: 0.3, cursor: 'not-allowed' } : {}),
                  }}
                >
                  {locked ? <Lock size={11} /> : <Flag size={11} />}
                  {ev.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab bar */}
        <nav style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 15px', minHeight: 44,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                  borderBottom: `3px solid ${active ? Y : 'transparent'}`,
                  color: active ? Y : '#444',
                  transition: 'all .12s',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ══ MAIN ════════════════════════════════════════════════ */}
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
        {currentEvent.status === 'væntanlegt' && activeTab !== 'series' ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px', gap: 16, color: '#333',
          }}>
            <Lock size={48} color="#1e1e1e" />
            <h2 style={{ color: '#2a2a2a', fontWeight: 900, fontSize: 28, letterSpacing: 3, textTransform: 'uppercase' }}>
              {currentEvent.name}
            </h2>
            <p style={{ color: '#333', fontSize: 14, letterSpacing: 1 }}>
              Niðurstöður verða birtar eftir mótið {currentEvent.date}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'finish'     && <FinishTimesChart athletes={athletes} category={category} />}
            {activeTab === 'series'     && <EventComparison seriesData={seriesData} category={category} />}
            {activeTab === 'heatmap'    && <SplitsHeatmap athletes={athletes} />}
            {activeTab === 'cumulative' && <CumulativeTimeChart athletes={allAthletes} />}
            {activeTab === 'radar'      && <RadarChart athletes={allAthletes} />}
            {activeTab === 'stacked'    && <StackedBarChart athletes={athletes} />}
            {activeTab === 'scatter'    && <ScatterChart athletes={allAthletes} />}
            {activeTab === 'compare'    && <CompareChart athletes={allAthletes} />}
          </>
        )}
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{
        borderTop: BORDER, borderLeft: `4px solid ${Y}`,
        padding: '12px 16px', marginTop: 40,
      }}>
        <div style={{
          maxWidth: 1300, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#333' }}>
            Gögn: <a href="https://timataka.net/hyrox2026/" style={{ color: '#444' }}>timataka.net/hyrox2026</a> · Smíðað með ♥ af Ada
          </span>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', color: '#1a1a1a' }}>
            CFR · 2026
          </span>
        </div>
      </footer>
    </div>
  )
}
