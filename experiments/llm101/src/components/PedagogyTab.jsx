/** Preserve the migrated LLM101 PedagogyTab content and behavior. */
import pedagogy from '../data/pedagogy.js'

export default function PedagogyTab() {
  return (
    <div className="ped-content">
      <h2 className="section-title">Design rationale</h2>
      <p className="section-subtitle">Evidence-based learning science principles behind this explainer.</p>
      {pedagogy.map(item => (
        <div className="ped-principle" key={item.principle}>
          <div className="ped-principle-name">{item.principle}</div>
          <div className="ped-claim">{item.claim}</div>
          <div className="ped-rationale">{item.rationale}</div>
          <div className="ped-sources">
            {(item.sources || []).map((s, i) => (
              <div className="ped-source" key={i}>
                {s.authors} ({s.year}). <em>{s.title}</em>. {s.venue}.{' '}
                {s.link && <a href={s.link} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>↗</a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
