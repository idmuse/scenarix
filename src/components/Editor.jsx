import { useState, useCallback, useRef } from 'react'
import { ELEMENT_TYPES, ELEMENT_LABELS, TAB_CYCLE, ENTER_CREATES, createScene, createElement, extractSceneTitle, estimatePages, estimateMinutes } from '../utils/screenplay.js'
import { exportToPDF } from '../utils/pdfExport.js'
import './Editor.css'
function getPlaceholder(type) {
  const p = { scene_heading:'INT. LIEU — JOUR', action:'Description de la scène…', character:'NOM DU PERSONNAGE', parenthetical:'(indication)', dialogue:'Réplique…', transition:'COUPE SUR :', note:'Note interne (non exportée)' }
  return p[type] || ''
}
function ScriptElement({ element, isActive, onFocus, onChange, onKeyDown, textareaRef }) {
  const rows = Math.max(1, Math.ceil((element.text.length || 1) / 55))
  return (
    <div className={"script-el el-" + element.type + (isActive ? " el-focused" : "")}>
      {isActive && <span className="el-type-label">{ELEMENT_LABELS[element.type]}</span>}
      <textarea ref={textareaRef} className="el-textarea" value={element.text} rows={rows}
        onChange={e => onChange(e.target.value)} onFocus={onFocus} onKeyDown={onKeyDown}
        placeholder={isActive ? getPlaceholder(element.type) : ''} spellCheck />
    </div>
  )
}
export default function Editor({ project, onUpdate, onBack, onExportProject }) {
  const [activeSceneId, setActiveSceneId] = useState(project?.scenes?.[0]?.id || null)
  const [activeElementId, setActiveElementId] = useState(null)
  const [showNotePanel, setShowNotePanel] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(project?.title || '')
  const [editingAuthor, setEditingAuthor] = useState(false)
  const [authorVal, setAuthorVal] = useState(project?.author || '')
  const textareaRefs = useRef({})
  if (!project) return null
  const activeScene = project.scenes.find(s => s.id === activeSceneId) || project.scenes[0]
  const updateScenes = (newScenes) => onUpdate({ ...project, scenes: newScenes })
  const updateElement = useCallback((sceneId, elementId, changes) => {
    updateScenes(project.scenes.map(s => s.id !== sceneId ? s : { ...s, elements: s.elements.map(el => el.id !== elementId ? el : { ...el, ...changes }) }))
  }, [project])
  const addElementAfter = useCallback((sceneId, afterId, type) => {
    const newEl = createElement(type, '')
    updateScenes(project.scenes.map(s => {
      if (s.id !== sceneId) return s
      const idx = s.elements.findIndex(el => el.id === afterId)
      const els = [...s.elements]; els.splice(idx + 1, 0, newEl)
      return { ...s, elements: els }
    }))
    setTimeout(() => { setActiveElementId(newEl.id); textareaRefs.current[newEl.id]?.focus() }, 30)
  }, [project])
  const deleteElement = useCallback((sceneId, elementId) => {
    const scene = project.scenes.find(s => s.id === sceneId)
    if (!scene || scene.elements.length <= 1) return
    const idx = scene.elements.findIndex(el => el.id === elementId)
    const prevId = scene.elements[idx - 1]?.id
    updateScenes(project.scenes.map(s => s.id !== sceneId ? s : { ...s, elements: s.elements.filter(el => el.id !== elementId) }))
    if (prevId) { setActiveElementId(prevId); setTimeout(() => textareaRefs.current[prevId]?.focus(), 30) }
  }, [project])
  const setElementType = useCallback((sceneId, elementId, type) => {
    updateElement(sceneId, elementId, { type })
    setTimeout(() => textareaRefs.current[elementId]?.focus(), 10)
  }, [updateElement])
  const addScene = () => {
    const s = createScene()
    updateScenes([...project.scenes, s])
    setActiveSceneId(s.id)
    setActiveElementId(s.elements[0].id)
    setTimeout(() => textareaRefs.current[s.elements[0].id]?.focus(), 50)
  }
  const deleteScene = (sceneId) => {
    if (project.scenes.length <= 1) return
    const newScenes = project.scenes.filter(s => s.id !== sceneId)
    updateScenes(newScenes)
    if (activeSceneId === sceneId) setActiveSceneId(newScenes[0].id)
  }
  const moveScene = (sceneId, dir) => {
    const idx = project.scenes.findIndex(s => s.id === sceneId)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= project.scenes.length) return
    const arr = [...project.scenes];[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    updateScenes(arr)
  }
  const handleKeyDown = useCallback((e, sceneId, element) => {
    if (e.key === 'Tab') { e.preventDefault(); const next = e.shiftKey ? (Object.keys(TAB_CYCLE).find(k => TAB_CYCLE[k] === element.type) || element.type) : TAB_CYCLE[element.type]; setElementType(sceneId, element.id, next); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addElementAfter(sceneId, element.id, ENTER_CREATES[element.type] || 'action'); return }
    if (e.key === 'Backspace' && element.text === '') { e.preventDefault(); deleteElement(sceneId, element.id); return }
    if (e.metaKey || e.ctrlKey) { const m = {'1':'scene_heading','2':'action','3':'character','4':'parenthetical','5':'dialogue','6':'transition','7':'note'}; if (m[e.key]) { e.preventDefault(); setElementType(sceneId, element.id, m[e.key]) } }
  }, [addElementAfter, deleteElement, setElementType])
  const saveTitle = () => { if (titleVal.trim()) onUpdate({ ...project, title: titleVal.trim() }); setEditingTitle(false) }
  const saveAuthor = () => { onUpdate({ ...project, author: authorVal.trim() }); setEditingAuthor(false) }
  const pages = estimatePages(project.scenes)
  const mins = estimateMinutes(project.scenes)
  return (
    <div className="editor">
      <div className="editor-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={onBack}>←</button>
          {editingTitle
            ? <input className="title-input" value={titleVal} autoFocus onChange={e => setTitleVal(e.target.value)} onBlur={saveTitle} onKeyDown={e => { if (e.key==='Enter') saveTitle(); if (e.key==='Escape') setEditingTitle(false) }} />
            : <h1 className="editor-title" onClick={() => setEditingTitle(true)}>{project.title}</h1>
          }
          {editingAuthor
            ? <input className="author-input" value={authorVal} autoFocus placeholder="Auteur·rice(s)" onChange={e => setAuthorVal(e.target.value)} onBlur={saveAuthor} onKeyDown={e => { if (e.key==='Enter') saveAuthor(); if (e.key==='Escape') setEditingAuthor(false) }} />
            : <span className="author-badge" onClick={() => setEditingAuthor(true)}>{project.author ? '✍ '+project.author : '+ auteur·rice'}</span>
          }
          <span className="format-badge">{project.format==='us'?'US':'FR'}</span>
        </div>
        <div className="topbar-right">
          <span className="stat">~{pages} p.</span>
          <span className="stat">~{mins} min</span>
          <button className="btn-ghost-sm" onClick={() => setShowNotePanel(v => !v)}>Notes</button>
          <button className="btn-ghost-sm" onClick={() => onExportProject(project)}>JSON</button>
          <button className="btn-accent-sm" onClick={() => exportToPDF(project)}>Export PDF</button>
        </div>
      </div>
      <div className="editor-body">
        <div className="scene-sidebar">
          <div className="sidebar-header">Scènes</div>
          <div className="scene-list">
            {project.scenes.map((s, i) => (
              <div key={s.id} className={"scene-item"+(s.id===activeSceneId?" active":"")} onClick={() => setActiveSceneId(s.id)}>
                <div className="scene-item-top">
                  <span className="scene-num">{i+1}</span>
                  <div className="scene-item-actions">
                    <button className="tiny-btn" onClick={e=>{e.stopPropagation();moveScene(s.id,-1)}}>↑</button>
                    <button className="tiny-btn" onClick={e=>{e.stopPropagation();moveScene(s.id,1)}}>↓</button>
                    {project.scenes.length>1 && <button className="tiny-btn danger" onClick={e=>{e.stopPropagation();deleteScene(s.id)}}>✕</button>}
                  </div>
                </div>
                <div className="scene-item-title">{extractSceneTitle(s.elements)}</div>
                {s.note && <div className="scene-has-note">📝</div>}
              </div>
            ))}
          </div>
          <div className="sidebar-footer"><button className="add-scene-btn" onClick={addScene}>+ Scène</button></div>
        </div>
        <div className="writing-area">
          <div className="format-bar">
            {Object.entries(ELEMENT_LABELS).map(([type, label]) => {
              const activeEl = activeScene?.elements.find(el => el.id === activeElementId)
              return <button key={type} className={"fmt-btn"+(activeEl?.type===type?" active":"")} onClick={() => { if (activeEl) setElementType(activeScene.id, activeEl.id, type) }}>{label}</button>
            })}
          </div>
          <div className="page-scroll">
            <div className="page" data-format={project.format}>
              {activeScene?.elements.map(el => (
                <ScriptElement key={el.id} element={el} isActive={activeElementId===el.id} sceneId={activeScene.id}
                  onFocus={() => setActiveElementId(el.id)}
                  onChange={text => updateElement(activeScene.id, el.id, { text })}
                  onKeyDown={e => handleKeyDown(e, activeScene.id, el)}
                  textareaRef={ref => { textareaRefs.current[el.id] = ref }} />
              ))}
            </div>
          </div>
        </div>
        {showNotePanel && (
          <div className="note-panel">
            <div className="note-panel-header">
              <span>Note — scène {project.scenes.findIndex(s=>s.id===activeSceneId)+1}</span>
              <button className="tiny-btn" onClick={() => setShowNotePanel(false)}>✕</button>
            </div>
            <textarea className="note-textarea" placeholder="Notes sur cette scène…" value={activeScene?.note||''} onChange={e => { const ns = project.scenes.map(s => s.id===activeScene.id?{...s,note:e.target.value}:s); updateScenes(ns) }} />
          </div>
        )}
      </div>
      <div className="statusbar">
        <span>Scène {project.scenes.findIndex(s=>s.id===activeSceneId)+1} / {project.scenes.length}</span>
        <span>·</span><span>{activeScene?.elements.length||0} éléments</span>
        <span>·</span><span>Tab pour changer de type · Entrée pour continuer · ⌘1-7 raccourcis</span>
      </div>
    </div>
  )
}