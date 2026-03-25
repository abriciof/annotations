export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  slug: string
  color: string
  icon: string
  semester: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ResourceLink {
  id: string
  label: string
  url: string
}

export interface ImportantDate {
  id: string
  label: string
  date: string
}

export interface SubjectSettings {
  id: string
  subject_id: string
  schedule: string | null
  room: string | null
  professor: string | null
  notes: string | null
  resource_links: ResourceLink[]
  important_dates: ImportantDate[]
  exam_summary: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  subject_id: string
  parent_id: string | null
  title: string
  slug: string
  sort_order: number
  content: string
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  page_id: string
  subject_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  created_at: string
}
