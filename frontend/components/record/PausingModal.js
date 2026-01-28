"use client";

export default function PausingModal({ 
  open, 
  title = "Guardando audio...", 
  subtitle = "Espere un momento" 
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xs rounded-2xl border border-bg-surface-light bg-bg-surface p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
