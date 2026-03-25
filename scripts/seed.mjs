import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const seedEmail = process.env.SUPABASE_SEED_EMAIL
const seedPassword = process.env.SUPABASE_SEED_PASSWORD

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios para o seed.')
}

const seedData = [
  {
    subject: {
      name: 'Calculo III',
      slug: 'calculo-iii',
      color: '#ff7a18',
      icon: 'Sigma',
      semester: '2026.1',
    },
    settings: {
      schedule: 'Seg e Qua, 19:00 - 20:40',
      room: 'Bloco A - Sala 204',
      professor: 'Prof. Ana Paula',
      notes: 'Foco em series, integrais multiplas e coordenadas polares.',
      exam_summary: 'P1: series e sequencias. P2: integrais duplas e triplas. Trabalho: aplicacoes em engenharia.',
      resource_links: [
        { id: crypto.randomUUID(), label: 'Livro Stewart', url: 'https://example.com/stewart' },
        { id: crypto.randomUUID(), label: 'Lista 01', url: 'https://example.com/lista-calculo-1' },
      ],
      important_dates: [
        { id: crypto.randomUUID(), label: 'P1', date: '2026-04-15' },
        { id: crypto.randomUUID(), label: 'Entrega trabalho', date: '2026-05-05' },
      ],
    },
    pages: [
      {
        title: 'Series e sequencias',
        slug: 'series-e-sequencias',
        parent_slug: null,
        sort_order: 0,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Testes de convergencia' },
          { id: crypto.randomUUID(), type: 'paragraph', content: 'Use comparacao, razao e raiz para classificar series.' },
          { id: crypto.randomUUID(), type: 'equation', content: '\\sum_{n=1}^{\\infty} \\frac{1}{n^p}' },
        ],
      },
      {
        title: 'Integrais duplas',
        slug: 'integrais-duplas',
        parent_slug: null,
        sort_order: 1,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Integral dupla' },
          { id: crypto.randomUUID(), type: 'paragraph', content: 'Separar regiao e ordem de integracao antes de integrar.' },
          { id: crypto.randomUUID(), type: 'equation', content: '\\iint_D f(x,y)\\,dA' },
        ],
      },
    ],
  },
  {
    subject: {
      name: 'Fisica II',
      slug: 'fisica-ii',
      color: '#3772ff',
      icon: 'Atom',
      semester: '2026.1',
    },
    settings: {
      schedule: 'Ter e Qui, 20:50 - 22:30',
      room: 'Laboratorio 03',
      professor: 'Prof. Marcelo Rocha',
      notes: 'Revisar eletrostatica, campo eletrico e potencial.',
      exam_summary: 'Provas com bastante interpretacao grafica e exercicios de campo eletrico.',
      resource_links: [
        { id: crypto.randomUUID(), label: 'Halliday', url: 'https://example.com/halliday' },
        { id: crypto.randomUUID(), label: 'Simulador', url: 'https://example.com/simulador-fisica' },
      ],
      important_dates: [
        { id: crypto.randomUUID(), label: 'Experimento 1', date: '2026-04-10' },
        { id: crypto.randomUUID(), label: 'P2', date: '2026-05-20' },
      ],
    },
    pages: [
      {
        title: 'Campo eletrico',
        slug: 'campo-eletrico',
        parent_slug: null,
        sort_order: 0,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Campo eletrico' },
          { id: crypto.randomUUID(), type: 'equation', content: '\\vec{E}=\\frac{1}{4\\pi\\varepsilon_0}\\frac{q}{r^2}\\hat{r}' },
          { id: crypto.randomUUID(), type: 'bullet-list', content: '- Direcao radial\n- Depende do sinal da carga\n- Superposicao vale' },
        ],
      },
      {
        title: 'Capacitancia',
        slug: 'capacitancia',
        parent_slug: null,
        sort_order: 1,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Capacitancia' },
          { id: crypto.randomUUID(), type: 'equation', content: 'C=\\frac{Q}{\\Delta V}' },
          { id: crypto.randomUUID(), type: 'table', content: '| Sistema | Capacitancia |\n| --- | --- |\n| Placas paralelas | $\\varepsilon A/d$ |' },
        ],
      },
    ],
  },
  {
    subject: {
      name: 'Resistencia dos Materiais',
      slug: 'resistencia-dos-materiais',
      color: '#22b573',
      icon: 'Ruler',
      semester: '2026.1',
    },
    settings: {
      schedule: 'Sab, 08:00 - 11:40',
      room: 'Bloco C - Sala 102',
      professor: 'Prof. Ricardo Leal',
      notes: 'Priorizar diagramas de esforco cortante e momento fletor.',
      exam_summary: 'P1: tensao e deformacao. P2: torsao e flexao.',
      resource_links: [
        { id: crypto.randomUUID(), label: 'Beer & Johnston', url: 'https://example.com/beer-johnston' },
      ],
      important_dates: [
        { id: crypto.randomUUID(), label: 'Lista 2', date: '2026-04-18' },
        { id: crypto.randomUUID(), label: 'P1', date: '2026-04-25' },
      ],
    },
    pages: [
      {
        title: 'Tensao normal',
        slug: 'tensao-normal',
        parent_slug: null,
        sort_order: 0,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Tensao normal' },
          { id: crypto.randomUUID(), type: 'equation', content: '\\sigma = \\frac{F}{A}' },
          { id: crypto.randomUUID(), type: 'paragraph', content: 'Unidade padrao em Pa ou MPa.' },
        ],
      },
      {
        title: 'Flexao',
        slug: 'flexao',
        parent_slug: null,
        sort_order: 1,
        content: [
          { id: crypto.randomUUID(), type: 'heading', content: '# Flexao simples' },
          { id: crypto.randomUUID(), type: 'equation', content: '\\sigma = \\frac{My}{I}' },
          { id: crypto.randomUUID(), type: 'checklist', content: 'Montar diagrama de momento antes do calculo', checked: false },
        ],
      },
    ],
  },
]

function createAnonClient() {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function createServiceClient() {
  if (!serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function resolveUserContext() {
  const serviceClient = createServiceClient()

  if (serviceClient && seedEmail) {
    const { data: profile, error } = await serviceClient
      .from('profiles')
      .select('id,email,is_admin')
      .eq('email', seedEmail.toLowerCase())
      .maybeSingle()

    if (error) throw error
    if (!profile) throw new Error('Perfil admin nao encontrado para o email informado.')
    if (!profile.is_admin) throw new Error('O perfil encontrado nao esta marcado como admin.')

    return { client: serviceClient, userId: profile.id }
  }

  if (!seedEmail || !seedPassword) {
    throw new Error('Defina SUPABASE_SEED_EMAIL e SUPABASE_SEED_PASSWORD, ou use SUPABASE_SERVICE_ROLE_KEY.')
  }

  const client = createAnonClient()
  const { data: authData, error: signInError } = await client.auth.signInWithPassword({
    email: seedEmail,
    password: seedPassword,
  })

  if (signInError) throw signInError
  if (!authData.user) throw new Error('Nao foi possivel autenticar o usuario do seed.')

  const { data: profile, error: profileError } = await client.from('profiles').select('id,is_admin').eq('id', authData.user.id).maybeSingle()
  if (profileError) throw profileError
  if (!profile?.is_admin) throw new Error('O usuario do seed nao esta marcado como admin em public.profiles.')

  return { client, userId: authData.user.id }
}

async function upsertSubject(client, userId, subjectData) {
  const { data: existing, error: existingError } = await client
    .from('subjects')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', subjectData.slug)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await client
      .from('subjects')
      .update(subjectData)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }

  const { data, error } = await client
    .from('subjects')
    .insert({ ...subjectData, user_id: userId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function upsertSettings(client, subjectId, settings) {
  const { error } = await client.from('subject_settings').upsert({ subject_id: subjectId, ...settings }, { onConflict: 'subject_id' })
  if (error) throw error
}

async function upsertPages(client, subjectId, pages) {
  const slugToId = new Map()

  const { data: existingPages, error: pagesError } = await client.from('pages').select('id,slug').eq('subject_id', subjectId)
  if (pagesError) throw pagesError
  for (const page of existingPages ?? []) slugToId.set(page.slug, page.id)

  for (const page of pages) {
    const payload = {
      subject_id: subjectId,
      parent_id: page.parent_slug ? slugToId.get(page.parent_slug) ?? null : null,
      title: page.title,
      slug: page.slug,
      sort_order: page.sort_order,
      content: page.content,
    }

    if (slugToId.has(page.slug)) {
      const { error } = await client.from('pages').update(payload).eq('id', slugToId.get(page.slug))
      if (error) throw error
      continue
    }

    const { data, error } = await client.from('pages').insert(payload).select('id,slug').single()
    if (error) throw error
    slugToId.set(data.slug, data.id)
  }
}

async function main() {
  const { client, userId } = await resolveUserContext()

  for (const entry of seedData) {
    const subjectId = await upsertSubject(client, userId, entry.subject)
    await upsertSettings(client, subjectId, entry.settings)
    await upsertPages(client, subjectId, entry.pages)
    console.log(`Seeded: ${entry.subject.name}`)
  }

  console.log('Seed finalizado com sucesso.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
