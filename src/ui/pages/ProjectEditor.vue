<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { ProjectData, ParsedModule } from '../types/project'
import { getProject, updateProject } from '../api/projectApi'
import TopBar from '../components/TopBar.vue'
import ModuleMenu from '../components/ModuleMenu.vue'
import HtmlPreview from '../components/HtmlPreview.vue'

const route = useRoute()
const project = ref<ProjectData | null>(null)
const activeModuleId = ref<string>('')
const previewRef = ref<InstanceType<typeof HtmlPreview> | null>(null)
const loading = ref(true)
const error = ref('')
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let saveStatusTimer: ReturnType<typeof setTimeout> | null = null

const visibleCount = computed(() => project.value?.modules.filter(m => m.visible).length ?? 0)
const moduleCount = computed(() => project.value?.modules.length ?? 0)

onMounted(loadProject)

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (saveStatusTimer) clearTimeout(saveStatusTimer)
})

async function loadProject() {
  const projectId = route.params.projectId as string
  loading.value = true
  error.value = ''
  try {
    project.value = await getProject(projectId)
    if (project.value.modules.length > 0) {
      activeModuleId.value = project.value.modules[0].id
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '项目加载失败'
  } finally {
    loading.value = false
  }
}

function onSelectModule(mod: ParsedModule) {
  activeModuleId.value = mod.id
  previewRef.value?.scrollToModule(mod.selector)
}

function onModulesChange(modules: ParsedModule[]) {
  if (!project.value) return
  project.value = { ...project.value, modules }
  if (!modules.some(m => m.id === activeModuleId.value)) {
    activeModuleId.value = modules[0]?.id ?? ''
  }
  debouncedSave()
}

function onTitleChange(title: string) {
  if (!project.value) return
  project.value = { ...project.value, title }
  debouncedSave()
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveStatus.value = 'saving'
  saveTimer = setTimeout(async () => {
    if (!project.value) return
    try {
      await updateProject(project.value.id, {
        title: project.value.title,
        modules: project.value.modules,
        layout: project.value.layout,
      })
      saveStatus.value = 'saved'
      if (saveStatusTimer) clearTimeout(saveStatusTimer)
      saveStatusTimer = setTimeout(() => (saveStatus.value = 'idle'), 1600)
    } catch {
      saveStatus.value = 'error'
    }
  }, 300)
}

</script>

<template>
  <div v-if="loading" class="loading">加载中...</div>
  <div v-else-if="error" class="error-page">
    <h1>项目加载失败</h1>
    <p>{{ error }}</p>
    <div class="error-actions">
      <button class="btn btn-secondary" @click="loadProject">重试</button>
      <router-link class="btn btn-primary" to="/">返回首页</router-link>
    </div>
  </div>
  <div v-else-if="project" class="editor">
    <TopBar
      :title="project.title"
      :viewUrl="project.viewUrl"
      :editable="true"
      :saveStatus="saveStatus"
      @update:title="onTitleChange"
    />
    <div class="editor-body">
      <aside class="sidebar">
        <div class="sidebar-head">
          <div>
            <h2>模块</h2>
            <p>{{ visibleCount }}/{{ moduleCount }} 个模块可见</p>
          </div>
          <button class="small-btn" @click="previewRef?.reload()">刷新预览</button>
        </div>
        <ModuleMenu
          :modules="project.modules"
          :activeModuleId="activeModuleId"
          :editable="true"
          @select="onSelectModule"
          @update:modules="onModulesChange"
        />
      </aside>
      <main class="preview-area">
        <HtmlPreview ref="previewRef" :htmlUrl="project.htmlUrl" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--text-secondary);
}

.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: var(--bg-page);
  text-align: center;
}

.error-page h1 {
  font-size: 24px;
}

.error-page p {
  color: var(--text-secondary);
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-body {
  flex: 1;
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  overflow: hidden;
}

.sidebar {
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  background: var(--bg-white);
}

.sidebar-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-white);
}

.sidebar-head h2 {
  font-size: 15px;
  font-weight: 700;
}

.sidebar-head p {
  color: var(--text-secondary);
  font-size: 12px;
}

.small-btn {
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #f9fafb;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
}

.preview-area {
  overflow: hidden;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-secondary {
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  color: var(--text-primary);
}

@media (max-width: 860px) {
  .editor-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(220px, 38vh) 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
