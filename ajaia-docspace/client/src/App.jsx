import { useEffect, useMemo, useRef, useState } from 'react'
import DocumentEditor from './components/DocumentEditor.jsx'
import RenameDialog from './components/RenameDialog.jsx'
import AuthPage from './components/AuthPage.jsx'
import Topbar from './components/Topbar.jsx'
import ShareDialog from './components/ShareDialog.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import { api } from './services/api.js'
import { EMPTY_CONTENT, textToTipTap } from './utils/textToTipTap.js'
import { downloadDocument } from './utils/documentExport.js'
import './App.css'

/* Oxlint intentionally ignores these effects: authentication and autosave timers synchronize external APIs. */
/* oxlint-disable react-hooks/exhaustive-deps react/set-state-in-effect */

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [documents, setDocuments] = useState([])
  const [document, setDocument] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(EMPTY_CONTENT)
  const [activeSection, setActiveSection] = useState('owned')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [shares, setShares] = useState([])
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState('viewer')
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [importing, setImporting] = useState(false)
  const [openingDocument, setOpeningDocument] = useState(false)
  const fileInput = useRef(null)
  const saveTimer = useRef(null)
  const lastSavedSignature = useRef(null)
  const currentSignature = useRef(null)

  const filteredDocuments = useMemo(() => {
    const sectionDocuments = documents.filter((item) =>
      activeSection === 'owned' ? item.access_type === 'owned' : item.access_type === 'shared'
    )
    return sectionDocuments.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
  }, [documents, activeSection, search])

  async function loadDocuments(preferredId) {
    setLoading(true)
    setError('')
    try {
      const items = await api('/api/documents' )
      setDocuments(items)
      if (preferredId) {
        await openDocument(preferredId)
      } else if (!document && items.length) {
        await openDocument(items[0].id)
      } else if (document && !items.some((item) => item.id === document.id)) {
        setDocument(null)
        setTitle('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function openDocument(id) {
    const startedAt = Date.now()
    setError('')
    setOpeningDocument(true)
    try {
      const item = await api(`/api/documents/${id}` )
      setDocument(item)
      setTitle(item.title)
      setContent(item.content || EMPTY_CONTENT)
      lastSavedSignature.current = JSON.stringify({ title: item.title, content: item.content || EMPTY_CONTENT })
      setSaveStatus('Saved')
      setMobileSidebar(false)
    } catch (err) {
      setError(err.message)
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < 180) await new Promise((resolve) => setTimeout(resolve, 180 - elapsed))
      setOpeningDocument(false)
    }
  }

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  // The document loader is intentionally tied to authentication transitions rather than individual document state.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser) loadDocuments()
  }, [currentUser])

  // Debounced autosave intentionally updates UI state from an external API timer.
  // oxlint-disable-next-line react/set-state-in-effect react-hooks/exhaustive-deps
  useEffect(() => {
    if (!document || document.permission === 'viewer') return undefined

    const signature = JSON.stringify({ title, content })
    currentSignature.current = signature
    if (saveTimer.current) clearTimeout(saveTimer.current)

    if (lastSavedSignature.current === signature) {
      setSaveStatus('Saved')
      return undefined
    }

    setSaveStatus('Unsaved')
    saveTimer.current = setTimeout(async () => {
      const savingSignature = signature
      setSaveStatus('Saving…')
      try {
        const updated = await api(`/api/documents/${document.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title, content }),
        })
        lastSavedSignature.current = savingSignature
        if (currentSignature.current === savingSignature) setSaveStatus('Saved')
        setDocuments((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
      } catch (err) {
        setSaveStatus('Save failed')
        setError(err.message)
      }
    }, 800)

    return () => clearTimeout(saveTimer.current)
  }, [title, content, document?.id, document?.permission])

  async function createDocument(initial = {}) {
    setLoading(true)
    setError('')
    try {
      const created = await api('/api/documents', {
        method: 'POST',
        body: JSON.stringify(initial.title || initial.content ? initial : { title: 'Untitled document', content: EMPTY_CONTENT }),
      })
      await loadDocuments(created.id)
      setActiveSection('owned')
      setSuccess('Document created')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteDocument() {
    if (!document) return
    try {
      await api(`/api/documents/${document.id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      setDocument(null)
      setTitle('')
      setSuccess('Document deleted')
      await loadDocuments()
    } catch (err) {
      setError(err.message)
      setDeleteOpen(false)
    }
  }

  async function renameDocument(nextName) {
    const cleanName = nextName.trim()
    if (!cleanName || !document) return
    try {
      const updated = await api(`/api/documents/${document.id}`, {
        method: 'PUT', body: JSON.stringify({ title: cleanName, content }),
      })
      setTitle(updated.title)
      lastSavedSignature.current = JSON.stringify({ title: updated.title, content })
      setSaveStatus('Saved')
      setDocument((current) => ({ ...current, ...updated }))
      setDocuments((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
      setRenameOpen(false)
      setSuccess('Document renamed')
    } catch (err) { setError(err.message) }
  }

  async function duplicateDocument() {
    if (!document) return
    try {
      const copy = await api('/api/documents', {
        method: 'POST', body: JSON.stringify({ title: `${title || 'Untitled document'} (copy)`, content }),
      })
      await loadDocuments(copy.id)
      setActiveSection('owned')
      setSuccess('Document copied')
    } catch (err) { setError(err.message) }
  }

  function openPreviousFile() {
    const currentIndex = filteredDocuments.findIndex((item) => item.id === document?.id)
    if (currentIndex > 0) openDocument(filteredDocuments[currentIndex - 1].id)
  }

  function openNextFile() {
    const currentIndex = filteredDocuments.findIndex((item) => item.id === document?.id)
    if (currentIndex >= 0 && currentIndex < filteredDocuments.length - 1) openDocument(filteredDocuments[currentIndex + 1].id)
  }

  async function openShare() {
    if (!document || document.permission !== 'owner') return
    try {
      const collaborators = await api(`/api/documents/${document.id}/shares` )
      setShares(collaborators)
      setShareOpen(true)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function addShare(event) {
    event.preventDefault()
    try {
      const result = await api(`/api/documents/${document.id}/shares`, {
        method: 'POST',
        body: JSON.stringify({ email: shareEmail, permission: sharePermission }),
      })
      setShareEmail('')
      const collaborators = await api(`/api/documents/${document.id}/shares` )
      setShares(collaborators)
      setSuccess(result.message || 'Sharing updated')
    } catch (err) {
      setError(err.message)
    }
  }

  async function copyInviteLink(person) {
    try {
      await navigator.clipboard.writeText(person.invite_url || window.location.origin)
      setSuccess(`Invitation link copied for ${person.email}`)
    } catch {
      setError('Could not copy the invitation link')
    }
  }

  async function removeShare(id) {
    try {
      await api(`/api/documents/${document.id}/shares/${id}`, { method: 'DELETE' })
      setShares((items) => items.filter((item) => item.id !== id))
      setSuccess('Collaborator removed')
    } catch (err) {
      setError(err.message)
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = file.name.split('.').pop().toLowerCase()
    if (!['txt', 'md', 'html'].includes(extension)) {
      setError('Unsupported file. Choose a .txt, .md, or .html file.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File is too large. The maximum import size is 2 MB.')
      event.target.value = ''
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      let imported = textToTipTap(text, extension === 'md' ? 'md' : 'text')
      if (extension === 'html') {
        const temp = globalThis.document.createElement('div')
        temp.textContent = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        imported = textToTipTap(temp.textContent, 'text')
      }
      await createDocument({ title: file.name.replace(/\.[^.]+$/, '') || 'Imported document', content: imported })
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch { }
    setCurrentUser(null)
    setDocument(null)
    setDocuments([])
  }

  if (authLoading) return <div className="auth-page"><div className="auth-card">Loading DocSpace…</div></div>

  if (!currentUser) return <AuthPage onAuthenticated={setCurrentUser} />

  return (
    <div className="app-shell">
      <Topbar
        currentUser={currentUser}
        document={document}
        onHome={() => { setDocument(null); setActiveSection('owned') }}
        onMenu={() => setMobileSidebar(true)}
        onLogout={logout}
        onShare={openShare}
      />

      <aside className={mobileSidebar ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-mobile-head"><strong>Documents</strong><button type="button" aria-label="Close menu" onClick={() => setMobileSidebar(false)}>×</button></div>
        <button className="new-document" type="button" onClick={() => createDocument()}><span>＋</span> New document</button>
        <nav aria-label="Document navigation">
          <button type="button" className={activeSection === 'owned' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveSection('owned')}><span>▣</span> My Documents</button>
          <button type="button" className={activeSection === 'shared' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveSection('shared')}><span>♧</span> Shared with Me</button>
        </nav>
        <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search documents" placeholder="Search documents" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="sidebar-section-head"><span>{activeSection === 'owned' ? 'My documents' : 'Shared documents'}</span><button type="button" aria-label="Import .txt, .md, or .html document (maximum 2 MB)" title="Import .txt, .md, or .html (max 2 MB)" onClick={() => fileInput.current?.click()}>⇧</button></div>
        <div className="import-types">Supported imports: TXT, MD, HTML · max 2 MB</div>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".txt,.md,.html,text/plain,text/markdown,text/html" onChange={importFile} disabled={importing} />
        <div className="document-list">
          {loading ? <div className="list-loading">Loading…</div> : filteredDocuments.length ? filteredDocuments.map((item) => (
            <button key={item.id} type="button" className={document?.id === item.id ? 'document-row active' : 'document-row'} onClick={() => openDocument(item.id)}>
              <span className="file-icon">▤</span><span><strong>{item.title}</strong><small>{item.access_type === 'shared' ? `${item.permission} access` : 'Owned by you'}</small></span>
            </button>
          )) : <div className="empty-list">No documents found</div>}
        </div>
      </aside>
      {mobileSidebar && <button className="sidebar-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileSidebar(false)} />}
      {importing && <LoadingOverlay title="Importing document…" detail="Preparing your file for editing" />}
      {openingDocument && !importing && <LoadingOverlay title="Opening document…" detail="Loading your saved content" />}

      <main className="workspace">
        {error && <div className="notice error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {success && <div className="notice success" role="status"><span>{success}</span><button type="button" aria-label="Dismiss message" onClick={() => setSuccess('')}>×</button></div>}
        {document ? (
          <>
            <div className="document-header">
              <div className="title-wrap">
                <input aria-label="Document title" className="title-input" value={title} maxLength={200} readOnly={document.permission === 'viewer'} onChange={(event) => setTitle(event.target.value)} />
                <div className="save-meta"><span className={saveStatus === 'Save failed' ? 'status-dot error-dot' : 'status-dot'} />{document.permission === 'viewer' ? 'View only' : saveStatus}</div>
              </div>
              <div className="document-actions">
                <button type="button" className="icon-button" aria-label="Open previous file" title="Previous file" disabled={filteredDocuments.findIndex((item) => item.id === document.id) <= 0} onClick={openPreviousFile}>←</button>
                <button type="button" className="icon-button" aria-label="Open next file" title="Next file" disabled={filteredDocuments.findIndex((item) => item.id === document.id) < 0 || filteredDocuments.findIndex((item) => item.id === document.id) >= filteredDocuments.length - 1} onClick={openNextFile}>→</button>
                <button type="button" className="icon-button" aria-label="Rename document" title="Rename document" onClick={() => setRenameOpen(true)}>✎</button>
                <button type="button" className="icon-button" aria-label="Download document as text" title="Download .txt" onClick={() => downloadDocument(title, content)}>⇩</button>
                <button type="button" className="icon-button" aria-label="Duplicate document" title="Duplicate document" onClick={duplicateDocument}>⧉</button>
                {document.permission === 'owner' && <button type="button" className="icon-button danger" aria-label="Delete document" title="Delete document" onClick={() => setDeleteOpen(true)}>⌫</button>}
              </div>
            </div>
            <DocumentEditor key={document.id} document={document} onContentChange={setContent} onError={setError} onSuccess={setSuccess} />
          </>
        ) : (
          <div className="welcome">
            <div className="welcome-icon">▤</div><h1>Create your next document</h1><p>Write, format, share, and collaborate from one clean workspace.</p>
            <button type="button" className="primary-button" onClick={() => createDocument()}>＋ New document</button>
          </div>
        )}
      </main>

      <ShareDialog
        open={shareOpen}
        title={title}
        shares={shares}
        shareEmail={shareEmail}
        sharePermission={sharePermission}
        onEmailChange={setShareEmail}
        onPermissionChange={setSharePermission}
        onClose={() => setShareOpen(false)}
        onSubmit={addShare}
        onCopyInvite={copyInviteLink}
        onRemove={removeShare}
      />

      <RenameDialog key={`${document?.id || 'none'}-${renameOpen}-${title}`} open={renameOpen} currentName={title} onClose={() => setRenameOpen(false)} onRename={renameDocument} />

      {deleteOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">Delete this document?</h2><p>“{title}” will be permanently removed.</p><div className="confirm-actions"><button type="button" className="secondary-button" onClick={() => setDeleteOpen(false)}>Cancel</button><button type="button" className="danger-button" onClick={deleteDocument}>Delete</button></div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
