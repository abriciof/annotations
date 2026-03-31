import { evaluate } from '@mdx-js/mdx'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentPropsWithoutRef, ComponentType } from 'react'
import * as runtime from 'react/jsx-runtime'

interface MarkdownPreviewProps {
  source: string
  className?: string
}

type MdxComponentProps = Record<string, unknown>
type MdxComponentsMap = Record<string, ComponentType<MdxComponentProps>>

type MdxModule = {
  default: ComponentType<{ components?: MdxComponentsMap }>
}

const mdxComponents: MdxComponentsMap = {
  a: (props: MdxComponentProps) => <a {...(props as ComponentPropsWithoutRef<'a'>)} target="_blank" rel="noreferrer" />,
  img: (props: MdxComponentProps) => <img {...(props as ComponentPropsWithoutRef<'img'>)} loading="lazy" alt={(props as ComponentPropsWithoutRef<'img'>).alt ?? ''} />,
}

export function MarkdownPreview({ source, className }: MarkdownPreviewProps) {
  const [Content, setContent] = useState<ComponentType<{ components?: MdxComponentsMap }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedSource = useMemo(() => (source.trim().length > 0 ? source : '\n'), [source])

  useEffect(() => {
    let cancelled = false

    async function compile() {
      try {
        const compiled = (await evaluate(normalizedSource, {
          ...runtime,
          remarkPlugins: [remarkGfm, remarkMath, remarkBreaks],
          rehypePlugins: [rehypeKatex],
        })) as MdxModule

        if (cancelled) return
        setContent(() => compiled.default)
        setError(null)
      } catch (nextError) {
        if (cancelled) return
        setContent(null)
        setError(nextError instanceof Error ? nextError.message : 'Falha ao renderizar o markdown.')
      }
    }

    void compile()

    return () => {
      cancelled = true
    }
  }, [normalizedSource])

  return (
    <div className={className}>
      {error ? (
        <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Erro ao renderizar o preview: {error}
        </div>
      ) : Content ? (
        <Content components={mdxComponents} />
      ) : (
        <div className="text-sm text-base-content/50">Renderizando preview...</div>
      )}
    </div>
  )
}
