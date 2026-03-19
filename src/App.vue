<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { loadAudio, playBeep, say } from './audio';
import { makePeriodicTaskPlanner, timeInSeconds } from './util';
import { fetchExos } from './exos';
import { Settings as SettingsIcon } from 'lucide-vue-next'
import Settings from './views/Settings.vue';
import { acquireWakeLock, releaseWakeLock } from './wakelock';


// Timer states
const enum TimerState {
	Idle,
	Running,
	Finished,
}

const state = ref<TimerState>(TimerState.Idle)
const timeLeft = ref(0)
const bgColor = ref('')
const stateLabel = ref('')
const _isPaused = ref(true)

let nextExpectedTick = 0

let exercises = ref<[string, () => Generator<number, void, unknown>][]>([])
let iterator: Generator<any, void, unknown>
const timer = makePeriodicTaskPlanner()

const settingsOpen = ref(false)

async function loadExos() {
	const code = await fetchExos()

	try {
		const run = new Function("playBeep", "say", "reps", `"use strict";\n${code}`)
		resetUi()
		exercises.value = run(playBeep, say, reps)
	}
	catch (e: unknown) {
		console.error(e)
		alert(`The code cannot be compiled ${e}`)
		settingsOpen.value = true
	}
}

const isPaused = computed({
	get() { return _isPaused.value },
	async set(paused: boolean) {
		if (_isPaused.value === paused) return

		_isPaused.value = paused

		if (paused) {
			timer.cancel()
			await releaseWakeLock()
		}
		else {
			nextExpectedTick = timeInSeconds() + 1
			timer.planEvery(1, timerFunction, false)
			await acquireWakeLock()
		}
	}
})

function advanceOneSecond() {
	const programFinished = iterator.next().done
	if (programFinished) {
		resetUi()
	}
	return programFinished
}

function timerFunction() {
	// Late?
	while (timeInSeconds() - nextExpectedTick > 1) {
		nextExpectedTick += 1
		if (advanceOneSecond()) return
	}

	// Early?
	if (timeInSeconds() - nextExpectedTick < -1) {
		return
	}

	nextExpectedTick += 1
	advanceOneSecond()
}

async function startExercise(generator: Generator<any, void, unknown>) {
	await resetUi()

	state.value = TimerState.Running
	iterator = generator
	iterator.next()
	isPaused.value = false
}

async function resetUi() {
	state.value = TimerState.Idle
	bgColor.value = 'bg-emerald-900'
	stateLabel.value = 'Interval Timer'
	timeLeft.value = 0
	isPaused.value = true
}

async function skipStep() {
	while (timeLeft.value > 1) {
		if (advanceOneSecond()) return
	}

	// Advance last second
	if (!advanceOneSecond() && !isPaused.value) {
		nextExpectedTick = timeInSeconds() + 1
		timer.planEvery(1, timerFunction, false)
	}
}

function *reps(seconds: number, bgCol: string, label: string, onTick?: (timeLeft: number, total: number) => void) {
	bgColor.value = bgCol
	stateLabel.value = label
	timeLeft.value = seconds

	while (timeLeft.value > 0) {
		if (onTick) onTick(timeLeft.value, seconds)

		yield

		timeLeft.value -= 1
	}
}

function onKeyDown(e: KeyboardEvent) {
	if (settingsOpen.value) return

	if (e.code === 'Space') {
		e.preventDefault()

		if (state.value !== TimerState.Idle && state.value !== TimerState.Finished) {
			isPaused.value = !isPaused.value
		}
	}
}

onMounted(async () => {
	await loadExos()
	await loadAudio()

	window.addEventListener('keydown', onKeyDown)
});

onUnmounted(async () => {
	window.removeEventListener('keydown', onKeyDown)
	isPaused.value = true
});
</script>

<template>
	<Settings v-if="settingsOpen" @update="loadExos" @close="settingsOpen = false" />
	<div v-else :class="['min-h-screen flex flex-col items-center justify-center transition-colors duration-500 text-white p-0', bgColor]">
		<div class="max-w-md w-full text-center space-y-8">
			<div class="relative w-full">
				<h1 class="text-4xl font-bold tracking-tight uppercase opacity-80">
					{{ stateLabel }}
				</h1>

				<button
					type="button"
					class="absolute right-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 hover:bg-white/10 text-white active:scale-95 transition"
					@click="settingsOpen = true; isPaused = true">
					<SettingsIcon class="h-5 w-5" />
				</button>
			</div>

			<div class="relative" v-if="state !== TimerState.Idle && state !== TimerState.Finished">
				<div class="text-[12rem] font-black leading-none tabular-nums drop-shadow-2xl">
					{{ timeLeft }}
				</div>
				<div class="text-xl font-medium opacity-60">
					seconds remaining
				</div>
			</div>

			<div v-if="state === TimerState.Idle || state === TimerState.Finished" class="pt-8 flex flex-col items-center gap-4">
				<button
					v-for="exo of exercises"
					@click="startExercise(exo[1]())"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest">
					{{ exo[0] }}
				</button>

				<!-- <button
					@click="settingsOpen = true"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest">
					Customize…
				</button> -->
			</div>

			<div v-else class="pt-8 flex justify-center gap-4">
				<button
					@click="isPaused = !isPaused"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest"
				>
					{{ isPaused ? 'Resume' : 'Pause' }}
				</button>

				<button
					@click="skipStep()"
					class="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest"
				>
					Skip
				</button>

				<button
					@click="resetUi()"
					class="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest"
				>
					Stop
				</button>
			</div>

			<!-- <div v-if="state === TimerState.Idle" class="text-white/60 text-sm max-w-xs mx-auto">
				<p>10s Prepare (Sky Blue)</p>
				<p>8x [6s Work (Red) + 3s Rest (Green)]</p>
				<p>2m Break (Purple)</p>
			</div> -->
		</div>
	</div>
</template>

<style>
body {
	margin: 0;
	overflow: hidden;
}
</style>
