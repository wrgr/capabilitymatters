/** Preserve the migrated LLM101 GlossaryTab content and behavior. */
import { useState, useMemo } from 'react'
import glossary from '../data/glossary.js'

const entries = Object.entries(glossary).sort(([, a], [, b]) =>
  a.term.localeCompare(b.term)
)

const letters = [...new Set(entries.map(([, e]) => e.term[0].toUpperCase()))].sort()

export default function GlossaryTab({ onTermClick }) {
  const [search, setSearch] = useState('')
  const [activeLetter, setActiveLetter] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(([key, e]) => {
      if (activeLetter && e.term[0].toUpperCase() !== activeLetter) return false
      if (!q) return true
      return (
        e.term.toLowerCase().includes(q) ||
        e.short.toLowerCase().includes(q)
      )
    })
  }, [search, activeLetter])

  const handleLetterClick = (l) => {
    setActiveLetter(prev => prev === l ? null : l)
    setSearch('')
  }

  return (
    <div className="gl-content">
      <div className="gl-header">
        <h2 className="section-title">Glossary</h2>
        <p className="section-subtitle">Key terms used throughout the explainer. Click any term in the content to see its definition.</p>
        <input
          className="gl-search"
          type="search"
          placeholder="Search terms…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveLetter(null) }}
        />
        <div className="gl-letters">
          {letters.map(l => (
            <button
              key={l}
              className={`gl-letter-btn${activeLetter === l ? ' active' : ''}`}
              onClick={() => handleLetterClick(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="gl-count">{filtered.length} term{filtered.length !== 1 ? 's' : ''}</div>

      <div className="gl-entries">
        {filtered.map(([key, entry]) => (
          <div className="gl-entry" key={key} id={`gl-${key}`}>
            <div className="gl-entry-term">{entry.term}</div>
            <div className="gl-entry-short">{entry.short}</div>
            {entry.long && (
              <div className="gl-entry-long">{entry.long}</div>
            )}
            {entry.seeAlso?.length > 0 && (
              <div className="gl-entry-see-also">
                <span className="gl-see-also-label">See also: </span>
                {entry.seeAlso.map((k, i) => (
                  <span key={k}>
                    <button
                      className="gl-see-also-link"
                      onClick={() => {
                        const el = document.getElementById(`gl-${k}`)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      {glossary[k]?.term ?? k}
                    </button>
                    {i < entry.seeAlso.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="gl-empty">No terms match "{search}"</div>
        )}
      </div>
    </div>
  )
}
