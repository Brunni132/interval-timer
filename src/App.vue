<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { GoogleGenAI, Modality } from "@google/genai";
import { makePeriodicTaskPlanner } from './util';

// Timer states
const enum TimerState {
	Idle,
	Prepare,
	Work,
	Rest,
	Break,
	Finished,
}

const state = ref<TimerState>(TimerState.Idle)
const timeLeft = ref(0)
const bgColor = ref('')
const stateLabel = ref('')
const isPaused = ref(false)

let iterator: Generator<any, void, unknown>
const timer = makePeriodicTaskPlanner()

// Audio setup
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const audioBuffers = ref<Record<string, AudioBuffer>>({});

const geminiApiKey = process.env.GEMINI_API_KEY;

async function generateTTS(text: string): Promise<string | null> {
  if (!geminiApiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio ? `data:audio/wav;base64,${base64Audio}` : null;
  } catch (e) {
    console.error("TTS generation failed", e);
    return null;
  }
}

async function loadAudio() {
  const words = ['work', 'rest', 'break', 'prepare', 'second leg'];
  for (const word of words) {
    // Try to get from cache first
    let dataUrl = localStorage.getItem(`tts_cache_${word}`);

    if (!dataUrl) {
      // If not in cache, generate new TTS
      dataUrl = await generateTTS(word);
      if (dataUrl) {
        try {
          localStorage.setItem(`tts_cache_${word}`, dataUrl);
        } catch (e) {
          console.warn("localStorage quota exceeded, could not cache audio", e);
        }
      }
    }

    if (dataUrl) {
      try {
        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.value[word] = audioBuffer;
      } catch (e) {
        console.error(`Failed to decode audio for ${word}`, e);
        // If decoding fails, the cache might be corrupted
        localStorage.removeItem(`tts_cache_${word}`);
      }
    }
  }
}

function playSound(name: string) {
  if (audioBuffers.value[name]) {
		var gainNode = audioContext.createGain()
		gainNode.gain.value = 10
		gainNode.connect(audioContext.destination)

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers.value[name];
    source.connect(gainNode);
		source.start();
  } else {
    // Fallback to Web Speech API if Gemini TTS failed or is loading
    const utterance = new SpeechSynthesisUtterance(name);
    window.speechSynthesis.speak(utterance);
  }
}

function playBeep(frequency = 440, duration = 0.1) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gain.gain.setValueAtTime(1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

// Timer Logic
function startExercise(generator: Generator<any, void, unknown>) {
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
	timer.cancel()
}

function *reps(seconds: number, playBeeps: boolean) {
	timeLeft.value = seconds

	while (timeLeft.value > 0) {
		if (playBeeps && timeLeft.value >= 1 && timeLeft.value <= 2) playBeep(440)

		yield

		timeLeft.value -= 1
	}
}

function *oneLeg() {
	const totalRounds = 8

	for (let currentRound = 1; currentRound <= totalRounds; currentRound += 1) {
		state.value = TimerState.Work
		bgColor.value = 'bg-red-500'
		stateLabel.value = `Work (Round ${currentRound}/${totalRounds})`
		playSound('work')
		yield* reps(7, true)

		if (currentRound < totalRounds) {
			state.value = TimerState.Rest
			bgColor.value = 'bg-green-500'
			stateLabel.value = `Rest (Round ${currentRound}/${totalRounds})`
			playSound('rest')
			yield* reps(3, false)
		}
	}
}

function *finished() {
	state.value = TimerState.Finished
	stateLabel.value = 'Finished!'
	bgColor.value = 'bg-zinc-900'
	yield* reps(0, false)
}

function *generatorBreak120() {
	state.value = TimerState.Break
	stateLabel.value = 'Break'
	bgColor.value = 'bg-purple-600'
	playSound('break')
	yield* reps(120, true)

	yield* finished()
}

function *generatorExercise1() {
	state.value = TimerState.Prepare
	bgColor.value = 'bg-sky-400'
	stateLabel.value = 'Prepare'
	playSound('prepare')
	yield* reps(7, true)

	yield* oneLeg()

	state.value = TimerState.Prepare
	bgColor.value = 'bg-sky-400'
	stateLabel.value = 'Second leg'
	playSound('second leg')
	yield* reps(5, false)

	yield* oneLeg()

	state.value = TimerState.Break
	stateLabel.value = 'Break'
	bgColor.value = 'bg-purple-600'
	playSound('break')
	yield* reps(120, true)

	yield* finished()
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
	<div :class="['min-h-screen flex flex-col items-center justify-center transition-colors duration-500 text-white p-8', bgColor]">
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
					@click="resetUi()"
					class="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest"
				>
					Reset
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
