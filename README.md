# Annotations

App de anotações para estudo de engenharia com `Vite + React + TypeScript`, `Supabase Auth`, editor em blocos com markdown e fórmulas LaTeX, organização por disciplinas e deploy na `Vercel`.

## Stack

- Vite + React 19 + TypeScript
- React Router
- Supabase Auth, Database e Storage
- Markdown + GFM + KaTeX para renderização ao vivo
- PWA manual com `manifest.webmanifest` e `service worker`

## Variáveis de ambiente

Crie um `.env.local` a partir de `.env.example`:

```bash
VITE_APP_NAME=Annotations
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_STORAGE_BUCKET=study-assets
SUPABASE_SEED_EMAIL=admin@example.com
SUPABASE_SEED_PASSWORD=YOUR_ADMIN_PASSWORD
SUPABASE_SERVICE_ROLE_KEY=
```

Cadastre essas mesmas variáveis na Vercel.

## Rodando localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Em `Authentication > Providers`, mantenha apenas `Email`.
3. Em `Authentication > URL Configuration`, adicione `http://localhost:5173` e seu domínio da Vercel.
4. Execute o SQL de supabase/schema.sql.
5. Em `Authentication > Users`, crie manualmente o usuário admin.
6. Marque esse usuário como admin em `public.profiles`.

Se preferir bootstrap manual do perfil admin:

```sql
insert into public.profiles (id, email, is_admin)
values ('USER_UUID', 'admin@example.com', true)
on conflict (id) do update set email = excluded.email, is_admin = true;
```

## Modelo de dados

- `profiles`: vínculo com `auth.users`, email e flag admin
- `subjects`: disciplinas
- `subject_settings`: horário, sala, professor, links, provas e datas
- `pages`: páginas e subpáginas com conteúdo em `jsonb`
- `attachments`: metadados dos uploads no Storage

O campo `pages.content` persiste o editor em um formato JSON estável e versionável.

## Editor

- Editor por blocos com texto, heading, listas, checklist, tabela, equação, quote, código, links e imagens
- Markdown com preview formatado no próprio fluxo de edição
- Fórmulas renderizadas com KaTeX
- Upload de imagens para `Supabase Storage` com bucket privado

## Atalhos

- `Ctrl/Cmd + K`: abrir paleta de comandos
- `Ctrl/Cmd + N`: criar página
- `Ctrl/Cmd + .`: próxima disciplina
- `Ctrl/Cmd + ,`: disciplina anterior
- `Ctrl/Cmd + Enter`: novo bloco abaixo do atual

## Deploy na Vercel

1. Suba o projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Faça o deploy com o preset padrão de Vite.
5. Confirme que o domínio foi incluído no Supabase Auth.

O arquivo vercel.json mantém o fallback SPA para rotas profundas.

## Seed local

Para popular o banco com disciplinas e páginas iniciais:

```bash
npm run seed
```

O script usa `SUPABASE_SERVICE_ROLE_KEY` se estiver definido. Sem service role, ele autentica com `SUPABASE_SEED_EMAIL` e `SUPABASE_SEED_PASSWORD`, e o usuário já precisa existir em `profiles` com `is_admin = true`.
