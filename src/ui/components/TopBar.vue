<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  viewUrl: string
  editable?: boolean
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}>()

const emit = defineEmits<{
  'update:title': [title: string]
}>()

const editing = ref(false)
const editValue = ref('')
const copyState = ref<'idle' | 'copied' | 'error'>('idle')

function startEdit() {
  if (!props.editable) return
  editing.value = true
  editValue.value = props.title
}

function finishEdit() {
  if (editValue.value.trim() && editValue.value !== props.title) {
    emit('update:title', editValue.value.trim())
  }
  editing.value = false
}

async function copyLink() {
  const url = `${window.location.origin}${props.viewUrl}`
  try {
    await navigator.clipboard.writeText(url)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
    window.prompt('复制演示链接', url)
  }
  setTimeout(() => (copyState.value = 'idle'), 2000)
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <router-link class="home-link" to="/" title="返回首页">首页</router-link>
      <div class="topbar-title">
        <input
          v-if="editing"
          v-model="editValue"
          class="title-input"
          @blur="finishEdit"
          @keydown.enter="finishEdit"
          @keydown.esc="editing = false"
          autofocus
        />
        <button v-else class="title-button" :disabled="!editable" @click="startEdit">
          {{ title }}
        </button>
        <span v-if="saveStatus && saveStatus !== 'idle'" class="save-status" :class="saveStatus">
          {{ saveStatus === 'saving' ? '保存中' : saveStatus === 'saved' ? '已保存' : '保存失败' }}
        </span>
      </div>
    </div>
    <div class="topbar-actions">
      <router-link :to="viewUrl" class="btn btn-primary" target="_blank">进入演示</router-link>
      <button class="btn btn-secondary" @click="copyLink">
        {{ copyState === 'copied' ? '已复制' : copyState === 'error' ? '手动复制' : '复制链接' }}
      </button>
      <router-link class="btn btn-secondary" to="/">管理项目</router-link>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-white);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.home-link {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}

.home-link:hover {
  background: #f3f4f6;
  color: var(--text-primary);
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title-button {
  max-width: min(50vw, 620px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent;
  border: none;
  padding: 3px 0;
  color: var(--text-primary);
  text-align: left;
  font-size: 18px;
  font-weight: 600;
}

.title-button:disabled {
  cursor: default;
}

.title-input {
  width: min(50vw, 620px);
  font-size: 18px;
  font-weight: 600;
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 2px 8px;
  outline: none;
}

.topbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: #f3f4f6;
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: var(--danger);
}

.btn-danger:hover:not(:disabled) {
  background: #fee2e2;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.save-status {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.save-status.error {
  color: var(--danger);
}

@media (max-width: 720px) {
  .topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .title-button,
  .title-input {
    max-width: 100%;
    width: 100%;
  }
}
</style>
