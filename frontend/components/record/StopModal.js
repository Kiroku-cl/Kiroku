"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
  TrashIcon
} from "@heroicons/react/24/solid";

export default function StopModal({ open, onFinish, onDiscard, onContinue }) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  if (!open) return null;

  const handleDiscardClick = () => {
    setConfirmingDiscard(true);
  };

  const handleConfirmDiscard = async () => {
    setIsDiscarding(true);
    try {
      await onDiscard?.();
    } finally {
      setIsDiscarding(false);
      setConfirmingDiscard(false);
    }
  };

  const handleCancelDiscard = () => {
    setConfirmingDiscard(false);
  };

  // Vista de confirmación de descarte
  if (confirmingDiscard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-bg-surface-light bg-bg-surface p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <ExclamationTriangleIcon className="h-6 w-6 text-error" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">¿Estás seguro?</h2>
          <p className="mt-2 text-sm text-text-muted">
            Esta acción eliminará la grabación permanentemente. No podrás recuperarla.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-error px-4 py-3 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-70"
              onClick={handleConfirmDiscard}
              disabled={isDiscarding}
            >
              {isDiscarding ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Espere un momento...
                </>
              ) : (
                <>
                  <TrashIcon className="h-5 w-5" />
                  Sí, descartar grabación
                </>
              )}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border border-bg-surface-light px-4 py-3 text-sm font-semibold text-text-secondary disabled:opacity-50"
              onClick={handleCancelDiscard}
              disabled={isDiscarding}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              No, volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal de opciones
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-bg-surface-light bg-bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">¿Qué quieres hacer?</h2>
        <p className="mt-2 text-sm text-text-muted">La grabación está pausada</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-light"
            onClick={onFinish}
          >
            <CheckCircleIcon className="h-5 w-5" />
            Finalizar y procesar
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-error/70 px-4 py-3 text-sm font-semibold text-error"
            onClick={handleDiscardClick}
          >
            <TrashIcon className="h-5 w-5" />
            Descartar grabación
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-bg-surface-light px-4 py-3 text-sm font-semibold text-text-secondary"
            onClick={onContinue}
          >
            <PlayCircleIcon className="h-5 w-5" />
            Continuar grabando
          </button>
        </div>
      </div>
    </div>
  );
}
