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

let iterator: Generator<any, void, unknown>
const timer = makePeriodicTaskPlanner()

// Timer Logic
function startExercise(generator: Generator<any, void, unknown>) {
	state.value = TimerState.Running
	iterator = generator
	iterator.next()

	timer.planEvery(1, () => {
		if (isPaused.value) return

		if (iterator.next().done) timer.cancel()

	}, false)
}

function resetUi() {
	state.value = TimerState.Idle
	bgColor.value = 'bg-emerald-900'
	stateLabel.value = 'Interval Timer'
	timeLeft.value = 0
	isPaused.value = false
	timer.cancel()
}

function finished() {
	resetUi()
}

function skipStep() {
	while (timeLeft.value > 1 && !iterator.next().done) {}

	iterator.next()
}

function beepLast(seconds: number) {
	return () => {
		if (timeLeft.value >= 1 && timeLeft.value <= seconds) playBeep(440)
	}
}

function *reps(seconds: number, bgCol: string, label: string, onTick?: () => void) {
	bgColor.value = bgCol
	stateLabel.value = label
	timeLeft.value = seconds

	while (timeLeft.value > 0) {
		if (onTick) onTick()

		yield

		timeLeft.value -= 1
	}
}

function *oneLeg() {
	const totalRounds = 8

	for (let currentRound = 1; currentRound <= totalRounds; currentRound += 1) {
		playSound('work')
		yield* reps(7, 'bg-red-500', `Work (Round ${currentRound}/${totalRounds})`, beepLast(2))

		if (currentRound < totalRounds) {
			playSound('rest')
			yield* reps(3, 'bg-green-500', `Rest (Round ${currentRound}/${totalRounds})`)
		}
	}
}

function *generatorBreak120() {
	playSound('break')
	yield* reps(120, 'bg-purple-600', 'Break', beepLast(5))

	finished()
}

function *generatorExercise1() {
	playSound('prepare')
	yield* reps(7, 'bg-sky-400', 'Prepare', beepLast(2))

	yield* oneLeg()

	playSound('second leg')
	yield* reps(5, 'bg-sky-400', 'Second leg')

	yield* oneLeg()

	playSound('break')
	yield* reps(120, 'bg-purple-600', 'Break', beepLast(5))

	finished()
}

onMounted(() => {
	resetUi()
	loadAudio()
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
					@click="startExercise(generatorExercise1())"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest">
					1 set, 2 legs, 8 reps, 7+3 secs
				</button>

				<button
					v-if="state === TimerState.Idle || state === TimerState.Finished"
					@click="startExercise(generatorBreak120())"
					class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest">
					2 min break
				</button>

				<button
					v-if="state !== TimerState.Idle && state !== TimerState.Finished"
					@click="isPaused = !isPaused"
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
