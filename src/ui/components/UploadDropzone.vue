<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadHtml } from '../api/projectApi'

const props = defineProps<{
  folderId?: string | null
}>()
const router = useRouter()
const emit = defineEmits<{
  uploaded: [projectId: string]
}>()
const dragging = ref(false)
const uploading = ref(false)
const error = ref('')
const selectedName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
  input.value = ''
}

async function handleFile(file: File) {
  selectedName.value = file.name
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'html' && ext !== 'htm') {
    error.value = '只支持 .html 或 .htm 文件'
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    error.value = '文件大小不能超过 20MB'
    return
  }

  error.value = ''
  uploading.value = true

  try {
    const result = await uploadHtml(file, props.folderId)
    emit('uploaded', result.projectId)
    router.push(`/project/${result.projectId}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败，请重试'
  } finally {
    uploading.value = false
  }
}

function openFilePicker() {
  if (!uploading.value) fileInputRef.value?.click()
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging, uploading }"
    role="button"
    tabindex="0"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="openFilePicker"
    @keydown.enter.prevent="openFilePicker"
    @keydown.space.prevent="openFilePicker"
  >
    <div v-if="uploading" class="dropzone-content">
      <div class="upload-spinner" aria-hidden="true"></div>
      <p class="dropzone-text">正在解析 HTML</p>
      <p v-if="selectedName" class="dropzone-sub">{{ selectedName }}</p>
    </div>
    <div v-else class="dropzone-content">
      <p class="dropzone-icon">HTML</p>
      <p class="dropzone-text">拖入 HTML 文件到这里</p>
      <p class="dropzone-sub">
        支持 .html / .htm，最大 20MB，或
        <label class="file-label" @click.stop>
          点击选择文件
          <input ref="fileInputRef" type="file" accept=".html,.htm" hidden @change="onFileSelect" />
        </label>
      </p>
    </div>
    <p v-if="error" class="dropzone-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.dropzone {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 54px 40px;
  text-align: center;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  background: var(--bg-white);
  box-shadow: var(--shadow-sm);
  outline: none;
}

.dropzone:hover,
.dropzone:focus-visible {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

.dropzone.dragging {
  border-color: var(--accent);
  background-color: #eff6ff;
}

.dropzone.uploading {
  opacity: 0.7;
  pointer-events: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dropzone-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  border-radius: 8px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0;
}

.dropzone-text {
  font-size: 18px;
  color: var(--text-primary);
}

.dropzone-sub {
  color: var(--text-secondary);
}

.file-label {
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
}

.file-label:hover {
  color: var(--accent-hover);
}

.dropzone-error {
  margin-top: 12px;
  color: var(--danger);
  font-size: 14px;
}

.upload-spinner {
  width: 38px;
  height: 38px;
  border: 3px solid #dbeafe;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
