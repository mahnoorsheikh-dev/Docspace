export const EMPTY_CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] }

export function textToTipTap(text, extension = 'text') {
  const lines = text.replace(/\r/g, '').split('\n')
  if (!lines.length || !lines.join('').trim()) return EMPTY_CONTENT

  const content = lines.map((line) => {
    const value = line.trim()
    if (!value) return { type: 'paragraph' }
    if (extension === 'md' && /^#{1,6}\s/.test(value)) {
      const level = Math.min(value.match(/^#+/)[0].length, 6)
      return { type: 'heading', attrs: { level }, content: [{ type: 'text', text: value.replace(/^#{1,6}\s/, '') }] }
    }
    if (extension === 'md' && /^[-*]\s/.test(value)) {
      return { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: value.replace(/^[-*]\s/, '') }] }] }] }
    }
    if (extension === 'md' && /^\d+[.)]\s/.test(value)) {
      return { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: value.replace(/^\d+[.)]\s/, '') }] }] }] }
    }
    return { type: 'paragraph', content: [{ type: 'text', text: value }] }
  })

  return { type: 'doc', content }
}
