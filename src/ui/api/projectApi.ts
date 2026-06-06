import type {
  ProjectData,
  UploadResponse,
  ParsedModule,
  ProjectLayout,
  ProjectSummary,
  Folder,
} from '../types/project'

async function parseJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.ok) return res.json()

  let message = fallbackMessage
  try {
    const body = await res.json()
    if (typeof body.error === 'string') message = body.error
  } catch {
    // Keep the fallback message for non-JSON errors.
  }
  throw new Error(message)
}

// --- Projects ---

export async function uploadHtml(file: File, folderId?: string | null): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId) formData.append('folderId', folderId)
  const res = await fetch('/api/projects/upload', { method: 'POST', body: formData })
  return parseJsonResponse<UploadResponse>(res, '上传失败')
}

export async function listProjects(folderId?: string | null): Promise<ProjectSummary[]> {
  const params = folderId !== undefined ? `?folderId=${folderId ?? ''}` : ''
  const res = await fetch(`/api/projects${params}`)
  const data = await parseJsonResponse<{ projects: ProjectSummary[] }>(res, '项目列表加载失败')
  return data.projects
}

export async function getProject(projectId: string): Promise<ProjectData> {
  const res = await fetch(`/api/projects/${projectId}`)
  return parseJsonResponse<ProjectData>(res, '项目不存在')
}

export async function updateProject(
  projectId: string,
  data: { title?: string; modules?: ParsedModule[]; layout?: Partial<ProjectLayout>; folderId?: string | null }
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  await parseJsonResponse<{ success: boolean }>(res, '保存失败')
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
  await parseJsonResponse<{ success: boolean }>(res, '删除失败')
}

export async function deleteProjects(projectIds: string[]): Promise<void> {
  const res = await fetch('/api/projects/batch-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  })
  await parseJsonResponse<{ success: boolean; deleted: number }>(res, '批量删除失败')
}

export async function reorderProjects(projectIds: string[]): Promise<void> {
  const res = await fetch('/api/projects/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  })
  await parseJsonResponse<{ success: boolean }>(res, '排序保存失败')
}

// --- Folders ---

export async function listFolders(): Promise<Folder[]> {
  const res = await fetch('/api/folders')
  const data = await parseJsonResponse<{ folders: Folder[] }>(res, '文件夹加载失败')
  return data.folders
}

export async function createFolder(name: string, parentId?: string | null): Promise<Folder> {
  const res = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId: parentId ?? null }),
  })
  return parseJsonResponse<Folder>(res, '创建文件夹失败')
}

export async function updateFolder(folderId: string, data: { name?: string; parentId?: string | null }): Promise<void> {
  const res = await fetch(`/api/folders/${folderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  await parseJsonResponse<{ success: boolean }>(res, '更新文件夹失败')
}

export async function deleteFolder(folderId: string): Promise<void> {
  const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
  await parseJsonResponse<{ success: boolean }>(res, '删除文件夹失败')
}
