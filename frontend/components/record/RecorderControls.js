"use client";

import { PlayIcon, PauseIcon, StopIcon } from "@heroicons/react/24/solid";

export default function RecorderControls({
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  projectName,
  onProjectNameChange,
  timerLabel
}) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isStopped = status === "stopped";

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Título del proyecto - izquierda */}
      <div className="flex-1 min-w-0">
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Sin título"
          disabled={!isStopped}
          maxLength={50}
          className="w-full bg-transparent text-base font-medium text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-70"
        />
      </div>

      {/* Botones - centro */}
      <div className="flex items-center gap-3 shrink-0">
        {isStopped ? (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/40 hover:bg-accent-light"
          >
            <PlayIcon className="h-4 w-4" />
            START
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-full border border-error/70 px-5 py-2 text-xs font-semibold text-error"
          >
            <StopIcon className="h-4 w-4" />
            STOP
          </button>
        )}

        {isPaused ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-full border border-bg-surface-light px-5 py-2 text-xs font-semibold text-text-secondary"
          >
            <PlayIcon className="h-4 w-4" />
            CONTINUAR
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            disabled={!isRecording}
            className="inline-flex items-center gap-2 rounded-full border border-bg-surface-light px-5 py-2 text-xs font-semibold text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PauseIcon className="h-4 w-4" />
            PAUSA
          </button>
        )}
      </div>

      {/* Timer - derecha */}
      <div className="flex-1 min-w-0 text-right">
        <span className="text-base font-medium text-text-muted">
          {timerLabel}
        </span>
      </div>
    </div>
  );
}
