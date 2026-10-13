/** Preserve the migrated LLM101 App content and behavior. */
import { useState, useEffect, useRef } from 'react'
import modules from './data/modules.js'
import {LEVELS} from './data/levels.js'
import glossary from './data/glossary.js'
import LevelSlider from './components/LevelSlider.jsx'
import Sidebar from './components/Sidebar.jsx'
import ModuleView from './components/ModuleView.jsx'
import ReferenceTab from './components/ReferenceTab.jsx'
import PedagogyTab from './components/PedagogyTab.jsx'
import FurtherReadingTab from './components/FurtherReadingTab.jsx'
import GlossaryTab from './components/GlossaryTab.jsx'
import GlossaryPopover from './components/GlossaryPopover.jsx'
import './index.css'

/** Contain menu focus and restore its opener through a native modal dialog. */
function MobileDrawer({ open, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal()
    if (!open && dialog.current.open) dialog.current.close()
  }, [open])
  return <dialog ref={dialog} className="mobile-drawer" aria-label="Choose a learning module" onCancel={onClose}>
    <button className="mobile-drawer-close" onClick={onClose} aria-label="Close menu">Close menu</button>
    {children}
  </dialog>
}

const TABS = [
  { id: 'content',   label: 'Content' },
  { id: 'glossary',  label: 'Glossary' },
  { id: 'reference', label: 'References' },
  { id: 'further',   label: 'Further Reading' },
  { id: 'pedagogy',  label: 'Pedagogy' },
]

const MOBILE_TABS = [
  { id: 'modules',   label: 'Modules',  icon: '☰',  drawer: true },
  { id: 'content',   label: 'Content',  icon: '✦' },
  { id: 'glossary',  label: 'Glossary', icon: '⊟' },
  { id: 'reference', label: 'Refs',     icon: '⊞' },
  { id: 'further',   label: 'Reading',  icon: '↗' },
  { id: 'pedagogy', label: 'Pedagogy', icon: '·' },
]

export default function App() {
  const [level, setLevel] = useState(1)
  const [activeModule, setActiveModule] = useState('introduction')
  const [activeTab, setActiveTab] = useState('content')
  const [popover, setPopover] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeModuleData = modules.find(m => m.slug === activeModule)

  const handleTermClick = (key, event) => {
    setPopover({ term: key, opener: event.currentTarget })
  }

  const selectModule = (slug) => {
    setActiveModule(slug)
    setActiveTab('content')
    setDrawerOpen(false)
  }

  const selectTab = (tab) => {
    setActiveTab(tab)
    setDrawerOpen(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="topbar-title">How <span>LLMs</span> actually work</h1>
        <nav className="topbar-tabs" aria-label="Explorer sections">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`topbar-tab${activeTab === id ? ' active' : ''}`}
              aria-pressed={activeTab === id}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="main-area">
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          setActiveModule={selectModule}
        />

        <main id="learning-content" tabIndex={-1} className="content-col">
          <p className="sr-only" role="status">Showing {activeTab === "content" ? `${activeModuleData.title}, ${LEVELS[level].name} depth` : TABS.find(t => t.id === activeTab).label}.</p>
          {activeTab === 'content' && (
            <>
              <div className="level-area">
                <LevelSlider level={level} setLevel={setLevel} />
              </div>
              <div className="content">
                <div className="content-inner">
                  <ModuleView
                    module={activeModuleData}
                    level={level}
                    onTermClick={handleTermClick}
                  />
                </div>
              </div>
            </>
          )}
          {activeTab === 'glossary'  && <GlossaryTab />}
          {activeTab === 'reference' && <ReferenceTab modules={modules} />}
          {activeTab === 'further'   && <FurtherReadingTab userLevel={level} />}
          {activeTab === 'pedagogy'  && <PedagogyTab />}
        </main>
      </div>

      {/* Mobile: drawer for sidebar */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          setActiveModule={selectModule}
        />
      </MobileDrawer>

      {/* Mobile: bottom nav bar */}
      <nav className="mobile-nav" aria-label="Explorer sections on mobile">
        <button
          className={`mobile-nav-btn${drawerOpen ? ' active' : ''}`}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(o => !o)}
        >
          <span className="mobile-nav-icon" aria-hidden="true">☰</span>
          Modules
        </button>
        {MOBILE_TABS.filter(t => !t.drawer).map(({ id, label, icon }) => (
          <button
            key={id}
            className={`mobile-nav-btn${activeTab === id && !drawerOpen ? ' active' : ''}`}
            aria-pressed={activeTab === id}
              onClick={() => selectTab(id)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {popover && (
        <GlossaryPopover
          term={popover.term}
          glossary={glossary}
          opener={popover.opener}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
