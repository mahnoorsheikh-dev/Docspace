export default function ShareDialog({ open, title, shares, shareEmail, sharePermission, onEmailChange, onPermissionChange, onClose, onSubmit, onCopyInvite, onRemove }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="modal-head">
          <div><span className="modal-kicker">Document access</span><h2 id="share-title">Share “{title}”</h2></div>
          <button type="button" aria-label="Close share dialog" onClick={onClose}>×</button>
        </div>
        <form className="share-form" onSubmit={onSubmit}>
          <label>Email address<input type="email" placeholder="friend@example.com" required value={shareEmail} onChange={(event) => onEmailChange(event.target.value)} /></label>
          <label>Permission<select value={sharePermission} onChange={(event) => onPermissionChange(event.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label>
          <button className="primary-button" type="submit">Share</button>
        </form>
        <p className="muted">Any email can be invited. Pending invitations activate after that email registers.</p>
        <div className="collaborator-list">
          <h3>People with access</h3>
          {shares.length ? shares.map((person) => (
            <div className="collaborator" key={person.id}>
              <span className="avatar">{person.name[0]}</span>
              <span><strong>{person.name}</strong><small>{person.email}</small></span>
              <span className="permission-label">{person.pending ? `Pending · ${person.permission}` : person.permission}</span>
              <span className="collaborator-actions">
                <button type="button" aria-label={`Copy invitation link for ${person.email}`} onClick={() => onCopyInvite(person)}>Copy link</button>
                <button type="button" aria-label={`Remove ${person.name}`} onClick={() => onRemove(person.id)}>Remove</button>
              </span>
            </div>
          )) : <p className="muted">Not shared with anyone yet.</p>}
        </div>
      </section>
    </div>
  )
}
