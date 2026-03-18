<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue';
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { fetchExos, updateExos } from '../exos'

const exosText = ref('')
const configError = ref<string | null>(null);

const extensions = [javascript(), oneDark]

const emit = defineEmits<{
	(e: 'update'): void
	(e: 'close'): void
}>()

function saveConfig() {
	updateExos(exosText.value)
	emit('close')
	emit('update')
}

onMounted(async () => {
  exosText.value = await fetchExos()
})
</script>

<template>
  <div class="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white p-8">
	<div class="max-w-2xl w-full space-y-8">
	  <div class="flex items-center justify-between">
		<h1 class="text-4xl font-bold tracking-tight uppercase opacity-80">Settings</h1>

		<span>
			<button
				@click="saveConfig"
				class="mx-2 px-8 py-4 bg-blue-700 text-sm text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase">
				Save
			</button>

			<button
				@click="emit('close')"
				class="mx-2 px-8 py-4 bg-zinc-700 text-sm text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase">
				Cancel
			</button>
		</span>
	  </div>

	  <div class="text-left space-y-4">
		<p class="text-sm text-white/60">Modify the exercise configuration below. Changes are saved to local storage.</p>

		<div class="relative group">
		  <div class="absolute -inset-1 bg-gradient-to-r from-sky-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
		  <div class="relative bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
			<codemirror
			  v-model="exosText"
			  placeholder="Code goes here..."
			  :style="{ height: '320px' }"
			  :autofocus="false"
			  :indent-with-tab="true"
			  :tab-size="2"
			  :extensions="extensions"
			  @change="configError = null"
			/>
		  </div>

		  <div v-if="configError" class="mt-2 text-red-400 text-xs font-medium flex items-center gap-2">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			{{ configError }}
		  </div>
		</div>
	  </div>

	  <!-- <div class="bg-white/5 rounded-xl p-6 text-sm text-white/40 space-y-2">
		<h3 class="text-white/60 font-bold uppercase tracking-wider text-xs">Configuration Guide</h3>
		<p><code class="text-sky-400">volume</code>: Number between 0.0 and 1.0. Controls all audio output.</p>
		<p><code class="text-purple-400">prepareDuration</code>: Number of seconds for the initial preparation phase.</p>
	  </div> -->
	</div>
  </div>
</template>

<style>
/* Codemirror overrides */
.cm-editor {
  background: transparent !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 14px;
}

.cm-scroller {
  padding: 10px;
}

.cm-focused {
  outline: none !important;
}
</style>