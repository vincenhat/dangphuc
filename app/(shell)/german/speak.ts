/**
 * Browser-native pronunciation for German words via SpeechSynthesis.
 * Picks a German voice when one is available, falls back silently when
 * the browser can't speak.
 */

export function speakWord(word: string): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();

  const u = new SpeechSynthesisUtterance(word);
  u.lang = "de-DE";
  u.rate = 0.9;
  u.pitch = 1;

  const voices = synth.getVoices();
  const de = voices.find((v) => v.lang?.toLowerCase().startsWith("de-de"))
    ?? voices.find((v) => v.lang?.toLowerCase().startsWith("de"));
  if (de) u.voice = de;

  synth.speak(u);
}
