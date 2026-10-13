/** Preserve the migrated LLM101 ReferenceTab content and behavior. */
import { useState } from 'react'
import pedagogy from '../data/pedagogy.js'

const TOPIC_GROUPS = [
  { key: 'language-modeling', topic: 'Language modeling & scale', moduleNums: ['00', '01', '06'] },
  { key: 'architecture', topic: 'Architecture', moduleNums: ['02', '03', '04', '05'] },
  { key: 'alignment', topic: 'Alignment & prompting', moduleNums: ['07', '08'] },
  { key: 'meaning-arc', topic: 'Meaning arc', moduleNums: ['09', '10', '11', '12', '13', '14'] },
  { key: 'pedagogy', topic: 'Pedagogy & design', moduleNums: null },
]

function dedupe(sources) {
  const seen = new Set()
  return sources.filter(s => {
    const k = `${s.title}||${s.year}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function groupSources(group, modules) {
  if (group.moduleNums === null) {
    return dedupe(pedagogy.flatMap(p => p.sources || []))
  }
  return dedupe(
    modules.filter(m => group.moduleNums.includes(m.num)).flatMap(m => m.sources || [])
  )
}

function SourceItem({ source }) {
  return (
    <div className="source-item">
      <div className="source-dot" />
      <div className="source-body">
        <span className="source-authors">{source.authors} ({source.year}). </span>
        <span className="source-title">{source.title}. </span>
        <span className="source-venue">{source.venue}.</span>
        {source.link && (
          <a className="source-link" href={source.link} target="_blank" rel="noreferrer">↗</a>
        )}
      </div>
    </div>
  )
}

export default function ReferenceTab({ modules }) {
  const [activeGroup, setActiveGroup] = useState('all')
  const visible = activeGroup === 'all' ? TOPIC_GROUPS : TOPIC_GROUPS.filter(g => g.key === activeGroup)

  return (
    <div className="ref-content">
      <h2 className="section-title">References</h2>
      <p className="section-subtitle">Primary sources for each arc, plus pedagogy & design citations.</p>
      {visible.map(group => {
        const sources = groupSources(group, modules)
        if (!sources.length) return null
        return (
          <div className="topic-group" key={group.key}>
            <div className="topic-label">{group.topic}</div>
            {sources.map((s, i) => <SourceItem key={i} source={s} />)}
          </div>
        )
      })}
    </div>
  )
}
