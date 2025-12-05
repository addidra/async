'use client'

import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export default function VoiceInput() {
  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // if (typeof window === "undefined") return null; 

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support Speech Recognition.</p>;
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-green-600 text-white"
          onClick={() => {console.log("Start recording");SpeechRecognition.startListening({ continuous: true })}}
        >
          🎤 Start
        </button>

        <button
          className="px-4 py-2 rounded bg-red-600 text-white"
          onClick={() => {console.log("Stop recording");SpeechRecognition.stopListening()}}
        >
          Stop
        </button>
      </div>

      <p className="p-2 bg-gray-100 dark:bg-zinc-800 rounded border">
        {transcript || "Start speaking..."}
      </p>
    </div>
  );
}
