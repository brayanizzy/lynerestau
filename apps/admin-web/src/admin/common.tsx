import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Page } from "@lyne/shared";
import { api } from "../api.js";

export function useLoad<T>(path: string, refresh: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api<T>(path).then(value => { if (active) setData(value); }).catch(err => { if (active) { setData(null); setError((err as Error).message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, refresh]);
  return { data, loading, error };
}
export function useDebounced(value: string) {
  const [result, setResult] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setResult(value), 250); return () => clearTimeout(timer); }, [value]);
  return result;
}
export function Modal({ title, children, onClose, busy = false, className = "" }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={ref} className={`editor-dialog ${className}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id={id}>{title}</h2><button type="button" className="secondary" onClick={onClose} disabled={busy} aria-label="Fermer">✕</button></div>{children}
  </dialog>, document.body);
}
export function ErrorMessage({ message }: { message: string }) { return message ? <p className="alert error" role="alert">{message}</p> : null; }
export function Pagination({ data, page, onPage }: { data: Pick<Page<unknown>, "total" | "pageSize">; page: number; onPage: (page: number) => void }) {
  return <div className="pagination"><span>{data.total} résultat(s) · page {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div>
    <button className="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Précédent</button>
    <button className="secondary" disabled={page * data.pageSize >= data.total} onClick={() => onPage(page + 1)}>Suivant</button></div></div>;
}
export function ConfirmAction({ title, explanation, label, onConfirm, onClose, reasonRequired = false }: {
  title: string; explanation: string; label: string; onConfirm: (reason: string) => Promise<void>; onClose: () => void; reasonRequired?: boolean;
}) {
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <Modal title={title} onClose={onClose} busy={busy}><p>{explanation}</p><ErrorMessage message={error} /><form onSubmit={async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await onConfirm(reason.trim()); onClose(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}>{reasonRequired && <label>Motif obligatoire<textarea autoFocus required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>}
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Annuler</button><button className="primary" disabled={busy}>{busy ? "Enregistrement…" : label}</button></div>
  </form></Modal>;
}
