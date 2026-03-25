import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Download, Eye, FileText, Heading1, List, ListOrdered, Printer, Sigma } from 'lucide-react'
import { MarkdownPreview } from '../../lib/markdown'

type EditorMode = 'edit' | 'preview'

interface BlockEditorProps {
  title: string
  source: string
  onChange: (title: string, source: string) => void
}

const snippets = [
  { label: 'H1', icon: Heading1, snippet: '# Titulo' },
  { label: 'Lista', icon: List, snippet: '- Item 1\n- Item 2' },
  { label: 'Num', icon: ListOrdered, snippet: '1. Primeiro\n2. Segundo' },
  { label: 'Eq', icon: Sigma, snippet: '$$\nE = mc^2\n$$' },
]

function inferTitle(source: string, fallback: string) {
  const headingLine = source
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '))

  return headingLine ? headingLine.replace(/^#\s+/, '').trim() : fallback
}

export function BlockEditor({ title, source, onChange }: BlockEditorProps) {
  const [mode, setMode] = useState<EditorMode>('edit')
  const previewTitle = useMemo(() => inferTitle(source, title || 'Sem título'), [source, title])

  function updateSource(nextSource: string) {
    onChange(title, nextSource)
  }

  function insertSnippet(snippet: string) {
    const prefix = source.trim().length > 0 ? '\n\n' : ''
    updateSource(`${source}${prefix}${snippet}`)
  }

  function handleExport() {
    const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title || 'pagina').toLowerCase().replace(/\s+/g, '-') || 'pagina'}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    setMode('preview')
    window.setTimeout(() => window.print(), 50)
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
      event.preventDefault()
      handlePrint()
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 px-4 py-4 shadow-sm">
        <input
          className="w-full border-0 bg-transparent px-0 text-3xl font-semibold leading-tight outline-none placeholder:text-base-content/30 md:text-4xl"
          value={title}
          onChange={(event) => onChange(event.target.value, source)}
          placeholder="Título da página"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="join">
            <button type="button" className={`btn btn-sm join-item ${mode === 'edit' ? 'btn-neutral' : 'btn-ghost'}`} onClick={() => setMode('edit')}>
              <FileText size={14} />
              Editar
            </button>
            <button type="button" className={`btn btn-sm join-item ${mode === 'preview' ? 'btn-neutral' : 'btn-ghost'}`} onClick={() => setMode('preview')}>
              <Eye size={14} />
              Preview
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {snippets.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.label} type="button" className="btn btn-ghost btn-xs" onClick={() => insertSnippet(item.snippet)}>
                  <Icon size={13} />
                  {item.label}
                </button>
              )
            })}
            <button type="button" className="btn btn-ghost btn-xs" onClick={handleExport}>
              <Download size={13} />
              Exportar
            </button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={handlePrint}>
              <Printer size={13} />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {mode === 'edit' ? (
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="border-b border-base-300 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-base-content/45">Markdown source</div>
          <textarea
            className="min-h-[70vh] w-full resize-none bg-transparent px-4 py-5 font-mono text-[15px] leading-8 outline-none placeholder:text-base-content/30 md:px-6"
            value={source}
            onChange={(event) => updateSource(event.target.value)}
            onKeyDown={handleEditorKeyDown}
            placeholder={'# Sua página\n\nEscreva em markdown contínuo aqui.\n\n- listas\n- fórmulas com $$ ... $$\n- tabelas, links e imagens'}
            spellCheck={false}
          />
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 px-4 py-5 shadow-sm md:px-8 md:py-8 print:border-0 print:bg-white print:px-0">
          <div className="mb-6 border-b border-base-300 pb-4 print:hidden">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-base-content/45">Preview pronto para leitura</div>
            <h2 className="mt-2 text-2xl font-semibold">{previewTitle}</h2>
          </div>
          <MarkdownPreview source={source} className="markdown-preview markdown-sheet" />
        </section>
      )}
    </div>
  )
}
