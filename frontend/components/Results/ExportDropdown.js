"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  CodeBracketIcon,
  DocumentArrowDownIcon,
  DocumentIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/solid";

export default function ExportDropdown({
  onExportPDF,
  onExportDOCX,
  onDownloadMD,
  disabled,
  isAdmin,
  isExporting,
  className = "",
  buttonClassName = ""
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const items = [
    {
      label: isExporting ? "Generando PDF..." : "Exportar PDF",
      action: onExportPDF,
      Icon: DocumentArrowDownIcon
    },
    {
      label: isExporting ? "Generando DOCX..." : "Exportar DOCX",
      action: onExportDOCX,
      Icon: DocumentIcon
    }
  ];

  if (isAdmin && onDownloadMD) {
    items.push({ label: "Descargar MD", action: onDownloadMD, Icon: CodeBracketIcon });
  }

  const onToggle = () => {
    if (disabled) return;
    setOpen((v) => !v);
  };

  const onSelect = (action) => {
    if (!action || disabled) return;
    setOpen(false);
    action();
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        {isExporting ? "Generando..." : "Exportar"}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-bg-surface-light bg-bg-surface/90 backdrop-blur shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.action)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary transition hover:bg-bg-surface-light/40"
              disabled={disabled}
            >
              {item.Icon ? <item.Icon className="h-4 w-4" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
