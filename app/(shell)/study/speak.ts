/**
 * Browser-native pronunciation via SpeechSynthesis. Free, offline-friendly.
 * Falls back silently when the browser can't speak.
 */

export function speakWord(word: string): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  // Cancel any in-flight utterance so rapid clicks don't queue up.
  synth.cancel();

  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.9;
  u.pitch = 1;

  // Pick an English voice if one is available.
  const voices = synth.getVoices();
  const en = voices.find((v) => v.lang?.toLowerCase().startsWith("en-us"))
    ?? voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
  if (en) u.voice = en;

  synth.speak(u);
}
