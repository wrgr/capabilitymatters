/** Preserve the migrated LLM101 ModuleView content and behavior. */
import React from 'react';
import { renderMarkup } from '../lib/markup.jsx';
import Check from './Check.jsx';

const ARC_LABELS = {
  'how-it-works': 'How it works',
  'what-it-means': 'What it means',
};

export default function ModuleView({ module, level, onTermClick }) {
  const visibleBeats = (module.beats || []).filter(
    (beat) => beat.minLevel <= level && level <= beat.maxLevel
  );

  return (
    <div className="module-view">
      <div className="module-header">
        {module.arc && (
          <div className={`arc-badge arc-badge--${module.arc}`}>
            {ARC_LABELS[module.arc] ?? module.arc}
          </div>
        )}
        <h2 className="module-title">{module.title}</h2>
        <p className="module-objective">{module.objective}</p>
        {module.terms && module.terms.length > 0 && (
          <div className="module-terms">
            {module.terms.map((term) => (
              <button type="button"
                key={term}
                className="term-chip"
                onClick={(e) => onTermClick(term, e)}
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {module.draft && (
        <div className="scaffold-banner">
          This module is a scaffold — content will be developed. The structure
          and learning objective are final.
        </div>
      )}

      {visibleBeats.map((beat, index) => (
        <div key={index} className={`beat beat-${beat.role}`}>
          {beat.title && (
            <div className="beat-title">
              {beat.title}
              {beat.draft && (
                <small className="beat-draft-marker">draft</small>
              )}
            </div>
          )}
          {beat.role === 'check' ? (
            <Check beat={beat} />
          ) : (
            renderMarkup(beat.body, onTermClick)
          )}
        </div>
      ))}
    </div>
  );
}
