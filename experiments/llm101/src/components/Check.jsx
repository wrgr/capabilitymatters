/** Preserve the migrated LLM101 Check content and behavior. */
import { useState } from "react";

export default function Check({ beat }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="check-box">
      <div className="check-label">Check your understanding</div>
      <div className="check-question">{beat.question}</div>
      <div className="check-options">
        {beat.options.map((opt, i) => (
          <button
            key={i}
            className={
              "check-option" +
              (selected === i && i === beat.answer ? " correct" : "") +
              (selected === i && i !== beat.answer ? " wrong" : "")
            }
            disabled={selected !== null}
            onClick={() => { if (selected === null) setSelected(i); }}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="check-explanation" role="status">{selected === beat.answer ? "Correct. " : "Try reflecting on this explanation. "}{beat.explanation}</div>
      )}
    </div>
  );
}
