import { useState } from "react";
import type { Reference, ReferenceKind, SessionUser } from "@lyne/shared";
import { api } from "../api.js";
import { ErrorMessage, Modal, useLoad } from "./common.js";
import "./personnel.css";

export function References({ user, refresh }: { user: SessionUser; refresh: number }) {
  const [revision, setRevision] = useState(0); const refs = useLoad<{ departments: Reference[]; jobTitles: Reference[] }>("/personnel-references", refresh + revision);
  const [selected, setSelected] = useState<{ kind: ReferenceKind; item: Reference | null } | null>(null);
  const canWrite = user.permissions.includes("references.write");
  return <><div className="module-intro"><p>Organisez l’équipe du restaurant.<br /><span>Une référence désactivée reste visible sur les fiches déjà associées.</span></p></div><ErrorMessage message={refs.error} />
    {refs.loading ? <p role="status">Chargement des fonctions et services…</p> : <div className="reference-grid">{([ ["departments", "Services", refs.data?.departments], ["job-titles", "Fonctions", refs.data?.jobTitles] ] as const).map(([kind, title, items]) => <article className="card" key={kind}>
      <div className="module-intro"><h2>{title}</h2>{canWrite && <button className="secondary" onClick={() => setSelected({ kind, item: null })}>+ Ajouter</button>}</div>
      {!items?.length && <p className="muted">Aucune référence. Ajoutez les {title.toLowerCase()} réellement utilisés par la cliente.</p>}
      <ul className="reference-list">{items?.map(item => <li key={item.id}><div><strong>{item.name}</strong><small>{item.isActive ? "Actif" : "Désactivé"}</small></div>{canWrite && <button className="text-button" aria-label={`Modifier ${item.name}`} onClick={() => setSelected({ kind, item })}>Modifier ↗</button>}</li>)}</ul>
    </article>)}</div>}
    {selected && <ReferenceEditor kind={selected.kind} item={selected.item} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setRevision(v => v + 1); }} />}
  </>;
}
function ReferenceEditor({ kind, item, onClose, onSaved }: { kind: ReferenceKind; item: Reference | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? ""); const [active, setActive] = useState(item?.isActive ?? true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <Modal title={`${item ? "Modifier" : "Ajouter"} ${kind === "departments" ? "un service" : "une fonction"}`} onClose={onClose} busy={busy}><ErrorMessage message={error} /><form onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await api(`/personnel-references/${kind}${item ? `/${item.id}` : ""}`, { name: name.trim(), isActive: active, ...(item ? { version: item.version } : {}) }, item ? "PATCH" : "POST"); onSaved(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}><label>Nom *<input required minLength={2} maxLength={100} value={name} disabled={busy} onChange={e => setName(e.target.value)} autoFocus /></label>
    <label className="check-row"><input type="checkbox" checked={active} disabled={busy} onChange={e => setActive(e.target.checked)} />Disponible pour les nouvelles affectations</label>
    <p className="muted">La désactivation ne supprime aucune fiche ni aucune association existante.</p><div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div></form></Modal>;
}
