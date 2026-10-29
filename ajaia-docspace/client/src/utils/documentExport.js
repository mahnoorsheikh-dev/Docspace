export function tipTapToPlainText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  if (!node.content?.length) return node.type === 'hardBreak' ? '\n' : ''
  const childText = node.content.map(tipTapToPlainText).join(node.type === 'paragraph' ? '' : '')
  if (node.type === 'paragraph' || /^heading/.test(node.type)) return `${childText}\n`
  return childText
}

export function downloadDocument(title, content) {
  const text = tipTapToPlainText(content).replace(/\n{3,}/g, '\n\n').trim()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.trim().replace(/[\\/:*?"<>|]/g, '-') || 'Untitled document'}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
