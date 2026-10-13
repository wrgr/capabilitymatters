/** Preserve the migrated LLM101 LevelSlider content and behavior. */
import { LEVELS } from '../data/levels.js'

export default function LevelSlider({ level, setLevel }) {
  const current = LEVELS[level]

  return (
    <div className="level-slider-wrap">
      <div className="level-row">
        <span className="level-name">{current.name}</span>
        <span className="level-audience">{current.audience}</span>
      </div>
      <div className="level-dots">
        {LEVELS.map((l, i) => (
          <button
            type="button"
            key={l.id}
            className={`level-dot${i === level ? ' active' : ''}`}
            data-label={l.name}
            aria-label={`${l.name} — ${l.audience}`}
            aria-pressed={i === level}
            onClick={() => setLevel(i)}
            title={`${l.name} — ${l.audience}`}
          />
        ))}
      </div>
    </div>
  )
}
