import Modal from "@/components/common/Modal";

export default function DeleteProjectModal({ open, onClose, onConfirm, loading, projectName }) {
  return (
    <Modal
      open={open}
      title="Eliminar proyecto"
      onClose={onClose}
      hideCloseButton
    >
      <div className="space-y-4 text-sm text-text-secondary">
        <p>¿Seguro que quieres eliminar este proyecto?</p>
        {projectName ? (
          <p className="text-text-muted">Se eliminará permanentemente "{projectName}" y todos sus archivos asociados.</p>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-bg-surface-light px-4 py-2 text-xs font-semibold text-text-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg border border-error/40 bg-error/10 px-4 py-2 text-xs font-semibold text-error disabled:opacity-60"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
