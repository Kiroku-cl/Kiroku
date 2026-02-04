"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  EllipsisVerticalIcon,
  TrashIcon
} from "@heroicons/react/24/solid";
import ToastList from "@/components/common/ToastList";
import ScriptPreview from "@/components/Results/ScriptPreview";
import DeleteProjectModal from "@/components/Projects/DeleteProjectModal";
import ExportDropdown from "@/components/Results/ExportDropdown";

const POLL_INTERVAL = 2000;

export default function ResultClient({
  projectId,
  initialStatus,
  initialError,
  projectName,
  initialParticipantName,
  initialCreatedAt,
  initialExpiresAt,
  initialRecordingDuration
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(initialError);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectName || "Sin título");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [meta, setMeta] = useState({
    participantName: initialParticipantName || "",
    createdAt: initialCreatedAt || "",
    expiresAt: initialExpiresAt || "",
    recordingDurationSeconds: initialRecordingDuration
  });
  const previewRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const router = useRouter();

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (message, type = "info") => {
      const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      setToasts((prev) => [...prev, { id, message, type, visible: false }]);
      setTimeout(() => {
        setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, visible: true } : toast)));
      }, 10);
      setTimeout(() => {
        dismissToast(id);
      }, 2000);
    },
    [dismissToast]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/project/${projectId}/status`, {
        credentials: "include"
      });
      const data = await res.json();
      if (!data.ok) return;
      if (data.status !== status || data.error !== error) {
        setStatus(data.status);
        setError(data.error || "");
      }
      setMeta((prev) => ({
        participantName: data.participant_name ?? prev.participantName,
        createdAt: data.created_at ?? prev.createdAt,
        expiresAt: data.expires_at ?? prev.expiresAt,
        recordingDurationSeconds: data.recording_duration_seconds ?? prev.recordingDurationSeconds
      }));
    } catch (err) {
      // ignore polling errors
    }
  }, [projectId, status, error]);

  useEffect(() => {
    if (status === "queued" || status === "processing") {
      const interval = setInterval(fetchStatus, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [status, fetchStatus]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showActionsMenu) return undefined;
    const onClickOutside = (event) => {
      const toggleButton = document.querySelector('[aria-label="Más opciones"]');
      if (toggleButton && toggleButton.contains(event.target)) return;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showActionsMenu]);

  useEffect(() => {
    if (status !== "done") return;
    let active = true;
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const res = await fetch(`/api/project/${projectId}/preview`, {
          credentials: "include"
        });
        const data = await res.json();
        if (!active) return;
        if (data.ok) {
          setPreviewHtml(data.html || "");
        } else {
          setPreviewError(data.error || "Error cargando preview");
        }
      } catch (err) {
        if (!active) return;
        setPreviewError("Error cargando preview");
      } finally {
        if (active) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => {
      active = false;
    };
  }, [status, projectId]);

  const copyPreview = async () => {
    if (!previewRef.current) return;
    const html = previewRef.current.innerHTML;
    const text = previewRef.current.innerText;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blobInput = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        });
        await navigator.clipboard.write([blobInput]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(html);
      } else {
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }
      addToast("Copiado al portapapeles", "success");
    } catch (err) {
      addToast("Error al copiar. Intenta seleccionar manualmente.", "error");
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/project/${projectId}/export/pdf`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `guion_${projectId.substring(0, 8)}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        addToast("PDF generado exitosamente", "success");
      } else {
        const data = await res.json();
        addToast(data.error || "Error al generar PDF", "error");
      }
    } catch (err) {
      addToast("Error al generar PDF", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/project/${projectId}/export/docx`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `guion_${projectId.substring(0, 8)}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        addToast("DOCX generado exitosamente", "success");
      } else {
        const data = await res.json();
        addToast(data.error || "Error al generar DOCX", "error");
      }
    } catch (err) {
      addToast("Error al generar DOCX", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMD = async () => {
    try {
      const res = await fetch(`/api/project/${projectId}/export/md`, {
        credentials: "include"
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `guion_${projectId.substring(0, 8)}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        addToast(data.error || "Error al descargar MD", "error");
      }
    } catch (err) {
      addToast("Error al descargar MD", "error");
    }
  };

  const handleTitleSave = async () => {
    if (title.trim() === projectName) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim() })
      });

      if (res.ok) {
        setIsEditingTitle(false);
        addToast("Título actualizado", "success");
      } else {
        addToast("Error al actualizar título", "error");
        setTitle(projectName);
      }
    } catch (err) {
      addToast("Error al actualizar título", "error");
      setTitle(projectName);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        router.push("/projects?deleted=true");
      } else {
        addToast("Error al eliminar proyecto", "error");
      }
    } catch (err) {
      addToast("Error al eliminar proyecto", "error");
    }
    setDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const durationLabel = formatDuration(meta.recordingDurationSeconds);
  const createdLabel = formatDate(meta.createdAt);
  const expiryLabel = formatExpiry(meta.expiresAt);

  if (status === "queued" || status === "processing") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-bg-surface-light bg-bg-surface/70 px-6 py-12 text-center shadow-xl">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
        <h1 className="text-2xl font-semibold text-text-primary">Procesando...</h1>
        <p className="mt-2 text-sm text-text-muted">Generando tu guión. Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-bg-surface-light bg-bg-surface/70 px-6 py-10 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-text-primary">Error al procesar</h1>
        {error ? (
          <div className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}
        <p className="mt-4 text-sm text-text-muted">Hubo un problema generando el guion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative mx-auto w-full max-w-4xl rounded-3xl border border-bg-surface-light bg-bg-surface/70 px-6 py-8 shadow-xl">
        <button
          type="button"
          aria-label="Más opciones"
          onClick={() => setShowActionsMenu((v) => !v)}
          className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 text-text-muted transition hover:bg-bg-surface-light/60 sm:hidden"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>

        {showActionsMenu ? (
          <div
            ref={actionsMenuRef}
            className="absolute right-4 top-12 z-10 w-48 overflow-hidden rounded-xl border border-bg-surface-light bg-bg-surface/95 backdrop-blur shadow-xl sm:hidden"
          >
            <button
              type="button"
              onClick={() => {
                setShowActionsMenu(false);
                setShowDeleteModal(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-error transition hover:bg-bg-surface-light/40"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar proyecto
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4 pr-12 sm:pr-0">
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                className="w-full border-b-2 border-accent bg-transparent text-2xl font-semibold text-text-primary focus:outline-none"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="cursor-pointer text-2xl font-semibold text-accent transition-colors hover:text-accent-light"
                title="Click para editar"
              >
                {title}
              </h1>
            )}
            {meta.participantName ? (
              <p className="text-sm text-text-muted">{meta.participantName}</p>
            ) : null}
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              {expiryLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {createdLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            {durationLabel}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-nowrap gap-2 sm:flex-wrap sm:gap-3 sm:items-center">
            <ExportDropdown
              onExportPDF={handleExportPDF}
              onExportDOCX={handleExportDOCX}
              onDownloadMD={handleDownloadMD}
              disabled={isExporting}
              isAdmin={Boolean(user?.is_admin)}
              isExporting={isExporting}
              className="flex-1 sm:flex-none"
              buttonClassName="w-full sm:w-auto"
            />

            <button
              type="button"
              onClick={copyPreview}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-bg-surface-light bg-white/10 px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-white/20 flex-1 sm:flex-none"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              <span className="sm:hidden">Copiar</span>
              <span className="hidden sm:inline">Copiar guion</span>
            </button>
          </div>

          <div className="hidden flex-1 sm:block" />

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="hidden sm:inline-flex items-center justify-center rounded-full border border-error/70 px-4 py-2 text-xs font-semibold text-error transition hover:bg-error/5"
          >
            Eliminar proyecto
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-bg-surface-light bg-bg-surface/70 px-6 py-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Vista previa</h2>
        </div>

        <div
          ref={previewRef}
          className="mt-4 rounded-2xl border border-black/10 bg-white px-5 py-6 text-sm text-black"
        >
          {previewLoading ? (
            <p className="text-text-muted">Cargando...</p>
          ) : previewError ? (
            <p className="text-error">{previewError}</p>
          ) : (
            <ScriptPreview html={previewHtml} />
          )}
        </div>
      </div>

      <DeleteProjectModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        projectName={projectName}
      />

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return "-";
  const seconds = Math.max(0, Number(totalSeconds));
  if (Number.isNaN(seconds)) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-ES");
}

function formatExpiry(value) {
  if (!value) return "Sin expiración";
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return "Sin expiración";
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return "Expirado";
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `Expira en ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Expira en ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Expira en ${diffDays} días`;
}
