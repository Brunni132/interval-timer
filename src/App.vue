<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { loadAudio, playBeep, playSound } from './audio';
import { makePeriodicTaskPlanner } from './util';

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
const isPaused = ref(false)

let exercises = ref<[string, () => Generator<number, void, unknown>][]>([])
let iterator: Generator<any, void, unknown>
const timer = makePeriodicTaskPlanner()

async function loadExos() {
	const base = new URL('.', window.location.href).pathname
	const response = await fetch(`${base}assets/exos.js`)
	if (!response.ok) throw new Error(`Failed to load ${base}assets/exos.js`);

	const text = await response.text()

	const run = new Function("playBeep", "playSound", "reps", `"use strict";\n${text}`)
	exercises.value = run(playBeep, playSound, reps)
}

function timerFunction() {
	if (isPaused.value) return

	if (iterator.next().done) {
		resetUi()
		timer.cancel()
	}
}

function startExercise(generator: Generator<any, void, unknown>) {
	state.value = TimerState.Running
	iterator = generator
	iterator.next()

	timer.planEvery(1, timerFunction, false)
}

function resetUi() {
	state.value = TimerState.Idle
	bgColor.value = 'bg-emerald-900'
	stateLabel.value = 'Interval Timer'
	timeLeft.value = 0
	isPaused.value = false
	timer.cancel()
}

function togglePause() {
	isPaused.value = !isPaused.value

	if (isPaused.value) {
		timer.cancel()
	}
	else {
		timer.planEvery(1, timerFunction, false)
	}
}

function skipStep() {
	while (timeLeft.value > 1 && !iterator.next().done) {}

	timer.planEvery(1, timerFunction, true)
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

onMounted(async () => {
	resetUi()
	loadAudio()

	await loadExos()
});

onUnmounted(() => {
	timer.cancel()
});
</script>

<template>
	<div :class="['min-h-screen flex flex-col items-center justify-center transition-colors duration-500 text-white p-0', bgColor]">
		<div class="max-w-md w-full text-center space-y-8">
			<h1 class="text-4xl font-bold tracking-tight uppercase opacity-80">
				{{ stateLabel }}
			</h1>

			<div class="relative">
				<div class="text-[12rem] font-black leading-none tabular-nums drop-shadow-2xl">
					{{ timeLeft }}
				</div>
				<div v-if="state !== TimerState.Idle && state !== TimerState.Finished" class="text-xl font-medium opacity-60">
					seconds remaining
				</div>
			</div>

			<div class="pt-8 flex justify-center gap-4">
				<button
					v-if="state === TimerState.Idle || state === TimerState.Finished"
					v-for="exo of exercises"
					@click="startExercise(exo[1]())"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest">
					{{ exo[0] }}
				</button>

				<button
					v-if="state !== TimerState.Idle && state !== TimerState.Finished"
					@click="togglePause()"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest"
				>
					{{ isPaused ? 'Resume' : 'Pause' }}
				</button>

				<button
					v-if="state !== TimerState.Idle && state !== TimerState.Finished"
					@click="skipStep()"
					class="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest"
				>
					Skip
				</button>

				<button
					v-if="state !== TimerState.Idle && state !== TimerState.Finished"
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
