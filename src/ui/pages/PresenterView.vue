<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { ProjectData, ParsedModule } from '../types/project'
import { getProject } from '../api/projectApi'
import ModuleMenu from '../components/ModuleMenu.vue'
import HtmlPreview from '../components/HtmlPreview.vue'

const route = useRoute()
const project = ref<ProjectData | null>(null)
const currentIndex = ref(0)
const sidebarVisible = ref(true)
const previewRef = ref<InstanceType<typeof HtmlPreview> | null>(null)
const loading = ref(true)
const error = ref('')

const visibleModules = computed(() =>
  project.value?.modules.filter(m => m.visible) ?? []
)

const currentModuleId = computed(() =>
  visibleModules.value[currentIndex.value]?.id ?? ''
)

onMounted(async () => {
  const projectId = route.params.projectId as string
  try {
    project.value = await getProject(projectId)
    sidebarVisible.value = project.value.layout.showSidebar
  } catch (err) {
    error.value = err instanceof Error ? err.message : '项目加载失败'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight':
    case ' ':
      e.preventDefault()
      nextModule()
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault()
      prevModule()
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    case 'm':
    case 'M':
      toggleSidebar()
      break
    case 'Escape':
      exitFullscreen()
      break
  }
}

function nextModule() {
  if (visibleModules.value.length === 0) return
  currentIndex.value = Math.min(currentIndex.value + 1, visibleModules.value.length - 1)
  scrollToCurrent()
}

function prevModule() {
  if (visibleModules.value.length === 0) return
  currentIndex.value = Math.max(currentIndex.value - 1, 0)
  scrollToCurrent()
}

function scrollToCurrent() {
  const mod = visibleModules.value[currentIndex.value]
  if (mod) previewRef.value?.scrollToModule(mod.selector)
}

function onMenuSelect(mod: ParsedModule) {
  const index = visibleModules.value.findIndex(m => m.id === mod.id)
  if (index >= 0) {
    currentIndex.value = index
    scrollToCurrent()
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}
</script>

<template>
  <div v-if="loading" class="loading">加载中...</div>
  <div v-else-if="error" class="presenter-error">
    <h1>演示页加载失败</h1>
    <p>{{ error }}</p>
    <router-link class="control-btn primary" to="/">返回首页</router-link>
  </div>
  <div
    v-else-if="project"
    class="presenter-layout"
    :class="{ 'sidebar-hidden': !sidebarVisible }"
  >
    <aside v-show="sidebarVisible" class="presenter-sidebar">
      <div class="presenter-sidebar-header">
        <h2>{{ project.title }}</h2>
        <button class="icon-btn" title="隐藏菜单" @click="toggleSidebar">收起</button>
      </div>
      <ModuleMenu
        :modules="visibleModules"
        :activeModuleId="currentModuleId"
        @select="onMenuSelect"
      />
      <div class="presenter-sidebar-footer">
        <span class="shortcut-hint">
          {{ visibleModules.length ? currentIndex + 1 : 0 }}/{{ visibleModules.length }}
          · 方向键切换 · F 全屏 · M 菜单
        </span>
      </div>
    </aside>
    <main class="presenter-content">
      <div class="presenter-controls">
        <div class="presenter-nav-actions">
          <router-link class="control-btn" to="/">上传管理</router-link>
          <router-link class="control-btn" :to="`/project/${project.id}`">编辑当前项目</router-link>
        </div>
        <div class="presenter-step-actions">
          <button v-if="!sidebarVisible" class="control-btn" @click="toggleSidebar">菜单</button>
          <button class="control-btn" @click="prevModule" :disabled="currentIndex === 0">上一页</button>
          <button class="control-btn" @click="nextModule" :disabled="currentIndex >= visibleModules.length - 1">下一页</button>
          <button class="control-btn primary" @click="toggleFullscreen">全屏</button>
        </div>
      </div>
      <HtmlPreview ref="previewRef" class="presenter-preview" :htmlUrl="project.htmlUrl" />
    </main>
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

.presenter-error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  background: var(--bg-page);
}

.presenter-error h1 {
  font-size: 24px;
}

.presenter-error p {
  color: var(--text-secondary);
}

.presenter-layout {
  display: grid;
  grid-template-columns: var(--presenter-sidebar-width) 1fr;
  height: 100vh;
  background: var(--bg-dark);
  transition: grid-template-columns 0.3s ease;
}

.presenter-layout.sidebar-hidden {
  grid-template-columns: 1fr;
}

.presenter-sidebar {
  background: var(--bg-white);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.presenter-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--border-color);
}

.presenter-sidebar-header h2 {
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presenter-sidebar-footer {
  margin-top: auto;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.shortcut-hint {
  font-size: 11px;
  color: var(--text-secondary);
}

.presenter-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-white);
  overflow: hidden;
}

.presenter-preview {
  flex: 1;
  min-height: 0;
}

.presenter-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: #f9fafb;
  flex-shrink: 0;
}

.presenter-nav-actions,
.presenter-step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.control-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-white);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.control-btn.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.control-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.icon-btn {
  min-height: 28px;
  padding: 0 8px;
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .presenter-layout {
    grid-template-columns: 1fr;
  }

  .presenter-sidebar {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 10;
    width: min(84vw, var(--presenter-sidebar-width));
    box-shadow: var(--shadow-md);
  }

  .presenter-controls {
    align-items: stretch;
    flex-direction: column;
    overflow-x: auto;
  }

  .presenter-nav-actions,
  .presenter-step-actions {
    justify-content: flex-end;
  }

  .presenter-nav-actions {
    justify-content: flex-start;
  }
}
</style>
