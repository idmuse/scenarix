import { useState, useEffect, useCallback } from 'react'
import { createProject } from './utils/screenplay.js'
import ProjectList from './components/ProjectList.jsx'
import Editor from './components/Editor.jsx'
import './App.css'
const STORAGE_KEY = 'scriptflow_session'
export default function App() {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [view, setView] = useState('home')
  const [importError, setImportError] = useState(null)
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const data = JSON.parse(saved); if (data.projects) setProjects(data.projects); if (data.activeProjectId) { setActiveProjectId(data.activeProjectId); setView('editor') } } } catch {} }, [])
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeProjectId })) } catch {} }, [projects, activeProjectId])
  const activeProject = projects.find(p => p.id === activeProjectId) || null
  const updateProject = useCallback((updated) => { setProjects(prev => prev.map(p => p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p)) }, [])
  const newProject = (title = 'Mon scénario', format = 'fr') => { const p = createProject(title); p.format = format; setProjects(prev => [...prev, p]); setActiveProjectId(p.id); setView('editor') }
  const deleteProject = (id) => { setProjects(prev => prev.filter(p => p.id !== id)); if (activeProjectId === id) { setActiveProjectId(null); setView('home') } }
  const openProject = (id) => { setActiveProjectId(id); setView('editor') }
  const exportJSON = () => { const blob = new Blob([JSON.stringify({ version:1, projects }, null, 2)], {type:'application/json'}); const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:'scriptflow_sauvegarde.json'}); a.click() }
  const exportProjectJSON = (project) => { const blob = new Blob([JSON.stringify({ version:1, projects:[project] }, null, 2)], {type:'application/json'}); const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download: project.title.replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.json'}); a.click() }
  const importJSON = (file) => { setImportError(null); const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (!data.projects || !Array.isArray(data.projects)) throw new Error('invalid'); const imported = data.projects.map(p => ({...p, id: p.id || crypto.randomUUID()})); setProjects(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev.filter(p => !imported.find(i => i.id===p.id)), ...imported] }); if (imported.length === 1) { setActiveProjectId(imported[0].id); setView('editor') } } catch { setImportError('Fichier invalide. Veuillez importer un fichier ScriptFlow (.json).') } }; reader.readAsText(file) }
  return (
    <div className="app">
      {view === 'home'
        ? <ProjectList projects={projects} onNew={newProject} onOpen={openProject} onDelete={deleteProject} onExportAll={exportJSON} onExportProject={exportProjectJSON} onImport={importJSON} importError={importError} />
        : <Editor project={activeProject} onUpdate={updateProject} onBack={() => setView('home')} onExportProject={exportProjectJSON} />
      }
    </div>
  )
}