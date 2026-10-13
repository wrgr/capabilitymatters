/** Present glossary definitions as native dialogs with keyboard dismissal and focus return. */
import {useEffect, useRef} from 'react';
export default function GlossaryPopover({term, glossary, opener, onClose}) {
  const dialog = useRef(null);
  const entry = glossary[term];
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); if (opener?.isConnected) opener.focus(); };
  }, [opener]);
  return <dialog ref={dialog} className="glossary-dialog" aria-labelledby="glossary-dialog-title" onCancel={onClose}>
    <button type="button" onClick={onClose}>Close definition</button>
    <h2 id="glossary-dialog-title">{entry?.term || term}</h2>
    {entry ? <><p>{entry.short}</p>{entry.long && <p>{entry.long}</p>}{entry.seeAlso?.length > 0 && <p>See also: {entry.seeAlso.join(', ')}</p>}</> : <p>Definition unavailable for this term.</p>}
  </dialog>;
}
