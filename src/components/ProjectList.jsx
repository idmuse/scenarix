import { useState, useRef } from 'react'
import { estimatePages, estimateMinutes } from '../utils/screenplay.js'
import './ProjectList.css'
export default function ProjectList({ projects, onNew, onOpen, onDelete, onExportAll, onExportProject, onImport, importError }) {
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(null)
  const fileRef = useRef()
  const handleCreate = () => { if (!newTitle.trim()) return; onNew(newTitle.trim(), 'us', newAuthor.trim()); setShowNew(false); setNewTitle(''); setNewAuthor('') }
  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) onImport(file); e.target.value = '' }
  const formatDate = (iso) => { if (!iso) return ''; return new Date(iso).toLocaleDateString('fr-CA', { year:'numeric', month:'long', day:'numeric' }) }
  return (
    <div className="home">
      <div className="home-header">
        <div className="home-logo"><span className="logo-text">Scripta</span><span className="logo-badge">Beta</span></div>
        <div className="home-actions">
          <button className="btn-ghost" onClick={() => fileRef.current.click()}>Importer</button>
          {projects.length > 0 && <button className="btn-ghost" onClick={onExportAll}>Tout exporter</button>}
          <button className="btn-accent" onClick={() => setShowNew(true)}>+ Nouveau scénario</button>
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={handleFileChange} />
        </div>
      </div>
      {importError && <div className="import-error">{importError}</div>}
      <div className="home-body">
        {showNew && (
          <div className="new-project-card">
            <h3>Nouveau scénario</h3>
            <input autoFocus className="input-field" placeholder="Titre du scénario" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key==='Enter') handleCreate(); if (e.key==='Escape') setShowNew(false) }} />
            <input className="input-field" placeholder="Auteur·rice(s) — apparaîtra sur la couverture PDF" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} onKeyDown={e => { if (e.key==='Enter') handleCreate(); if (e.key==='Escape') setShowNew(false) }} />            <div className="new-project-btns">
              <button className="btn-ghost" onClick={() => setShowNew(false)}>Annuler</button>
              <button className="btn-accent" onClick={handleCreate} disabled={!newTitle.trim()}>Créer</button>
            </div>
          </div>
        )}
        {projects.length === 0 && !showNew ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p>Aucun scénario pour l'instant.</p>
            <p className="empty-sub">Créez-en un ou importez un fichier JSON.</p>
            <button className="btn-accent" onClick={() => setShowNew(true)}>Commencer</button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map(p => {
              const pages = estimatePages(p.scenes || [])
              const mins = estimateMinutes(p.scenes || [])
              return (
                <div key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
                  <div className="project-card-top">
                                        <div className="project-menu" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" title="Exporter JSON" onClick={() => onExportProject(p)}>↓</button>
                      <button className="icon-btn danger" title="Supprimer" onClick={() => setConfirmDelete(p.id)}>✕</button>
                    </div>
                  </div>
                  <h3 className="project-title">{p.title}</h3>
                  {p.author && <div className="project-author">✍ {p.author}</div>}
                  <div className="project-meta"><span>{p.scenes?.length||0} scène{(p.scenes?.length||0)!==1?'s':''}</span><span>·</span><span>~{pages} p.</span><span>·</span><span>~{mins} min</span></div>
                  <div className="project-date">{formatDate(p.updatedAt)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Supprimer ce scénario ?</h3>
            <p>Cette action est irréversible. Pensez à exporter votre JSON avant.</p>
            <div className="modal-btns">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null) }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}