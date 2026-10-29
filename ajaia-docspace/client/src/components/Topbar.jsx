export default function Topbar({ currentUser, document, onHome, onMenu, onLogout, onShare }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" type="button" aria-label="Open document menu" onClick={onMenu}>☰</button>
      <button className="brand" type="button" onClick={onHome} aria-label="DocSpace home">
        <span className="brand-mark"><span>D</span></span><span>DocSpace</span>
      </button>
      <div className="top-actions">
        <div className="user-identity" title={currentUser.email}>
          <span>{currentUser.name[0]}</span><strong>{currentUser.name}</strong>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
        {document?.permission === 'owner' && <button className="share-button" type="button" onClick={onShare}>Share</button>}
      </div>
    </header>
  )
}
