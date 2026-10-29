import { useState } from 'react'

export default function RenameDialog({ open, currentName, onClose, onRename }) {
  const [name, setName] = useState(currentName || '')

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="rename-title">
        <div className="modal-head"><div><span className="modal-kicker">Document</span><h2 id="rename-title">Rename document</h2></div><button type="button" aria-label="Close rename dialog" onClick={onClose}>×</button></div>
        <form className="rename-form" onSubmit={(event) => { event.preventDefault(); onRename(name) }}>
          <label>File name<input autoFocus value={name} maxLength={200} required onChange={(event) => setName(event.target.value)} /></label>
          <div className="confirm-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Rename</button></div>
        </form>
      </section>
    </div>
  )
}
