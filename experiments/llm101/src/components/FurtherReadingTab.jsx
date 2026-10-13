/** Preserve the migrated LLM101 FurtherReadingTab content and behavior. */
import { useState } from 'react'
import furtherReading from '../data/furtherReading.js'
import { LEVELS } from '../data/levels.js'

const TYPE_ICONS = {
  course: '◎',
  book: '◻',
  paper: '◈',
  video: '▷',
  interactive: '⊕',
}

const TYPE_LABELS = {
  course: 'Course',
  book: 'Book',
  paper: 'Paper',
  video: 'Video',
  interactive: 'Interactive',
}

const LEVEL_COLORS = ['#08778c', '#08784f', '#8c5800', '#6d3eaf', '#b92929']

function ResourceCard({ resource }) {
  const levelName = LEVELS[resource.minLevel]?.name ?? `Level ${resource.minLevel}`
  const levelColor = LEVEL_COLORS[resource.minLevel] ?? '#888'

  return (
    <div className="fr-card">
      <div className="fr-card-meta">
        <span className="fr-type">
          <span className="fr-type-icon">{TYPE_ICONS[resource.type]}</span>
          {TYPE_LABELS[resource.type]}
        </span>
        <span className="fr-level" style={{ color: levelColor }}>
          {levelName}+
        </span>
        {resource.free && <span className="fr-free">Free</span>}
      </div>
      <div className="fr-card-title">
        {resource.link
          ? <a href={resource.link} target="_blank" rel="noreferrer" className="fr-title-link">{resource.title} ↗</a>
          : resource.title}
      </div>
      <div className="fr-card-author">{resource.author}</div>
      <div className="fr-card-desc">{resource.description}</div>
    </div>
  )
}

export default function FurtherReadingTab({ userLevel }) {
  const [filter, setFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

  const typeOptions = ['all', 'course', 'book', 'paper', 'video', 'interactive']

  const visibleGroups = furtherReading.map(group => ({
    ...group,
    resources: group.resources.filter(r => {
      const typeMatch = filter === 'all' || r.type === filter
      const levelMatch = levelFilter === 'all' || r.minLevel <= parseInt(levelFilter)
      return typeMatch && levelMatch
    }),
  })).filter(g => g.resources.length > 0)

  return (
    <div className="fr-content">
      <div className="fr-header">
        <h2 className="section-title">Further Reading</h2>
        <p className="section-subtitle">Curated courses, books, papers, and videos — with a suggested starting level for each.</p>
        <div className="fr-filters">
          <div className="fr-filter-group">
            {typeOptions.map(t => (
              <button
                key={t}
                className={`fr-filter-btn${filter === t ? ' active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'All types' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="fr-filter-group">
            <button
              className={`fr-filter-btn${levelFilter === 'all' ? ' active' : ''}`}
              onClick={() => setLevelFilter('all')}
            >
              Any level
            </button>
            {LEVELS.map((l, i) => (
              <button
                key={i}
                className={`fr-filter-btn${levelFilter === String(i) ? ' active' : ''}`}
                onClick={() => setLevelFilter(String(i))}
              >
                Up to {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleGroups.map(group => (
        <div className="fr-group" key={group.topic}>
          <div className="fr-group-header">
            <div className="fr-group-title">{group.topic}</div>
            <div className="fr-group-desc">{group.description}</div>
          </div>
          <div className="fr-cards">
            {group.resources.map((r, i) => (
              <ResourceCard key={i} resource={r} />
            ))}
          </div>
        </div>
      ))}

      {visibleGroups.length === 0 && (
        <div className="fr-empty">No resources match this filter combination.</div>
      )}
    </div>
  )
}
