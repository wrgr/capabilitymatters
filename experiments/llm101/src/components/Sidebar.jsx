/** Preserve the migrated LLM101 Sidebar content and behavior. */
import { useState } from 'react'

function ModuleButton({ module, activeModule, setActiveModule }) { return (
    <button
      type="button"
      aria-current={module.slug === activeModule ? "page" : undefined}
      className={`nav-item${module.slug === activeModule ? ' active' : ''}`}
      onClick={() => setActiveModule(module.slug)}
    >
      <span className="nav-item-num">{module.num}</span>
      {module.tab}
    </button>
  )

}

export default function Sidebar({ modules, activeModule, setActiveModule }) {
  const [arcTab, setArcTab] = useState('mechanistic')

  const mechanistic = modules.filter(m => m.arc === 'mechanistic')
  const meaning = modules.filter(m => m.arc === 'meaning')
  const visible = arcTab === 'mechanistic' ? mechanistic : meaning


  return (
    <nav className="sidebar" aria-label="Learning modules">
      <div className="sidebar-arc-tabs">
        <button
          className={`sidebar-arc-tab${arcTab === 'mechanistic' ? ' active' : ''}`}
          aria-pressed={arcTab === 'mechanistic'}
          onClick={() => setArcTab('mechanistic')}
        >
          How it works
        </button>
        <button
          className={`sidebar-arc-tab${arcTab === 'meaning' ? ' active' : ''}`}
          aria-pressed={arcTab === 'meaning'}
          onClick={() => setArcTab('meaning')}
        >
          What matters
        </button>
      </div>

      <div className="arc-group">
        {visible.map(m => <ModuleButton key={m.slug} module={m} activeModule={activeModule} setActiveModule={setActiveModule} />)}
      </div>
    </nav>
  )
}
