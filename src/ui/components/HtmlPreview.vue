<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  htmlUrl: string
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function scrollToModule(selector: string) {
  iframeRef.value?.contentWindow?.postMessage(
    { type: 'SCROLL_TO_MODULE', selector },
    '*'
  )
}

function reload() {
  loaded.value = false
  iframeRef.value?.contentWindow?.location.reload()
}

defineExpose({ scrollToModule, reload })
</script>

<template>
  <div class="preview">
    <div v-if="!loaded" class="preview-loading">正在加载预览...</div>
    <iframe ref="iframeRef" :src="htmlUrl" @load="loaded = true" />
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-white);
}

.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  background: var(--bg-white);
  z-index: 1;
}
</style>
