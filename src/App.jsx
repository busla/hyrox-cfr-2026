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

const seriesData = rawData.series

const TABS = [
  { id: 'finish',   label: '🏆 Heildarúrslit' },
  { id: 'series',   label: '📅 Mótaröðin' },
  { id: 'heatmap',  label: '🔥 Splits heatmap' },
  { id: 'cumulative', label: '📈 Uppsafnaður tími' },
  { id: 'radar',    label: '🕸️ Radar graf' },
  { id: 'stacked',  label: '📊 Tímaúthlutun' },
  { id: 'scatter',  label: '⚡ Hlaup vs stöðvar' },
  { id: 'compare',  label: '🔍 Samanburður' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('finish')
  const [eventIdx, setEventIdx] = useState(0)
  const [category, setCategory] = useState('einstaklingar')
  const [subcat, setSubcat] = useState('overall')

  const currentEvent = seriesData.events[eventIdx]
  const athletes = (currentEvent[category]?.[subcat] || []).filter(a => a.total_seconds > 0)
  const allAthletes = (currentEvent[category]?.overall || []).filter(a => a.total_seconds > 0)

  const subcats = category === 'einstaklingar'
    ? [{ id: 'overall', label: 'Allt' }, { id: 'karlar', label: 'Karlar' }, { id: 'konur', label: 'Konur' }]
    : [{ id: 'overall', label: 'Allt' }, { id: 'karlar', label: 'KK' }, { id: 'konur', label: 'KVK' }, { id: 'blandað', label: 'Blandað' }]

  const totalAthletes = currentEvent[category]?.overall?.filter(a => a.total_seconds > 0).length || 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', borderBottom: '1px solid #2d3748', padding: '20px 20px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontSize: 40 }}>🏃</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(90deg, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                HYROX CFR 2026
              </h1>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: 13 }}>
                Crossfit Reykjavík · Mótaröð 2026 · Gagnvirkar tölfræðimyndir
              </p>
            </div>

            {/* Event selector */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {seriesData.events.map((ev, i) => (
                <button key={ev.id} onClick={() => setEventIdx(i)} style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid',
                  borderColor: eventIdx === i ? '#f97316' : '#2d3748',
                  background: eventIdx === i ? '#f9731620' : 'transparent',
                  color: eventIdx === i ? '#f97316' : '#64748b',
                  cursor: ev.status === 'lokið' ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 600,
                  opacity: ev.status === 'lokið' ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}>
                  {ev.name} {ev.status === 'væntanlegt' ? '🔒' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Category + subcat row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 0, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: '#1e2535', borderRadius: 10, padding: 3 }}>
              {[{ id: 'einstaklingar', label: '👤 Einstaklingar' }, { id: 'para', label: '👥 Para' }].map(c => (
                <button key={c.id} onClick={() => { setCategory(c.id); setSubcat('overall') }} style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: category === c.id ? '#f97316' : 'transparent',
                  color: category === c.id ? '#fff' : '#94a3b8', transition: 'all 0.2s'
                }}>{c.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, background: '#1e2535', borderRadius: 10, padding: 3 }}>
              {subcats.map(s => (
                <button key={s.id} onClick={() => setSubcat(s.id)} style={{
                  padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: subcat === s.id ? '#3b82f6' : 'transparent',
                  color: subcat === s.id ? '#fff' : '#94a3b8', transition: 'all 0.2s'
                }}>{s.label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
              {[
                { label: 'Þátttakendur', v: totalAthletes },
                { label: 'Karlar', v: (currentEvent[category]?.karlar || []).filter(a=>a.total_seconds>0).length },
                { label: 'Konur', v: (currentEvent[category]?.konur || []).filter(a=>a.total_seconds>0).length },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ maxWidth: 1200, margin: '12px auto 0', display: 'flex', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '12px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              background: 'transparent',
              color: activeTab === tab.id ? '#f97316' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #f97316' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>{tab.label}</button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        {currentEvent.status === 'væntanlegt' && activeTab !== 'series' ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#475569' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#64748b', margin: '0 0 8px' }}>{currentEvent.name}</h2>
            <p>Niðurstöður verða birtar eftir mótið {currentEvent.date}</p>
          </div>
        ) : (
          <>
            {activeTab === 'finish'    && <FinishTimesChart athletes={athletes} category={category} />}
            {activeTab === 'series'    && <EventComparison seriesData={seriesData} />}
            {activeTab === 'heatmap'   && <SplitsHeatmap athletes={athletes} />}
            {activeTab === 'cumulative'&& <CumulativeTimeChart athletes={allAthletes} />}
            {activeTab === 'radar'     && <RadarChart athletes={allAthletes} />}
            {activeTab === 'stacked'   && <StackedBarChart athletes={athletes} />}
            {activeTab === 'scatter'   && <ScatterChart athletes={allAthletes} />}
            {activeTab === 'compare'   && <CompareChart athletes={allAthletes} />}
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', color: '#334155', fontSize: 12, borderTop: '1px solid #1e2535' }}>
        Gögn: <a href="https://timataka.net/hyrox2026/" style={{ color: '#475569' }}>timataka.net/hyrox2026</a> · Smíðað með ❤️ af Ada
      </footer>
    </div>
  )
}
