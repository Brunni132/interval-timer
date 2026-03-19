// Audio setup
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const audioBuffers = {} as Record<string, AudioBuffer>

// const geminiApiKey = process.env.GEMINI_API_KEY;

// async function generateTTS(text: string): Promise<string | null> {
//   if (!geminiApiKey) return null;
//   try {
//     const ai = new GoogleGenAI({ apiKey: geminiApiKey });
//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash-preview-tts",
//       contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
//       config: {
//         responseModalities: [Modality.AUDIO],
//         speechConfig: {
//           voiceConfig: {
//             prebuiltVoiceConfig: { voiceName: 'Kore' },
//           },
//         },
//       },
//     });

//     const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
//     return base64Audio ? `data:audio/wav;base64,${base64Audio}` : null;
//   } catch (e) {
//     console.error("TTS generation failed", e);
//     return null;
//   }
// }

// async function loadAudio() {
//   const words = ['work', 'rest', 'break', 'prepare', 'second leg'];
//   for (const word of words) {
//     // Try to get from cache first
//     let dataUrl = localStorage.getItem(`tts_cache_${word}`);

//     if (!dataUrl) {
//       // If not in cache, generate new TTS
//       dataUrl = await generateTTS(word);
//       if (dataUrl) {
//         try {
//           localStorage.setItem(`tts_cache_${word}`, dataUrl);
//         } catch (e) {
//           console.warn("localStorage quota exceeded, could not cache audio", e);
//         }
//       }
//     }

//     if (dataUrl) {
//       try {
//         const response = await fetch(dataUrl);
//         const arrayBuffer = await response.arrayBuffer();
//         const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
//         audioBuffers[word] = audioBuffer;
//       } catch (e) {
//         console.error(`Failed to decode audio for ${word}`, e);
//         // If decoding fails, the cache might be corrupted
//         localStorage.removeItem(`tts_cache_${word}`);
//       }
//     }
//   }
// }

export function getVolume() {
	return Number(localStorage.getItem('volume') ?? 1)
}

function getVolumeGain() {
  const dB = -40 + getVolume() * 40
  return Math.pow(10, dB / 20)
}

export async function loadAudio() {
  const sounds = ['prepare', 'work', 'rest', 'break', 'finished', 'second leg', 'hold', '5', '4', '3', '2', '1'];
  for (const name of sounds) {
    try {
      const base = new URL('.', window.location.href).pathname
      const response = await fetch(`${base}assets/${name}.mp3`);
      if (!response.ok) throw new Error(`Failed to load ${base}assets/${name}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers[name] = audioBuffer;
    } catch (e) {
      console.warn(`Could not load audio for ${name}, falling back to speech synthesis`, e);
    }
  }
}

export function say(name: string) {
  if (audioBuffers[name]) {
		var gainNode = audioContext.createGain()
		gainNode.gain.value = getVolumeGain()
		gainNode.connect(audioContext.destination)

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[name];
    source.connect(gainNode);
		source.start();
  } else {
    // Fallback to Web Speech API if Gemini TTS failed or is loading
    const utterance = new SpeechSynthesisUtterance(name);
    window.speechSynthesis.speak(utterance);
  }
}

export function playBeep(frequency = 440, duration = 0.1) {
  const vol = getVolumeGain()
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gain.gain.setValueAtTime(vol, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(vol * 0.2, audioContext.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

export function updateVolume(vol: number) {
  localStorage.setItem('volume', String(vol))
}
