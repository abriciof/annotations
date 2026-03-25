import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  BookCopy,
  CalendarDays,
  ChevronLeft,
  Command,
  FolderPlus,
  LogOut,
  Menu,
  NotebookPen,
  PanelRightClose,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { appName } from '../../lib/env'
import {
  createPage,
  createSubject,
  deletePage,
  deleteSubject,
  getPages,
  getSubjectSettings,
  getSubjects,
  savePage,
  saveSubjectSettings,
  signOut,
  updatePageMeta,
  updateSubject,
} from '../../lib/supabase'
import type { ImportantDate, Page, ResourceLink, Subject, SubjectSettings } from '../../types/domain'
import { useTheme } from '../theme/useTheme'
import { useAuth } from '../auth/useAuth'
import { BlockEditor } from './BlockEditor'

function linesToLinks(source: string): ResourceLink[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split('|').map((part) => part.trim())
      return { id: crypto.randomUUID(), label, url }
    })
    .filter((item) => item.label && item.url)
}

function linesToDates(source: string): ImportantDate[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, date] = line.split('|').map((part) => part.trim())
      return { id: crypto.randomUUID(), label, date }
    })
    .filter((item) => item.label && item.date)
}

function linksToText(links: ResourceLink[]) {
  return links.map((link) => `${link.label} | ${link.url}`).join('\n')
}

function datesToText(items: ImportantDate[]) {
  return items.map((item) => `${item.label} | ${item.date}`).join('\n')
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-')
}

function initialSettings(subjectId: string): Omit<SubjectSettings, 'created_at' | 'updated_at'> {
  return {
    id: crypto.randomUUID(),
    subject_id: subjectId,
    schedule: '',
    room: '',
    professor: '',
    notes: '',
    exam_summary: '',
    resource_links: [],
    important_dates: [],
  }
}

function buildPageTree(pages: Page[], parentId: string | null = null): Page[] {
  return pages.filter((page) => page.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)
}

export function WorkspacePage() {
  const navigate = useNavigate()
  const { subjectId, pageId } = useParams()
  const { user } = useAuth()
  const { theme, themes, setTheme } = useTheme()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [settingsMap, setSettingsMap] = useState<Record<string, SubjectSettings>>({})
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [rightRailOpen, setRightRailOpen] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [status, setStatus] = useState('Tudo salvo')
  const [error, setError] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)

  const currentSubject = useMemo(() => subjects.find((item) => item.id === subjectId) ?? subjects[0] ?? null, [subjectId, subjects])
  const currentSettings = currentSubject ? settingsMap[currentSubject.id] : null

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!user) return

    async function load() {
      try {
        setError(null)
        const nextSubjects = await getSubjects()
        setSubjects(nextSubjects)

        if (nextSubjects.length === 0) {
          setPages([])
          setSelectedPage(null)
          return
        }

        const activeSubject = nextSubjects.find((item) => item.id === subjectId) ?? nextSubjects[0]
        const [nextPages, nextSettings] = await Promise.all([getPages(activeSubject.id), getSubjectSettings(activeSubject.id)])

        setPages(nextPages)
        setSettingsMap((previous) => ({
          ...previous,
          [activeSubject.id]:
            nextSettings ??
            {
              ...initialSettings(activeSubject.id),
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
        }))

        const activePage = nextPages.find((item) => item.id === pageId) ?? nextPages[0] ?? null
        setSelectedPage(activePage)
        setTitleDraft(activePage?.title ?? '')

        if (!subjectId) {
          navigate(activePage ? `/subjects/${activeSubject.id}/pages/${activePage.id}` : `/subjects/${activeSubject.id}`, { replace: true })
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Falha ao carregar dados.')
      }
    }

    void load()
  }, [navigate, pageId, subjectId, user])

  useEffect(() => {
    if (!selectedPage) return

    const timeout = window.setTimeout(async () => {
      try {
        setStatus('Salvando...')
        const saved = await savePage({
          id: selectedPage.id,
          title: titleDraft || selectedPage.title,
          slug: slugify(titleDraft || selectedPage.title),
          content: selectedPage.content,
        })
        setSelectedPage(saved)
        setPages((previous) => previous.map((page) => (page.id === saved.id ? saved : page)))
        setStatus('Tudo salvo')
      } catch (nextError) {
        setStatus('Erro ao salvar')
        setError(nextError instanceof Error ? nextError.message : 'Falha ao salvar página.')
      }
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [selectedPage, titleDraft])

  function goToSubject(nextSubject: Subject) {
    const subjectPages = pages.filter((page) => page.subject_id === nextSubject.id)
    const nextPage = subjectPages[0]
    navigate(nextPage ? `/subjects/${nextSubject.id}/pages/${nextPage.id}` : `/subjects/${nextSubject.id}`)
    setMobileMenuOpen(false)
  }

  async function handleCreateSubject() {
    if (!user) return
    const name = window.prompt('Nome da disciplina')
    if (!name) return

    try {
      const { subject, settings } = await createSubject(user.id, name)
      setSubjects((previous) => [...previous, subject])
      setSettingsMap((previous) => ({ ...previous, [subject.id]: settings }))
      navigate(`/subjects/${subject.id}`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao criar disciplina.')
    }
  }

  async function handleCreatePage(parentId: string | null = null) {
    if (!currentSubject) return
    const title = window.prompt(parentId ? 'Nome da subpágina' : 'Nome da nova página')
    if (!title) return

    try {
      const createdPage = await createPage(currentSubject.id, parentId, title)
      setPages((previous) => [...previous, createdPage])
      setSelectedPage(createdPage)
      setTitleDraft(createdPage.title)
      navigate(`/subjects/${currentSubject.id}/pages/${createdPage.id}`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao criar página.')
    }
  }

  async function handleDeletePage(targetPage: Page) {
    const confirmed = window.confirm(`Excluir a página "${targetPage.title}"?`)
    if (!confirmed) return

    try {
      await deletePage(targetPage.id)
      const nextPages = pages.filter((page) => page.id !== targetPage.id && page.parent_id !== targetPage.id)
      setPages(nextPages)
      const fallback = nextPages[0] ?? null
      setSelectedPage(fallback)
      setTitleDraft(fallback?.title ?? '')
      navigate(currentSubject ? (fallback ? `/subjects/${currentSubject.id}/pages/${fallback.id}` : `/subjects/${currentSubject.id}`) : '/')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao excluir página.')
    }
  }

  async function handleDeleteSubject() {
    if (!currentSubject) return
    const confirmed = window.confirm(`Excluir a disciplina "${currentSubject.name}" e todo o conteúdo dela?`)
    if (!confirmed) return

    try {
      await deleteSubject(currentSubject.id)
      const nextSubjects = subjects.filter((subject) => subject.id !== currentSubject.id)
      setSubjects(nextSubjects)
      navigate(nextSubjects[0] ? `/subjects/${nextSubjects[0].id}` : '/')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao excluir disciplina.')
    }
  }

  async function handleMoveSubject(direction: -1 | 1) {
    if (!currentSubject) return
    const index = subjects.findIndex((subject) => subject.id === currentSubject.id)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= subjects.length) return

    const current = subjects[index]
    const target = subjects[targetIndex]

    try {
      const [updatedCurrent, updatedTarget] = await Promise.all([
        updateSubject({ id: current.id, sort_order: target.sort_order }),
        updateSubject({ id: target.id, sort_order: current.sort_order }),
      ])

      setSubjects((previous) =>
        previous
          .map((subject) => {
            if (subject.id === updatedCurrent.id) return updatedCurrent
            if (subject.id === updatedTarget.id) return updatedTarget
            return subject
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao reordenar disciplina.')
    }
  }

  async function handleMovePage(direction: -1 | 1) {
    if (!selectedPage) return
    const siblings = buildPageTree(pages, selectedPage.parent_id)
    const index = siblings.findIndex((page) => page.id === selectedPage.id)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const current = siblings[index]
    const target = siblings[targetIndex]

    try {
      const [updatedCurrent, updatedTarget] = await Promise.all([
        updatePageMeta({ id: current.id, sort_order: target.sort_order }),
        updatePageMeta({ id: target.id, sort_order: current.sort_order }),
      ])

      setPages((previous) =>
        previous
          .map((page) => {
            if (page.id === updatedCurrent.id) return updatedCurrent
            if (page.id === updatedTarget.id) return updatedTarget
            return page
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao reordenar página.')
    }
  }

  async function handleSaveSettings(formData: FormData) {
    if (!currentSubject) return
    const base = currentSettings ?? { ...initialSettings(currentSubject.id), id: crypto.randomUUID() }

    try {
      const saved = await saveSubjectSettings({
        ...base,
        schedule: String(formData.get('schedule') ?? ''),
        room: String(formData.get('room') ?? ''),
        professor: String(formData.get('professor') ?? ''),
        notes: String(formData.get('notes') ?? ''),
        exam_summary: String(formData.get('exam_summary') ?? ''),
        resource_links: linesToLinks(String(formData.get('resource_links') ?? '')),
        important_dates: linesToDates(String(formData.get('important_dates') ?? '')),
      })

      setSettingsMap((previous) => ({ ...previous, [currentSubject.id]: saved }))
      setStatus('Configurações salvas')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao salvar configurações.')
    }
  }

  async function handleInstallApp() {
    const promptEvent = installPrompt as Event & { prompt?: () => Promise<void> }
    if (promptEvent?.prompt) await promptEvent.prompt()
  }

  useHotkeys('meta+k,ctrl+k', (event) => {
    event.preventDefault()
    setCommandOpen((value) => !value)
  })

  useHotkeys('meta+n,ctrl+n', (event) => {
    event.preventDefault()
    void handleCreatePage(selectedPage?.id ?? null)
  })

  useHotkeys('meta+.,ctrl+.', (event) => {
    event.preventDefault()
    if (!currentSubject || subjects.length < 2) return
    const index = subjects.findIndex((subject) => subject.id === currentSubject.id)
    goToSubject(subjects[(index + 1) % subjects.length])
  })

  useHotkeys('meta+,,ctrl+,', (event) => {
    event.preventDefault()
    if (!currentSubject || subjects.length < 2) return
    const index = subjects.findIndex((subject) => subject.id === currentSubject.id)
    goToSubject(subjects[(index - 1 + subjects.length) % subjects.length])
  })

  const filteredCommands = (() => {
    const q = commandQuery.toLowerCase().trim()
    const commands = [
      ...subjects.map((subject) => ({
        key: `subject-${subject.id}`,
        label: `Abrir disciplina: ${subject.name}`,
        action: () => goToSubject(subject),
      })),
      ...(currentSubject
        ? [
            { key: 'new-page', label: 'Criar nova página', action: () => void handleCreatePage() },
            { key: 'new-subpage', label: 'Criar subpágina', action: () => void handleCreatePage(selectedPage?.id ?? null) },
          ]
        : []),
    ]

    return q ? commands.filter((item) => item.label.toLowerCase().includes(q)) : commands
  })()

  function renderPageNode(page: Page, depth = 0) {
    const children = buildPageTree(pages, page.id)

    return (
      <div key={page.id} className="space-y-1" style={{ '--depth': depth } as CSSProperties}>
        <button
          type="button"
          className={`btn h-auto min-h-0 w-full justify-start rounded-2xl border-0 px-3 py-3 text-left normal-case ${
            selectedPage?.id === page.id ? 'btn-primary' : 'btn-ghost'
          }`}
          onClick={() => {
            setSelectedPage(page)
            setTitleDraft(page.title)
            if (currentSubject) navigate(`/subjects/${currentSubject.id}/pages/${page.id}`)
            setMobileMenuOpen(false)
          }}
        >
          <BookCopy size={15} />
          <span className="truncate">{page.title}</span>
        </button>
        {children.length > 0 && <div className="space-y-1 pl-4">{children.map((child) => renderPageNode(child, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="drawer lg:drawer-open">
        <input className="drawer-toggle" checked={mobileMenuOpen} onChange={() => setMobileMenuOpen((value) => !value)} type="checkbox" />
        <div className="drawer-content">
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-30 border-b border-base-300 bg-base-200/85 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
                <label className="btn btn-ghost btn-square lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                  <Menu size={18} />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Disciplina ativa</div>
                  <div className="truncate text-2xl font-black">{currentSubject?.name ?? 'Crie sua primeira disciplina'}</div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="badge badge-neutral badge-lg">{status}</span>
                  <select className="select select-bordered select-sm w-36" value={theme} onChange={(event) => setTheme(event.target.value as (typeof themes)[number])}>
                    {themes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRightRailOpen((value) => !value)}>
                    <PanelRightClose size={16} />
                    Painéis
                  </button>
                  {installPrompt && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleInstallApp()}>
                      <Sparkles size={16} />
                      Instalar
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setCommandOpen(true)}>
                    <Search size={16} />
                    Buscar
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 px-3 py-4 lg:px-6">
              {error && <div className="alert alert-error mb-4">{error}</div>}
              {!currentSubject ? (
                <section className="hero min-h-[70vh] rounded-[2rem] border border-dashed border-base-300 bg-base-100">
                  <div className="hero-content text-center">
                    <div className="max-w-lg space-y-4">
                      <h3 className="text-4xl font-black">Seu espaço ainda está vazio.</h3>
                      <p className="text-base-content/70">Crie a primeira disciplina para começar a organizar aulas, fórmulas, datas e materiais.</p>
                      <button type="button" className="btn btn-primary" onClick={handleCreateSubject}>
                        Criar disciplina
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <div className={`grid gap-4 ${rightRailOpen ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1'}`}>
                  <section className="min-w-0">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100/95 px-4 py-3 shadow-sm">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Página ativa</div>
                          <div className="text-xl font-bold">{selectedPage?.title ?? 'Nenhuma página selecionada'}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" className="btn btn-primary btn-sm rounded-xl px-3" onClick={() => void handleCreatePage(selectedPage?.id ?? null)}>
                            <FolderPlus size={16} />
                            Subpágina
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl" onClick={() => void handleMovePage(-1)}>
                            ↑
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl" onClick={() => void handleMovePage(1)}>
                            ↓
                          </button>
                          {selectedPage && (
                            <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl text-error" onClick={() => void handleDeletePage(selectedPage)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedPage ? (
                        <div className="rounded-[2rem] border border-base-300 bg-base-100 p-2 shadow-sm lg:p-3">
                          <BlockEditor
                            title={titleDraft}
                            source={selectedPage.content}
                            onChange={(nextTitle, nextSource) => {
                              setTitleDraft(nextTitle)
                              setSelectedPage((previous) => (previous ? { ...previous, title: nextTitle, content: nextSource } : previous))
                            }}
                          />
                        </div>
                      ) : (
                        <div className="hero min-h-[60vh] rounded-[2rem] border border-dashed border-base-300 bg-base-100">
                          <div className="hero-content text-center">
                            <div className="space-y-4">
                              <h4 className="text-3xl font-black">Crie a primeira página da disciplina.</h4>
                              <p className="text-base-content/70">O editor agora trabalha com markdown contínuo e um preview separado para leitura e impressão.</p>
                              <button type="button" className="btn btn-primary" onClick={() => void handleCreatePage()}>
                                Criar página
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {rightRailOpen && (
                    <aside className="space-y-4">
                      <details className="collapse collapse-arrow border border-base-300 bg-base-100 shadow-sm">
                        <summary className="collapse-title flex items-center gap-3 font-semibold">
                          <Settings2 size={18} />
                          Configuração da disciplina
                        </summary>
                        <div className="collapse-content">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="text-lg font-bold">{currentSubject.name}</h3>
                            <div className="flex gap-2">
                              <button type="button" className="btn btn-ghost btn-xs" onClick={() => void handleMoveSubject(-1)}>
                                ↑
                              </button>
                              <button type="button" className="btn btn-ghost btn-xs" onClick={() => void handleMoveSubject(1)}>
                                ↓
                              </button>
                              <button type="button" className="btn btn-ghost btn-xs text-error" onClick={handleDeleteSubject}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <form
                            className="space-y-3"
                            onSubmit={(event) => {
                              event.preventDefault()
                              void handleSaveSettings(new FormData(event.currentTarget))
                            }}
                          >
                            <label className="form-control gap-2">
                              <span className="label-text">Nome</span>
                              <input
                                className="input input-bordered"
                                name="subject_name"
                                defaultValue={currentSubject.name}
                                onBlur={(event) => {
                                  void updateSubject({
                                    id: currentSubject.id,
                                    name: event.target.value,
                                    slug: slugify(event.target.value),
                                  }).then((saved) => setSubjects((previous) => previous.map((subject) => (subject.id === saved.id ? saved : subject))))
                                }}
                              />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Semestre</span>
                              <input
                                className="input input-bordered"
                                defaultValue={currentSubject.semester ?? ''}
                                onBlur={(event) => {
                                  void updateSubject({ id: currentSubject.id, semester: event.target.value }).then((saved) =>
                                    setSubjects((previous) => previous.map((subject) => (subject.id === saved.id ? saved : subject))),
                                  )
                                }}
                              />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Horário</span>
                              <input className="input input-bordered" name="schedule" defaultValue={currentSettings?.schedule ?? ''} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Sala</span>
                              <input className="input input-bordered" name="room" defaultValue={currentSettings?.room ?? ''} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Professor</span>
                              <input className="input input-bordered" name="professor" defaultValue={currentSettings?.professor ?? ''} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Links úteis</span>
                              <textarea className="textarea textarea-bordered min-h-28" name="resource_links" defaultValue={linksToText(currentSettings?.resource_links ?? [])} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Datas importantes</span>
                              <textarea className="textarea textarea-bordered min-h-28" name="important_dates" defaultValue={datesToText(currentSettings?.important_dates ?? [])} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Provas e entregas</span>
                              <textarea className="textarea textarea-bordered min-h-24" name="exam_summary" defaultValue={currentSettings?.exam_summary ?? ''} />
                            </label>
                            <label className="form-control gap-2">
                              <span className="label-text">Notas rápidas</span>
                              <textarea className="textarea textarea-bordered min-h-24" name="notes" defaultValue={currentSettings?.notes ?? ''} />
                            </label>
                            <button type="submit" className="btn btn-primary w-full">
                              Salvar configurações
                            </button>
                          </form>
                        </div>
                      </details>

                      <details className="collapse collapse-arrow border border-base-300 bg-base-100 shadow-sm">
                        <summary className="collapse-title flex items-center gap-3 font-semibold">
                          <CalendarDays size={18} />
                          Resumo da disciplina
                        </summary>
                        <div className="collapse-content space-y-3">
                          <div className="stats stats-vertical border border-base-300 shadow-sm">
                            <div className="stat">
                              <div className="stat-title">Horário</div>
                              <div className="stat-value text-lg">{currentSettings?.schedule || 'Não definido'}</div>
                            </div>
                            <div className="stat">
                              <div className="stat-title">Sala</div>
                              <div className="stat-value text-lg">{currentSettings?.room || 'Não definida'}</div>
                            </div>
                            <div className="stat">
                              <div className="stat-title">Professor</div>
                              <div className="stat-value text-lg">{currentSettings?.professor || 'Não definido'}</div>
                            </div>
                            <div className="stat">
                              <div className="stat-title">Próximas datas</div>
                              <div className="stat-value text-lg">{currentSettings?.important_dates.length ?? 0}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(currentSettings?.resource_links ?? []).map((link) => (
                              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="btn btn-outline w-full justify-start normal-case">
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </details>
                    </aside>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
        <div className="drawer-side z-40">
          <label className="drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
          <aside className="flex min-h-full w-80 flex-col gap-4 border-r border-base-300 bg-base-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Workspace</div>
                <h1 className="text-4xl font-black">{appName}</h1>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost btn-square lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="btn btn-primary btn-square" onClick={handleCreateSubject}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-base-300 bg-base-200/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Disciplinas</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={handleCreateSubject}>
                  Nova
                </button>
              </div>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    className={`btn h-auto min-h-0 w-full justify-start rounded-2xl px-4 py-3 text-left normal-case ${
                      currentSubject?.id === subject.id ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => goToSubject(subject)}
                  >
                    <NotebookPen size={16} />
                    <span className="truncate">{subject.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-[2rem] border border-base-300 bg-base-200/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Páginas</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => void handleCreatePage()}>
                  Nova
                </button>
              </div>
              <div className="max-h-[calc(100vh-24rem)] space-y-2 overflow-y-auto pr-1">{buildPageTree(pages).map((page) => renderPageNode(page))}</div>
            </div>

            <div className="grid gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setCommandOpen(true)}>
                <Command size={16} />
                Paleta de comandos
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </aside>
        </div>
      </div>
      {commandOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <Search size={16} />
              <input
                autoFocus
                className="input input-bordered w-full"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Buscar disciplina ou ação..."
              />
            </div>
            <div className="space-y-2">
              {filteredCommands.map((command) => (
                <button
                  key={command.key}
                  type="button"
                  className="btn btn-ghost w-full justify-start normal-case"
                  onClick={() => {
                    command.action()
                    setCommandOpen(false)
                    setCommandQuery('')
                  }}
                >
                  {command.label}
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setCommandOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
