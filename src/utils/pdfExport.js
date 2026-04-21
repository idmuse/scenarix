import { jsPDF } from 'jspdf'
const FMT = { fr: { pageWidth:210, pageHeight:297, marginLeft:25, marginRight:25, marginTop:25, marginBottom:25, fontSize:12, lineHeight:7 }, us: { pageWidth:215.9, pageHeight:279.4, marginLeft:38, marginRight:25, marginTop:25, marginBottom:25, fontSize:12, lineHeight:7 } }
function getStyle(type, fmt) {
  const w = fmt.pageWidth - fmt.marginLeft - fmt.marginRight
  const s = { scene_heading:{indent:0,w,bold:true,upper:true,sb:10}, action:{indent:0,w,bold:false,upper:false,sb:5}, character:{indent:w*.35,w:w*.3,bold:false,upper:true,sb:10}, parenthetical:{indent:w*.25,w:w*.3,bold:false,upper:false,italic:true,sb:0}, dialogue:{indent:w*.18,w:w*.46,bold:false,upper:false,sb:0}, transition:{indent:w*.6,w:w*.4,bold:false,upper:true,sb:10}, note:{skip:true} }
  return s[type] || {indent:0,w,bold:false,upper:false,sb:5}
}
export function exportToPDF(project) {
  const fmt = FMT[project.format] || FMT.fr
  const doc = new jsPDF({ unit:'mm', format: project.format==='us'?'letter':'a4' })
  doc.setFont('Courier','bold'); doc.setFontSize(16)
  doc.text(project.title.toUpperCase(), fmt.pageWidth/2, fmt.pageHeight/2-20, {align:'center'})
  doc.setFont('Courier','normal'); doc.setFontSize(12)
  doc.text('Écrit avec ScriptFlow', fmt.pageWidth/2, fmt.pageHeight/2-6, {align:'center'})
  doc.text(new Date().toLocaleDateString('fr-CA'), fmt.pageWidth/2, fmt.pageHeight/2+1, {align:'center'})
  doc.addPage(); let y = fmt.marginTop; let pg = 2
  function addPage() { doc.addPage(); pg++; y = fmt.marginTop; doc.setFont('Courier','normal'); doc.setFontSize(10); doc.text(pg+'.', fmt.pageWidth-fmt.marginRight, 18, {align:'right'}) }
  project.scenes.forEach(scene => {
    scene.elements.forEach(el => {
      if (!el.text.trim()) return
      const st = getStyle(el.type, fmt); if (st.skip) return
      y += st.sb; if (y > fmt.pageHeight - fmt.marginBottom) addPage()
      doc.setFont('Courier', st.bold?'bold':st.italic?'italic':'normal'); doc.setFontSize(fmt.fontSize)
      const txt = st.upper ? el.text.toUpperCase() : el.text
      const lines = doc.splitTextToSize(txt, st.w)
      lines.forEach(line => { if (y + fmt.lineHeight > fmt.pageHeight - fmt.marginBottom) addPage(); doc.text(line, fmt.marginLeft + st.indent, y); y += fmt.lineHeight })
    })
  })
  doc.save(project.title.replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.pdf')
}