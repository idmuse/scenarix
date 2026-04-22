import { useState, useCallback, useRef, useEffect } from 'react'
import { ELEMENT_TYPES, ELEMENT_LABELS, TAB_CYCLE, ENTER_CREATES, createScene, createElement, extractSceneTitle, estimatePages, estimateMinutes } from '../utils/screenplay.js'
import { exportToPDF } from '../utils/pdfExport.js'
import './Editor.css'

// Hauteurs estimées par type d'élément (en lignes de 22px)
const LINE_HEIGHT = 22
const PAGE_LINES = 52 // ~une page A4 scénario standard
const LINES_PER_TYPE = {
  scene_heading: 2.5,
  action: 1.5,
  character: 1.5,
  parenthetical: 1,
  dialogue: 1.5,
  transition: 1.5,
  note: 1,
}

function estimateElementLines(el) {
  const charsPerLine = el.type === 'dialogue' ? 35 : el.type === 'character' ? 20 : el.type === 'parenthetical' ? 25 : 55
  const textLines = Math.max(1, Math.ceil((el.text.length || 1) / charsPerLine))
  return textLines + (LINES_PER_TYPE[el.type] || 1)
}

// Découpe les éléments en pages
function paginateElements(elements) {
  const pages = []
  let currentPage = []
  let currentLines = 0
  for (const el of elements) {
    const elLines = estimateElementLines(el)
    if (currentLines + elLines > PAGE_LINES && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = [el]
      currentLines = elLines
    } else {
      currentPage.push(el)
      currentLines += elLines
    }
  }
  if (currentPage.length > 0) pages.push(currentPage)
  return pages.length > 0 ? pages : [[]]
}

function getPlaceholder(type) {
  const p = { scene_heading:'INT./EXT. — LIEU — JOUR/NUIT', action:'Description de la scène…', character:'NOM DU PERSONNAGE', parenthetical:'(indication)', dialogue:'Réplique…', transition:'COUPE SUR :', note:'Note interne (non exportée)' }
  return p[type] || ''
}

function ScriptElement({ element, isActive, onFocus, onChange, onKeyDown, textareaRef }) {
  const localRef = useRef(null)

  const setRef = (node) => {
    localRef.current = node
    if (typeof textareaRef === 'function') textareaRef(node)
  }

  // Auto-resize : ajuste la hauteur à chaque changement de texte
  useEffect(() => {
    const el = localRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [element.text])

  return (
    <div className={"script-el el-" + element.type + (isActive ? " el-focused" : "")}>
      {isActive && <span className="el-type-label">{ELEMENT_LABELS[element.type]}</span>}
      <textarea ref={setRef} className="el-textarea" value={element.text}
        onChange={e => onChange(e.target.value)} onFocus={onFocus} onKeyDown={onKeyDown}
        placeholder={isActive ? getPlaceholder(element.type) : ''} spellCheck
        rows={1} style={{overflow:'hidden'}} />
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

  // Pagination visuelle — tous les éléments de toutes les scènes
  const allElements = project.scenes.flatMap(s => s.elements)
  const pages = paginateElements(allElements)
  const totalPages = pages.length
  const currentSceneIdx = project.scenes.findIndex(s => s.id === activeSceneId)

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
          
        </div>
        <div className="topbar-right">
          <span className="stat">p. {totalPages}</span>
          <span className="stat">~{totalPages} min</span>
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
            {pages.map((pageElements, pageIdx) => (
              <div key={pageIdx} className="page-wrapper">
                <div className="page-number-label">— {pageIdx + 1} —</div>
                <div className="page" data-format={project.format}>
                  {pageElements.map(el => {
                    // Trouver la scène de cet élément
                    const ownerScene = project.scenes.find(s => s.elements.some(e => e.id === el.id))
                    if (!ownerScene) return null
                    return (
                      <ScriptElement key={el.id} element={el} isActive={activeElementId===el.id}
                        sceneId={ownerScene.id}
                        onFocus={() => { setActiveElementId(el.id); setActiveSceneId(ownerScene.id) }}
                        onChange={text => updateElement(ownerScene.id, el.id, { text })}
                        onKeyDown={e => handleKeyDown(e, ownerScene.id, el)}
                        textareaRef={ref => { textareaRefs.current[el.id] = ref }} />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showNotePanel && (
          <div className="note-panel">
            <div className="note-panel-header">
              <span>Note — scène {currentSceneIdx + 1}</span>
              <button className="tiny-btn" onClick={() => setShowNotePanel(false)}>✕</button>
            </div>
            <textarea className="note-textarea" placeholder="Notes sur cette scène…" value={activeScene?.note||''} onChange={e => { const ns = project.scenes.map(s => s.id===activeScene.id?{...s,note:e.target.value}:s); updateScenes(ns) }} />
          </div>
        )}
      </div>

      <div className="statusbar">
        <span>Scène {currentSceneIdx + 1} / {project.scenes.length}</span>
        <span>·</span>
        <span>{activeScene?.elements.length||0} éléments</span>
        <span>·</span>
        <span>{totalPages} page{totalPages > 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Tab pour changer de type · Entrée pour continuer · ⌘1-7 raccourcis</span>
      </div>
    </div>
  )
}