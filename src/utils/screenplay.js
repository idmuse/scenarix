export const ELEMENT_TYPES = { SCENE_HEADING: 'scene_heading', ACTION: 'action', CHARACTER: 'character', PARENTHETICAL: 'parenthetical', DIALOGUE: 'dialogue', TRANSITION: 'transition', NOTE: 'note' }
export const ELEMENT_LABELS = { scene_heading: 'En-tête de scène', action: 'Action', character: 'Personnage', parenthetical: 'Parenthèse', dialogue: 'Dialogue', transition: 'Transition', note: 'Note' }
export const ELEMENT_SHORTCUTS = { scene_heading: '⌘1', action: '⌘2', character: '⌘3', parenthetical: '⌘4', dialogue: '⌘5', transition: '⌘6', note: '⌘7' }
export const TAB_CYCLE = { scene_heading: 'action', action: 'character', character: 'dialogue', parenthetical: 'dialogue', dialogue: 'character', transition: 'action', note: 'action' }
export const ENTER_CREATES = { scene_heading: 'action', action: 'action', character: 'dialogue', parenthetical: 'dialogue', dialogue: 'character', transition: 'scene_heading', note: 'action' }
export function createProject(title = 'Nouveau projet') { return { id: crypto.randomUUID(), title, format: 'fr', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scenes: [createScene()] } }
export function createScene(title = 'INT. LIEU — JOUR') { return { id: crypto.randomUUID(), title, note: '', elements: [createElement(ELEMENT_TYPES.SCENE_HEADING, title)] } }
export function createElement(type = 'action', text = '') { return { id: crypto.randomUUID(), type, text } }
export function estimatePages(scenes) { let lines = 0; scenes.forEach(s => { s.elements.forEach(el => { lines += Math.max(1, Math.ceil((el.text.length || 1) / 60)) + 1 }) }); return Math.max(1, Math.round(lines / 55)) }
export function estimateMinutes(scenes) { return estimatePages(scenes) }
export function extractSceneTitle(elements) { const h = elements.find(e => e.type === 'scene_heading'); return h ? h.text : 'Scène sans titre' }