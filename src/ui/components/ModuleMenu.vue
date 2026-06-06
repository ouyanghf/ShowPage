<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ParsedModule } from '../types/project'

const props = defineProps<{
  modules: ParsedModule[]
  activeModuleId?: string
  editable?: boolean
}>()

const emit = defineEmits<{
  select: [module: ParsedModule]
  'update:modules': [modules: ParsedModule[]]
}>()

const editingId = ref<string | null>(null)
const editTitle = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function startRename(mod: ParsedModule) {
  if (!props.editable) return
  editingId.value = mod.id
  editTitle.value = mod.title
  nextTick(() => renameInput.value?.focus())
}

function finishRename(mod: ParsedModule) {
  if (editTitle.value.trim() && editTitle.value !== mod.title) {
    const updated = props.modules.map(m =>
      m.id === mod.id ? { ...m, title: editTitle.value.trim() } : m
    )
    emit('update:modules', updated)
  }
  editingId.value = null
}

function cancelRename() {
  editingId.value = null
  editTitle.value = ''
}

function toggleVisible(mod: ParsedModule) {
  const updated = props.modules.map(m =>
    m.id === mod.id ? { ...m, visible: !m.visible } : m
  )
  emit('update:modules', updated)
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.modules]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  updated.forEach((m, i) => (m.order = i + 1))
  emit('update:modules', updated)
}

function moveDown(index: number) {
  if (index === props.modules.length - 1) return
  const updated = [...props.modules]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  updated.forEach((m, i) => (m.order = i + 1))
  emit('update:modules', updated)
}
</script>

<template>
  <nav class="module-menu">
    <div v-if="modules.length === 0" class="empty-menu">没有可显示的模块</div>
    <ul v-else>
      <li
        v-for="(mod, index) in modules"
        :key="mod.id"
        class="menu-item"
        :class="{
          active: mod.id === activeModuleId,
          hidden: !mod.visible,
        }"
        @click="mod.visible || editable ? emit('select', mod) : undefined"
      >
        <div class="menu-item-content">
          <span class="menu-order">{{ index + 1 }}</span>
          <input
            v-if="editingId === mod.id"
            ref="renameInput"
            v-model="editTitle"
            class="rename-input"
            @blur="finishRename(mod)"
            @keydown.enter="finishRename(mod)"
            @keydown.esc="cancelRename"
            @click.stop
          />
          <button v-else-if="editable" class="menu-title" @dblclick.stop="startRename(mod)">
            <span>{{ mod.title }}</span>
            <small v-if="!mod.visible">已隐藏</small>
          </button>
          <span v-else class="menu-title readonly">
            <span>{{ mod.title }}</span>
          </span>
        </div>
        <div v-if="editable" class="menu-actions" @click.stop>
          <button class="action-btn" title="上移" @click="moveUp(index)" :disabled="index === 0">↑</button>
          <button class="action-btn" title="下移" @click="moveDown(index)" :disabled="index === modules.length - 1">↓</button>
          <button class="action-btn wide" :title="mod.visible ? '隐藏模块' : '显示模块'" @click="toggleVisible(mod)">
            {{ mod.visible ? '隐藏' : '显示' }}
          </button>
        </div>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.module-menu {
  padding: 12px 0;
}

.module-menu ul {
  list-style: none;
}

.menu-item {
  padding: 9px 12px 9px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-item.active {
  background-color: #eff6ff;
  border-right: 3px solid var(--accent);
}

.menu-item.hidden {
  opacity: 0.5;
}

.menu-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.menu-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #f3f4f6;
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
}

.menu-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  font-family: inherit;
}

.menu-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.menu-title small {
  color: var(--text-secondary);
  font-size: 11px;
}

.menu-title.readonly {
  cursor: inherit;
}

.rename-input {
  flex: 1;
  min-width: 0;
  padding: 5px 7px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.menu-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  min-width: 24px;
  height: 26px;
  background: #f9fafb;
  border: 1px solid transparent;
  padding: 0 6px;
  font-size: 12px;
  border-radius: 4px;
  color: var(--text-secondary);
}

.action-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background-color: #e5e7eb;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.wide {
  min-width: 38px;
}

.empty-menu {
  padding: 18px 16px;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
