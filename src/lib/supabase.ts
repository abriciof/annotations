import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, storageBucket, supabaseAnonKey, supabaseUrl } from './env'
import type { ImportantDate, Json, Page, Profile, ResourceLink, Subject, SubjectSettings } from '../types/domain'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

const subjectSelect = 'id,user_id,name,slug,color,icon,semester,sort_order,created_at,updated_at'
const settingsSelect =
  'id,subject_id,schedule,room,professor,notes,resource_links,important_dates,exam_summary,created_at,updated_at'
const pageSelect = 'id,subject_id,parent_id,title,slug,sort_order,content,created_at,updated_at'

function ensureClient() {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  return supabase
}

export function normalizeAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha ao autenticar.'
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Email ou senha inválidos no Supabase Auth.'
  }

  if (lower.includes('email not confirmed')) {
    return 'O usuário existe, mas o email ainda não foi confirmado no Supabase.'
  }

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Não foi possível alcançar o Supabase. Revise URL, chave anon e conexão.'
  }

  return message
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Variáveis do Supabase ainda não foram configuradas.',
    }
  }

  try {
    const client = ensureClient()
    const { error } = await client.auth.getSession()

    if (error) {
      return {
        ok: false,
        message: normalizeAuthErrorMessage(error),
      }
    }

    return {
      ok: true,
      message: 'Cliente Supabase inicializado e respondendo.',
    }
  } catch (error) {
    return {
      ok: false,
      message: normalizeAuthErrorMessage(error),
    }
  }
}

function parseLinks(value: Json | null): ResourceLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, Json>
    if (typeof record.id !== 'string' || typeof record.label !== 'string' || typeof record.url !== 'string') return []
    return [{ id: record.id, label: record.label, url: record.url }]
  })
}

function parseDates(value: Json | null): ImportantDate[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, Json>
    if (typeof record.id !== 'string' || typeof record.label !== 'string' || typeof record.date !== 'string') return []
    return [{ id: record.id, label: record.label, date: record.date }]
  })
}

function parseSettings(row: Record<string, Json>): SubjectSettings {
  return {
    id: String(row.id),
    subject_id: String(row.subject_id),
    schedule: typeof row.schedule === 'string' ? row.schedule : null,
    room: typeof row.room === 'string' ? row.room : null,
    professor: typeof row.professor === 'string' ? row.professor : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    resource_links: parseLinks((row.resource_links as Json | null) ?? null),
    important_dates: parseDates((row.important_dates as Json | null) ?? null),
    exam_summary: typeof row.exam_summary === 'string' ? row.exam_summary : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function blockToMarkdown(block: Json) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return ''
  const record = block as Record<string, Json>
  const content = typeof record.content === 'string' ? record.content : ''
  const type = typeof record.type === 'string' ? record.type : 'paragraph'

  if (type === 'equation') return content ? `$$\n${content}\n$$` : ''
  if (type === 'link') {
    const url = typeof record.url === 'string' ? record.url : ''
    return url ? `[${content || url}](${url})` : content
  }
  if (type === 'image') {
    const url = typeof record.url === 'string' ? record.url : ''
    const alt = typeof record.alt === 'string' ? record.alt : content || 'Imagem'
    return url ? `![${alt}](${url})` : ''
  }
  if (type === 'checklist') {
    const checked = Boolean(record.checked)
    return `- [${checked ? 'x' : ' '}] ${content}`
  }

  return content
}

function parsePageContent(value: Json | null) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((block) => blockToMarkdown(block))
      .filter(Boolean)
      .join('\n\n')
  }

  return ''
}

function parsePage(row: Record<string, Json>): Page {
  return {
    id: String(row.id),
    subject_id: String(row.subject_id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title),
    slug: String(row.slug),
    sort_order: Number(row.sort_order),
    content: parsePageContent((row.content as Json | null) ?? null),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function signInWithPassword(email: string, password: string) {
  const client = ensureClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(normalizeAuthErrorMessage(error))
}

export async function signOut() {
  const client = ensureClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getMyProfile() {
  const client = ensureClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!authData.user) return null

  const { data, error } = await client.from('profiles').select('*').eq('id', authData.user.id).maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export async function getSubjects() {
  const client = ensureClient()
  const { data, error } = await client.from('subjects').select(subjectSelect).order('sort_order').order('created_at')
  if (error) throw error
  return (data ?? []) as Subject[]
}

export async function createSubject(userId: string, name: string) {
  const client = ensureClient()
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-')
  const { data: existing } = await client
    .from('subjects')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await client
    .from('subjects')
    .insert({
      user_id: userId,
      name,
      slug,
      color: '#ff7a18',
      icon: 'NotebookPen',
      sort_order: (existing?.sort_order ?? -1) + 1,
    })
    .select(subjectSelect)
    .single()

  if (error) throw error

  const { data: settings, error: settingsError } = await client
    .from('subject_settings')
    .insert({
      subject_id: data.id,
      resource_links: [],
      important_dates: [],
    })
    .select(settingsSelect)
    .single()

  if (settingsError) throw settingsError

  return {
    subject: data as Subject,
    settings: parseSettings(settings as unknown as Record<string, Json>),
  }
}

export async function updateSubject(subject: Partial<Subject> & Pick<Subject, 'id'>) {
  const client = ensureClient()
  const payload: Partial<Subject> = {}
  if (subject.name !== undefined) payload.name = subject.name
  if (subject.slug !== undefined) payload.slug = subject.slug
  if (subject.color !== undefined) payload.color = subject.color
  if (subject.icon !== undefined) payload.icon = subject.icon
  if (subject.semester !== undefined) payload.semester = subject.semester
  if (subject.sort_order !== undefined) payload.sort_order = subject.sort_order

  const { data, error } = await client.from('subjects').update(payload).eq('id', subject.id).select(subjectSelect).single()
  if (error) throw error
  return data as Subject
}

export async function deleteSubject(subjectId: string) {
  const client = ensureClient()
  const { error } = await client.from('subjects').delete().eq('id', subjectId)
  if (error) throw error
}

export async function getSubjectSettings(subjectId: string) {
  const client = ensureClient()
  const { data, error } = await client.from('subject_settings').select(settingsSelect).eq('subject_id', subjectId).maybeSingle()
  if (error) throw error
  return data ? parseSettings(data as unknown as Record<string, Json>) : null
}

export async function saveSubjectSettings(settings: Omit<SubjectSettings, 'created_at' | 'updated_at'>) {
  const client = ensureClient()
  const { data, error } = await client
    .from('subject_settings')
    .upsert(
      {
        id: settings.id,
        subject_id: settings.subject_id,
        schedule: settings.schedule,
        room: settings.room,
        professor: settings.professor,
        notes: settings.notes,
        exam_summary: settings.exam_summary,
        resource_links: settings.resource_links,
        important_dates: settings.important_dates,
      },
      { onConflict: 'subject_id' },
    )
    .select(settingsSelect)
    .single()

  if (error) throw error
  return parseSettings(data as unknown as Record<string, Json>)
}

export async function getPages(subjectId: string) {
  const client = ensureClient()
  const { data, error } = await client
    .from('pages')
    .select(pageSelect)
    .eq('subject_id', subjectId)
    .order('sort_order')
    .order('created_at')

  if (error) throw error
  return (data ?? []).map((row) => parsePage(row as unknown as Record<string, Json>))
}

export async function createPage(subjectId: string, parentId: string | null, title: string) {
  const client = ensureClient()
  const slug = title.toLowerCase().trim().replace(/\s+/g, '-')
  const { data: existing } = await client
    .from('pages')
    .select('sort_order')
    .eq('subject_id', subjectId)
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await client
    .from('pages')
    .insert({
      subject_id: subjectId,
      parent_id: parentId,
      title,
      slug,
      sort_order: (existing?.sort_order ?? -1) + 1,
      content: '',
    })
    .select(pageSelect)
    .single()

  if (error) throw error
  return parsePage(data as unknown as Record<string, Json>)
}

export async function savePage(page: Pick<Page, 'id' | 'title' | 'slug' | 'content'>) {
  const client = ensureClient()
  const { data, error } = await client
    .from('pages')
    .update({ title: page.title, slug: page.slug, content: page.content })
    .eq('id', page.id)
    .select(pageSelect)
    .single()

  if (error) throw error
  return parsePage(data as unknown as Record<string, Json>)
}

export async function updatePageMeta(page: Partial<Page> & Pick<Page, 'id'>) {
  const client = ensureClient()
  const payload: Partial<Page> = {}
  if (page.parent_id !== undefined) payload.parent_id = page.parent_id
  if (page.sort_order !== undefined) payload.sort_order = page.sort_order
  if (page.title !== undefined) payload.title = page.title
  if (page.slug !== undefined) payload.slug = page.slug
  const { data, error } = await client.from('pages').update(payload).eq('id', page.id).select(pageSelect).single()
  if (error) throw error
  return parsePage(data as unknown as Record<string, Json>)
}

export async function deletePage(pageId: string) {
  const client = ensureClient()
  const { error } = await client.from('pages').delete().eq('id', pageId)
  if (error) throw error
}

export async function uploadImage(file: File, userId: string, subjectId: string, pageId: string) {
  const client = ensureClient()
  const safeName = file.name.replace(/\s+/g, '-')
  const storagePath = `${userId}/${subjectId}/${pageId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from(storageBucket).upload(storagePath, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  const { error: attachmentError } = await client.from('attachments').insert({
    page_id: pageId,
    subject_id: subjectId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
  })
  if (attachmentError) throw attachmentError

  const { data: signed, error: signedError } = await client.storage.from(storageBucket).createSignedUrl(storagePath, 3600)
  if (signedError) throw signedError

  return {
    signedUrl: signed.signedUrl,
    storagePath,
  }
}

export async function createSignedAssetUrl(storagePath: string) {
  const client = ensureClient()
  const { data, error } = await client.storage.from(storageBucket).createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}
