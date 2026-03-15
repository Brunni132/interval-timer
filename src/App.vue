<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { GoogleGenAI, Modality } from "@google/genai";

// Timer states
type TimerState = 'IDLE' | 'PREPARE' | 'WORK' | 'REST' | 'BREAK' | 'FINISHED';

const state = ref<TimerState>('IDLE');
const timeLeft = ref(0);
const currentRound = ref(1);
const totalRounds = 8;
const isPaused = ref(false);

let timerInterval: number | null = null;

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
  const words = ['work', 'rest', 'break'];
  for (const word of words) {
    const dataUrl = await generateTTS(word);
    if (dataUrl) {
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.value[word] = audioBuffer;
    }
  }
}

function playSound(name: string) {
  if (audioBuffers.value[name]) {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers.value[name];
    source.connect(audioContext.destination);
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
  
  gain.gain.setValueAtTime(0.1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

// Timer Logic
function startTimer() {
  if (state.value === 'IDLE' || state.value === 'FINISHED') {
    state.value = 'PREPARE';
    timeLeft.value = 10;
    currentRound.value = 1;
    runTimer();
  } else {
    isPaused.value = !isPaused.value;
  }
}

function runTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = window.setInterval(() => {
    if (isPaused.value) return;

    if (timeLeft.value > 0) {
      timeLeft.value--;
      
      // Beep at 2, 1, 0
      if ((state.value === 'WORK' || state.value === 'BREAK') && timeLeft.value <= 2) {
        playBeep(timeLeft.value === 0 ? 880 : 440);
      }
    } else {
      nextState();
    }
  }, 1000);
}

function nextState() {
  switch (state.value) {
    case 'PREPARE':
      state.value = 'WORK';
      timeLeft.value = 6;
      playSound('work');
      break;
    case 'WORK':
      state.value = 'REST';
      timeLeft.value = 3;
      playSound('rest');
      break;
    case 'REST':
      if (currentRound.value < totalRounds) {
        currentRound.value++;
        state.value = 'WORK';
        timeLeft.value = 6;
        playSound('work');
      } else {
        state.value = 'BREAK';
        timeLeft.value = 120;
        playSound('break');
      }
      break;
    case 'BREAK':
      state.value = 'FINISHED';
      timeLeft.value = 0;
      if (timerInterval) clearInterval(timerInterval);
      break;
  }
}

const bgColor = computed(() => {
  switch (state.value) {
    case 'PREPARE': return 'bg-sky-400';
    case 'WORK': return 'bg-red-500';
    case 'REST': return 'bg-green-500';
    case 'BREAK': return 'bg-purple-600';
    case 'FINISHED': return 'bg-zinc-900';
    default: return 'bg-zinc-100';
  }
});

const stateLabel = computed(() => {
  switch (state.value) {
    case 'PREPARE': return 'Prepare';
    case 'WORK': return `Work (Round ${currentRound.value}/${totalRounds})`;
    case 'REST': return `Rest (Round ${currentRound.value}/${totalRounds})`;
    case 'BREAK': return 'Break';
    case 'FINISHED': return 'Done!';
    default: return 'Interval Timer';
  }
});

onMounted(() => {
  loadAudio();
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
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
        <div v-if="state !== 'IDLE' && state !== 'FINISHED'" class="text-xl font-medium opacity-60">
          seconds remaining
        </div>
      </div>

      <div class="pt-8 flex justify-center gap-4">
        <button 
          @click="startTimer"
          class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-widest"
        >
          {{ state === 'IDLE' || state === 'FINISHED' ? 'Start Timer' : (isPaused ? 'Resume' : 'Pause') }}
        </button>
        
        <button 
          v-if="state !== 'IDLE'"
          @click="state = 'IDLE'; timeLeft = 0; isPaused = false;"
          class="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest"
        >
          Reset
        </button>
      </div>

      <div v-if="state === 'IDLE'" class="text-white/60 text-sm max-w-xs mx-auto">
        <p>10s Prepare (Sky Blue)</p>
        <p>8x [6s Work (Red) + 3s Rest (Green)]</p>
        <p>2m Break (Purple)</p>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  overflow: hidden;
}
</style>
