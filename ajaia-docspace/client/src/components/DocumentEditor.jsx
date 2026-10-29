import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'

const EMPTY_CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] }

function Toolbar({ editor, disabled, onError, onSuccess }) {
  if (!editor) return null

  const copyText = async () => {
    try {
      const { from, to } = editor.state.selection
      const text = from === to ? editor.getText() : editor.state.doc.textBetween(from, to, '\n')
      await navigator.clipboard.writeText(text)
      onSuccess?.('Copied to clipboard')
    } catch (error) { onError?.(error.message || 'Could not copy text') }
  }

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) editor.chain().focus().insertContent(text).run()
      onSuccess?.('Pasted from clipboard')
    } catch (error) { onError?.(error.message || 'Clipboard access was blocked') }
  }

  return (
    <div className="toolbar" aria-label="Text formatting toolbar">
      <button type="button" aria-label="Undo" title="Undo" className="tool" disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</button>
      <button type="button" aria-label="Redo" title="Redo" className="tool" disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</button>
      <select aria-label="Paragraph style" disabled={disabled} value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : '0'} onChange={(event) => {
        const value = event.target.value
        if (value === '0') editor.chain().focus().setParagraph().run()
        else editor.chain().focus().toggleHeading({ level: Number(value) }).run()
      }}>
        <option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
      </select>
      <button type="button" aria-label="Bold" title="Bold" className={editor.isActive('bold') ? 'tool active' : 'tool'} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button type="button" aria-label="Italic" title="Italic" className={editor.isActive('italic') ? 'tool active' : 'tool'} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      <button type="button" aria-label="Underline" title="Underline" className={editor.isActive('underline') ? 'tool active' : 'tool'} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></button>
      <span className="toolbar-divider" />
      <button type="button" aria-label="Bulleted list" title="Bulleted list" className={editor.isActive('bulletList') ? 'tool active' : 'tool'} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
      <button type="button" aria-label="Numbered list" title="Numbered list" className={editor.isActive('orderedList') ? 'tool active' : 'tool'} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
      <span className="toolbar-divider" />
      <button type="button" aria-label="Copy selected text" title="Copy selected text" className="tool clipboard-tool" onClick={copyText}>Copy</button>
      <button type="button" aria-label="Cut selected text" title="Cut selected text" className="tool clipboard-tool" disabled={disabled} onClick={async () => {
        try {
          const { from, to } = editor.state.selection
          if (from !== to) {
            await navigator.clipboard.writeText(editor.state.doc.textBetween(from, to, '\n'))
            editor.chain().focus().deleteSelection().run()
            onSuccess?.('Cut to clipboard')
          }
        } catch (error) { onError?.(error.message || 'Could not cut text') }
      }}>Cut</button>
      <button type="button" aria-label="Paste clipboard text" title="Paste clipboard text" className="tool clipboard-tool" disabled={disabled} onClick={pasteText}>Paste</button>
    </div>
  )
}

export default function DocumentEditor({ document, onContentChange, onError, onSuccess }) {
  const savedContent = document?.content
  const initialContent = savedContent && typeof savedContent === 'object' && !Array.isArray(savedContent)
    ? savedContent
    : typeof savedContent === 'string'
      ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: savedContent }] }] }
      : EMPTY_CONTENT

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline, Placeholder.configure({ placeholder: 'Start writing your document...' })],
    content: initialContent,
    editable: document?.permission !== 'viewer' && Boolean(document?.id),
    onUpdate: ({ editor: current }) => onContentChange(current.getJSON()),
  }, [document?.id])

  useEffect(() => {
    if (!editor || !document) return
    const restoredContent = document.content && typeof document.content === 'object' && !Array.isArray(document.content)
      ? document.content
      : typeof document.content === 'string'
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: document.content }] }] }
        : EMPTY_CONTENT
    editor.commands.setContent(restoredContent, false)
    editor.setEditable(document.permission !== 'viewer')
  }, [editor, document])

  return <>
    <Toolbar editor={editor} disabled={document?.permission === 'viewer'} onError={onError} onSuccess={onSuccess} />
    <div className="canvas-scroll"><div className="paper"><EditorContent editor={editor} className="editor" /></div></div>
  </>
}
