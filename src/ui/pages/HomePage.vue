<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UploadDropzone from '../components/UploadDropzone.vue'
import {
  createFolder,
  deleteFolder,
  deleteProject,
  deleteProjects as deleteProjectsApi,
  listFolders,
  listProjects,
  reorderProjects,
  updateFolder,
  updateProject,
} from '../api/projectApi'
import type { Folder, ProjectSummary } from '../types/project'

type FolderFilter = 'all' | 'root' | string

const SELECTED_FOLDER_KEY = 'showpage:selected-folder'

const allProjects = ref<ProjectSummary[]>([])
const folders = ref<Folder[]>([])
const loading = ref(true)
const error = ref('')
const deletingId = ref('')
const movingId = ref('')
const renamingId = ref('')
const renameValue = ref('')
const savingRenameId = ref('')
const selectedProjectIds = ref<Set<string>>(new Set())
const batchDeleting = ref(false)
const sortingId = ref('')

const selectedFolderId = ref<FolderFilter>('all')
const uploadTargetId = ref<string>('root')
const newFolderName = ref('')
const creatingFolder = ref(false)
const renamingFolderId = ref('')
const renameFolderValue = ref('')

const rootFolders = computed(() => folders.value.filter(folder => folder.parentId === null))
const rootProjects = computed(() => allProjects.value.filter(project => project.folderId === null))
const folderOptions = computed(() => rootFolders.value)

const selectedFolder = computed(() =>
  folders.value.find(folder => folder.id === selectedFolderId.value) ?? null
)

const selectedFolderName = computed(() => {
  if (selectedFolderId.value === 'all') return '全部项目'
  if (selectedFolderId.value === 'root') return '未分组'
  return selectedFolder.value?.name ?? '分组'
})

const selectedProjects = computed(() => {
  if (selectedFolderId.value === 'all') return allProjects.value
  if (selectedFolderId.value === 'root') return rootProjects.value
  return allProjects.value.filter(project => project.folderId === selectedFolderId.value)
})
const selectedProjectCount = computed(() =>
  selectedProjects.value.filter(project => selectedProjectIds.value.has(project.id)).length
)
const allVisibleSelected = computed(() =>
  selectedProjects.value.length > 0 && selectedProjectCount.value === selectedProjects.value.length
)

const uploadFolderId = computed(() => (uploadTargetId.value === 'root' ? null : uploadTargetId.value))
const projectCount = computed(() => allProjects.value.length)
const folderCount = computed(() => folders.value.length)
const totalModuleCount = computed(() =>
  allProjects.value.reduce((total, project) => total + project.moduleCount, 0)
)

onMounted(async () => {
  const savedFolderId = window.localStorage.getItem(SELECTED_FOLDER_KEY)
  if (savedFolderId) {
    selectedFolderId.value = savedFolderId
    uploadTargetId.value = savedFolderId === 'all' ? 'root' : savedFolderId
  }
  await loadAll()
})

watch(selectedFolderId, folderId => {
  window.localStorage.setItem(SELECTED_FOLDER_KEY, folderId)
  if (folderId !== 'all') uploadTargetId.value = folderId
  selectedProjectIds.value = new Set()
})

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [nextFolders, nextProjects] = await Promise.all([listFolders(), listProjects()])
    folders.value = nextFolders
    allProjects.value = nextProjects
    if (!isExistingFilter(selectedFolderId.value)) {
      selectedFolderId.value = 'all'
      uploadTargetId.value = 'root'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function isExistingFilter(folderId: FolderFilter) {
  return folderId === 'all' || folderId === 'root' || folders.value.some(folder => folder.id === folderId)
}

function folderProjects(folderId: string) {
  return allProjects.value.filter(project => project.folderId === folderId)
}

function selectFolder(folderId: FolderFilter) {
  selectedFolderId.value = folderId
}

function getOriginalUrl(project: ProjectSummary) {
  return project.originalUrl || `/static/projects/${project.id}/original.html`
}

function isProjectSelected(projectId: string) {
  return selectedProjectIds.value.has(projectId)
}

function toggleProjectSelection(projectId: string) {
  const next = new Set(selectedProjectIds.value)
  if (next.has(projectId)) {
    next.delete(projectId)
  } else {
    next.add(projectId)
  }
  selectedProjectIds.value = next
}

function toggleAllVisibleProjects() {
  if (allVisibleSelected.value) {
    selectedProjectIds.value = new Set()
    return
  }
  selectedProjectIds.value = new Set(selectedProjects.value.map(project => project.id))
}

async function onCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  creatingFolder.value = true
  error.value = ''
  try {
    const folder = await createFolder(name, null)
    folders.value = [...folders.value, folder]
    newFolderName.value = ''
    selectFolder(folder.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建分组失败'
  } finally {
    creatingFolder.value = false
  }
}

function startRenameFolder(folder: Folder) {
  renamingFolderId.value = folder.id
  renameFolderValue.value = folder.name
}

function cancelRenameFolder() {
  renamingFolderId.value = ''
  renameFolderValue.value = ''
}

async function finishRenameFolder(folder: Folder) {
  const name = renameFolderValue.value.trim()
  if (!name || name === folder.name) {
    cancelRenameFolder()
    return
  }
  error.value = ''
  try {
    await updateFolder(folder.id, { name })
    folders.value = folders.value.map(item => (item.id === folder.id ? { ...item, name } : item))
    cancelRenameFolder()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重命名分组失败'
  }
}

async function onDeleteFolder(folder: Folder) {
  const count = folderProjects(folder.id).length
  const confirmed = window.confirm(
    `确定删除分组「${folder.name}」吗？${count > 0 ? `其中 ${count} 个项目会移到未分组。` : ''}`
  )
  if (!confirmed) return
  error.value = ''
  try {
    await deleteFolder(folder.id)
    folders.value = folders.value.filter(item => item.id !== folder.id)
    allProjects.value = allProjects.value.map(project =>
      project.folderId === folder.id ? { ...project, folderId: null } : project
    )
    if (selectedFolderId.value === folder.id) selectFolder('root')
    if (uploadTargetId.value === folder.id) uploadTargetId.value = 'root'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除分组失败'
  }
}

async function moveProjectToFolder(project: ProjectSummary, folderId: string | null) {
  if (project.folderId === folderId) return
  movingId.value = project.id
  error.value = ''
  try {
    await updateProject(project.id, { folderId })
    allProjects.value = allProjects.value.map(item =>
      item.id === project.id
        ? { ...item, folderId, updatedAt: new Date().toISOString() }
        : item
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : '移动项目失败'
  } finally {
    movingId.value = ''
  }
}

async function onDeleteProject(project: ProjectSummary) {
  const confirmed = window.confirm(`确定删除「${project.title}」吗？`)
  if (!confirmed) return
  deletingId.value = project.id
  error.value = ''
  try {
    await deleteProject(project.id)
    allProjects.value = allProjects.value.filter(item => item.id !== project.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    deletingId.value = ''
  }
}

async function onBatchDeleteProjects() {
  const ids = selectedProjects.value
    .filter(project => selectedProjectIds.value.has(project.id))
    .map(project => project.id)
  if (ids.length === 0) return
  const confirmed = window.confirm(`确定删除选中的 ${ids.length} 个项目吗？`)
  if (!confirmed) return

  batchDeleting.value = true
  error.value = ''
  try {
    await deleteProjectsApi(ids)
    allProjects.value = allProjects.value.filter(project => !ids.includes(project.id))
    selectedProjectIds.value = new Set()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '批量删除失败'
  } finally {
    batchDeleting.value = false
  }
}

async function moveProjectOrder(project: ProjectSummary, direction: -1 | 1) {
  const current = [...selectedProjects.value]
  const index = current.findIndex(item => item.id === project.id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return

  const next = [...current]
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  sortingId.value = project.id
  error.value = ''
  try {
    await reorderProjects(next.map(item => item.id))
    const nextOrder = new Map(next.map((item, itemIndex) => [item.id, itemIndex]))
    const currentIds = new Set(next.map(item => item.id))
    allProjects.value = [...allProjects.value].sort((a, b) => {
      const aInCurrent = currentIds.has(a.id)
      const bInCurrent = currentIds.has(b.id)
      if (aInCurrent && bInCurrent) return (nextOrder.get(a.id) ?? 0) - (nextOrder.get(b.id) ?? 0)
      if (aInCurrent || bInCurrent) {
        return allProjects.value.findIndex(item => item.id === a.id) - allProjects.value.findIndex(item => item.id === b.id)
      }
      return allProjects.value.findIndex(item => item.id === a.id) - allProjects.value.findIndex(item => item.id === b.id)
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '排序保存失败'
  } finally {
    sortingId.value = ''
  }
}

function projectIndex(project: ProjectSummary) {
  return selectedProjects.value.findIndex(item => item.id === project.id)
}

function startRename(project: ProjectSummary) {
  renamingId.value = project.id
  renameValue.value = project.title
}

function cancelRename() {
  renamingId.value = ''
  renameValue.value = ''
}

async function finishRename(project: ProjectSummary) {
  const nextTitle = renameValue.value.trim()
  if (!nextTitle || nextTitle === project.title) {
    cancelRename()
    return
  }
  savingRenameId.value = project.id
  error.value = ''
  try {
    await updateProject(project.id, { title: nextTitle })
    allProjects.value = allProjects.value.map(item =>
      item.id === project.id
        ? { ...item, title: nextTitle, updatedAt: new Date().toISOString() }
        : item
    )
    cancelRename()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重命名失败'
  } finally {
    savingRenameId.value = ''
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <div class="home">
    <div class="manager-shell">
      <aside class="manager-sidebar" aria-label="项目分组">
        <div class="sidebar-header">
          <div>
            <p class="home-kicker">ShowPage</p>
            <h1 class="home-title">项目分组</h1>
          </div>
          <button class="text-btn" @click="loadAll">刷新</button>
        </div>

        <div class="file-summary">
          <div>
            <strong>{{ projectCount }}</strong>
            <span>项目</span>
          </div>
          <div>
            <strong>{{ folderCount }}</strong>
            <span>分组</span>
          </div>
          <div>
            <strong>{{ totalModuleCount }}</strong>
            <span>模块</span>
          </div>
        </div>

        <div class="new-folder-bar">
          <input
            v-model="newFolderName"
            class="new-folder-input"
            placeholder="新建分组"
            :disabled="creatingFolder"
            @keydown.enter="onCreateFolder"
          />
          <button
            class="text-btn"
            :disabled="creatingFolder || !newFolderName.trim()"
            @click="onCreateFolder"
          >
            {{ creatingFolder ? '创建中' : '创建' }}
          </button>
        </div>

        <div v-if="loading" class="state-box">正在加载...</div>
        <div v-else-if="error" class="state-box error">
          {{ error }}
          <button class="text-btn" @click="loadAll">重试</button>
        </div>
        <nav v-else class="folder-nav" aria-label="分组列表">
          <button
            class="folder-row"
            :class="{ active: selectedFolderId === 'all' }"
            @click="selectFolder('all')"
          >
            <span class="folder-main">
              <span class="folder-glyph all" aria-hidden="true"></span>
              <span>全部项目</span>
            </span>
            <strong>{{ allProjects.length }}</strong>
          </button>

          <button
            class="folder-row"
            :class="{ active: selectedFolderId === 'root' }"
            @click="selectFolder('root')"
          >
            <span class="folder-main">
              <span class="folder-glyph root" aria-hidden="true"></span>
              <span>未分组</span>
            </span>
            <strong>{{ rootProjects.length }}</strong>
          </button>

          <div class="folder-divider">我的分组</div>

          <div v-if="rootFolders.length === 0" class="tree-empty">暂无分组</div>
          <div
            v-for="folder in rootFolders"
            :key="folder.id"
            class="folder-row-wrap"
            :class="{ active: selectedFolderId === folder.id }"
          >
            <button class="folder-row folder-row-button" @click="selectFolder(folder.id)">
              <span class="folder-main">
                <span class="folder-glyph folder" aria-hidden="true"></span>
                <input
                  v-if="renamingFolderId === folder.id"
                  v-model="renameFolderValue"
                  class="rename-input"
                  @keydown.enter="finishRenameFolder(folder)"
                  @keydown.esc="cancelRenameFolder"
                  @blur="finishRenameFolder(folder)"
                  @click.stop
                  autofocus
                />
                <span v-else class="folder-name">{{ folder.name }}</span>
              </span>
              <strong>{{ folderProjects(folder.id).length }}</strong>
            </button>
            <div class="folder-actions">
              <button class="icon-btn-sm" title="重命名" @click.stop="startRenameFolder(folder)">重命名</button>
              <button class="icon-btn-sm danger" title="删除" @click.stop="onDeleteFolder(folder)">移除</button>
            </div>
          </div>
        </nav>
      </aside>

      <main class="project-workspace" aria-label="项目管理">
        <header class="workspace-header">
          <div>
            <h2>{{ selectedFolderName }}</h2>
            <p>{{ selectedProjects.length }} 个项目</p>
          </div>
          <label class="upload-target">
            <span>上传到</span>
            <select v-model="uploadTargetId">
              <option value="root">未分组</option>
              <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
                {{ folder.name }}
              </option>
            </select>
          </label>
        </header>

        <section class="upload-panel">
          <UploadDropzone :folder-id="uploadFolderId" @uploaded="loadAll" />
        </section>

        <section class="project-list-panel">
          <div class="list-header">
            <div class="list-title">
              <label class="select-all">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  :disabled="selectedProjects.length === 0"
                  @change="toggleAllVisibleProjects"
                />
                <strong>项目列表</strong>
              </label>
              <span>{{ selectedProjects.length }} 项</span>
            </div>
            <button
              class="batch-delete-btn"
              :disabled="selectedProjectCount === 0 || batchDeleting"
              @click="onBatchDeleteProjects"
            >
              {{ batchDeleting ? '删除中' : `批量删除${selectedProjectCount ? `（${selectedProjectCount}）` : ''}` }}
            </button>
          </div>

          <article
            v-for="project in selectedProjects"
            :key="project.id"
            class="file-row"
          >
            <div class="file-main">
              <input
                class="row-checkbox"
                type="checkbox"
                :checked="isProjectSelected(project.id)"
                @change="toggleProjectSelection(project.id)"
              />
              <span class="file-mark" aria-hidden="true">H</span>
              <span class="file-text">
                <input
                  v-if="renamingId === project.id"
                  v-model="renameValue"
                  class="rename-input"
                  :disabled="savingRenameId === project.id"
                  @keydown.enter="finishRename(project)"
                  @keydown.esc="cancelRename"
                  @blur="finishRename(project)"
                  @click.stop
                  autofocus
                />
                <router-link
                  v-else
                  class="file-title-link"
                  :to="project.editUrl"
                  @dblclick.prevent="startRename(project)"
                >
                  {{ project.title }}
                </router-link>
                <p>
                  <span>{{ project.visibleModuleCount }}/{{ project.moduleCount }} 模块</span>
                  <span>{{ formatDate(project.updatedAt) }}</span>
                  <span>
                    分组：{{
                      project.folderId
                        ? folders.find(folder => folder.id === project.folderId)?.name ?? '分组'
                        : '未分组'
                    }}
                  </span>
                </p>
              </span>
            </div>
            <div class="file-actions">
              <button
                class="icon-btn order-btn"
                title="上移"
                :disabled="projectIndex(project) === 0 || sortingId === project.id"
                @click="moveProjectOrder(project, -1)"
              >
                上移
              </button>
              <button
                class="icon-btn order-btn"
                title="下移"
                :disabled="projectIndex(project) === selectedProjects.length - 1 || sortingId === project.id"
                @click="moveProjectOrder(project, 1)"
              >
                下移
              </button>
              <select
                class="move-select"
                title="移动到"
                :value="project.folderId ?? 'root'"
                :disabled="movingId === project.id"
                @change="(e: Event) => {
                  const target = e.target as HTMLSelectElement
                  moveProjectToFolder(project, target.value === 'root' ? null : target.value)
                }"
              >
                <option value="root">未分组</option>
                <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
                  {{ folder.name }}
                </option>
              </select>
              <button class="icon-btn" :disabled="savingRenameId === project.id" @click="startRename(project)">重命名</button>
              <router-link class="icon-btn" :to="project.editUrl">编辑</router-link>
              <a
                class="icon-btn"
                :href="getOriginalUrl(project)"
                :download="`${project.id}-original.html`"
              >
                原始
              </a>
              <router-link class="icon-btn primary" :to="project.viewUrl">演示</router-link>
              <button class="icon-btn danger" :disabled="deletingId === project.id" @click="onDeleteProject(project)">
                {{ deletingId === project.id ? '...' : '删除' }}
              </button>
            </div>
          </article>

          <div v-if="selectedProjects.length === 0" class="state-box">
            当前分组暂无项目。可以先选择上传目标，再拖入 HTML 文件。
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding: 20px;
  background:
    linear-gradient(180deg, #f8fafc 0%, #f3f4f6 48%, #eef2f7 100%);
}

.manager-shell {
  width: 100%;
  max-width: 1420px;
  min-height: calc(100vh - 40px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 336px minmax(0, 1fr);
  gap: 16px;
}

.home-kicker {
  color: #2563eb;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}

.home-title {
  color: #111827;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 760;
}

.manager-sidebar,
.project-workspace {
  min-width: 0;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
}

.manager-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header,
.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #e8edf4;
}

.sidebar-header {
  background: #ffffff;
}

.workspace-header {
  align-items: center;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.workspace-header h2 {
  color: #111827;
  font-size: 26px;
  line-height: 1.2;
  margin-bottom: 3px;
  font-weight: 760;
}

.workspace-header p {
  color: #64748b;
  font-size: 13px;
}

.text-btn {
  min-height: 30px;
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  font-weight: 680;
  cursor: pointer;
}

.text-btn:hover:not(:disabled) {
  color: #1d4ed8;
}

.text-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.file-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid #e8edf4;
  background: #fbfcfe;
}

.file-summary div {
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid #e5eaf2;
  border-radius: 7px;
  background: #ffffff;
}

.file-summary strong {
  display: block;
  color: #111827;
  font-size: 19px;
  line-height: 1.1;
  font-weight: 760;
}

.file-summary span {
  color: #64748b;
  font-size: 12px;
}

.new-folder-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e8edf4;
  background: #ffffff;
}

.new-folder-input,
.rename-input,
.upload-target select,
.move-select {
  border: 1px solid #d9e1ec;
  border-radius: 6px;
  background: #ffffff;
  color: #111827;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.new-folder-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  font-size: 13px;
}

.new-folder-input::placeholder {
  color: #94a3b8;
}

.new-folder-input:focus,
.rename-input:focus,
.upload-target select:focus,
.move-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.folder-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f8fafc;
}

.folder-row,
.folder-row-wrap {
  width: 100%;
  min-height: 42px;
  border-radius: 7px;
}

.folder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid transparent;
  color: #1f2937;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 680;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.folder-row:hover,
.folder-row-wrap:hover {
  background: #ffffff;
}

.folder-row.active,
.folder-row-wrap.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.folder-row-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid transparent;
}

.folder-row-wrap .folder-row {
  min-width: 0;
  border: none;
  background: transparent;
}

.folder-main {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.folder-glyph {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eef2f7;
  flex-shrink: 0;
}

.folder-glyph::before,
.folder-glyph::after {
  content: '';
  position: absolute;
  background: #64748b;
}

.folder-glyph.all::before {
  width: 10px;
  height: 10px;
  border: 2px solid #64748b;
  border-radius: 3px;
  background: transparent;
}

.folder-glyph.all::after {
  width: 12px;
  height: 2px;
  border-radius: 999px;
  transform: rotate(45deg);
}

.folder-glyph.root::before {
  width: 11px;
  height: 2px;
  border-radius: 999px;
}

.folder-glyph.folder::before {
  left: 5px;
  top: 7px;
  width: 12px;
  height: 9px;
  border: 2px solid #64748b;
  border-radius: 2px;
  background: transparent;
}

.folder-glyph.folder::after {
  left: 7px;
  top: 5px;
  width: 6px;
  height: 2px;
  border-radius: 2px 2px 0 0;
}

.folder-row.active .folder-glyph,
.folder-row-wrap.active .folder-glyph {
  background: #dbeafe;
}

.folder-row.active .folder-glyph::before,
.folder-row.active .folder-glyph::after,
.folder-row-wrap.active .folder-glyph::before,
.folder-row-wrap.active .folder-glyph::after {
  border-color: #2563eb;
  background-color: #2563eb;
}

.folder-row.active .folder-glyph.all::before,
.folder-row-wrap.active .folder-glyph.all::before,
.folder-row.active .folder-glyph.folder::before,
.folder-row-wrap.active .folder-glyph.folder::before {
  background: transparent;
}

.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-row strong {
  min-width: 24px;
  color: #64748b;
  font-size: 12px;
  font-weight: 760;
  text-align: right;
}

.folder-row.active strong,
.folder-row-wrap.active strong {
  color: #2563eb;
}

.folder-divider {
  padding: 16px 10px 7px;
  color: #64748b;
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.04em;
}

.folder-actions {
  display: flex;
  gap: 4px;
  padding-right: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.folder-row-wrap:hover .folder-actions,
.folder-row-wrap.active .folder-actions {
  opacity: 1;
}

.icon-btn-sm,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: 1px solid #d9e1ec;
  color: #334155;
  text-decoration: none;
  font-weight: 680;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.icon-btn-sm:hover,
.icon-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.icon-btn-sm {
  height: 26px;
  padding: 0 7px;
  color: #64748b;
  font-size: 11px;
}

.icon-btn-sm.danger,
.icon-btn.danger {
  color: #dc2626;
}

.icon-btn-sm.danger:hover,
.icon-btn.danger:hover:not(:disabled) {
  border-color: #fecaca;
  background: #fef2f2;
}

.project-workspace {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.upload-target {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.upload-target select {
  height: 36px;
  min-width: 168px;
  padding: 0 10px;
  font-size: 13px;
}

.upload-panel {
  padding: 16px 18px;
  border-bottom: 1px solid #e8edf4;
  background: #ffffff;
}

.upload-panel :deep(.dropzone) {
  padding: 32px 28px;
  border-color: #d9e1ec;
  background: #fbfdff;
  box-shadow: none;
}

.upload-panel :deep(.dropzone:hover),
.upload-panel :deep(.dropzone:focus-visible) {
  border-color: #3b82f6;
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.08);
}

.upload-panel :deep(.dropzone-icon) {
  width: 54px;
  height: 54px;
  background: #e0ecff;
  color: #1d4ed8;
  font-size: 14px;
}

.upload-panel :deep(.dropzone-text) {
  font-size: 16px;
  font-weight: 680;
}

.upload-panel :deep(.dropzone-sub) {
  color: #64748b;
  font-size: 13px;
}

.project-list-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #ffffff;
}

.list-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid #e8edf4;
  background: rgba(248, 250, 252, 0.96);
  backdrop-filter: blur(8px);
}

.list-header strong {
  color: #111827;
  font-size: 13px;
  font-weight: 760;
}

.list-header span {
  color: #64748b;
  font-size: 12px;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.select-all input,
.row-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #2563eb;
  flex-shrink: 0;
}

.batch-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid #fecaca;
  border-radius: 5px;
  background: #ffffff;
  color: #dc2626;
  font-size: 12px;
  font-weight: 680;
}

.batch-delete-btn:hover:not(:disabled) {
  background: #fef2f2;
}

.batch-delete-btn:disabled {
  border-color: #e5e7eb;
  color: #94a3b8;
  cursor: not-allowed;
}

.file-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 66px;
  padding: 12px 18px;
  border-bottom: 1px solid #eef2f7;
  transition: background-color 0.15s ease;
}

.file-row:hover {
  background: #f8fafc;
}

.file-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 7px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 780;
  flex-shrink: 0;
}

.file-text {
  min-width: 0;
}

.file-title-link {
  display: block;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.file-title-link:hover {
  color: #2563eb;
}

.rename-input {
  display: block;
  width: 100%;
  height: 30px;
  padding: 0 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
}

.file-text p {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  margin-top: 3px;
}

.file-text p span:not(:last-child)::after {
  content: '·';
  margin-left: 7px;
  color: #cbd5e1;
}

.file-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.move-select {
  height: 30px;
  max-width: 132px;
  padding: 0 7px;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
}

.icon-btn {
  min-width: 38px;
  height: 30px;
  padding: 0 9px;
  font-size: 12px;
}

.order-btn {
  min-width: 34px;
  padding: 0 7px;
  color: #64748b;
}

.icon-btn.primary {
  color: #ffffff;
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.18);
}

.icon-btn.primary:hover {
  border-color: #1d4ed8;
  background: #1d4ed8;
}

.icon-btn:disabled,
.icon-btn-sm:disabled,
.rename-input:disabled,
.move-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.state-box {
  padding: 28px 18px;
  color: #64748b;
  font-size: 14px;
}

.state-box.error {
  color: #dc2626;
}

.tree-empty {
  padding: 14px 10px;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 980px) {
  .home {
    padding: 14px;
  }

  .manager-shell {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .workspace-header,
  .file-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .workspace-header {
    flex-direction: column;
  }

  .file-actions {
    flex-wrap: wrap;
  }

  .upload-target {
    justify-content: space-between;
  }

  .upload-target select {
    flex: 1;
  }
}
</style>
