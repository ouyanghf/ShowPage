export interface ParsedModule {
  id: string
  title: string
  selector: string
  order: number
  visible: boolean
}

export interface ProjectLayout {
  showSidebar: boolean
  sidebarWidth: number
  theme: 'light' | 'dark'
}

export interface ProjectData {
  id: string
  title: string
  modules: ParsedModule[]
  layout: ProjectLayout
  htmlUrl: string
  originalUrl: string
  viewUrl: string
}

export interface ProjectSummary {
  id: string
  folderId: string | null
  title: string
  createdAt: string
  updatedAt: string
  sortOrder: number
  moduleCount: number
  visibleModuleCount: number
  editUrl: string
  viewUrl: string
  originalUrl: string
}

export interface UploadResponse {
  projectId: string
  title: string
  modules: ParsedModule[]
  editUrl: string
  viewUrl: string
  originalUrl: string
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}
