import { useEffect, useState, type FormEvent } from "react";
import { EMPLOYEE_STATUS_LABELS, EmployeeInputSchema, type Account, type Employee, type EmployeeInput, type Page, type Reference, type SessionUser, type StaffCard } from "@lyne/shared";
import { api, apiBase } from "../api.js";
import { ConfirmAction, ErrorMessage, Modal, Pagination, useDebounced, useLoad } from "./common.js";
import lyneLogo from "../../../../website/logo-lyne.png";
import "./personnel.css";

type References = { departments: Reference[]; jobTitles: Reference[] };
const initial: EmployeeInput = { staffNumber: "", fullName: "", gender: null, phone: null, address: null, hiredAt: null, status: "ACTIVE", notes: null, departmentId: null, jobTitleId: null };
export function Personnel({ user, refresh }: { user: SessionUser; refresh: number }) {
  const [search, setSearch] = useState(""); const query = useDebounced(search);
  const [status, setStatus] = useState(""); const [department, setDepartment] = useState("");
  const [archive, setArchive] = useState("current"); const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Employee | "new" | null>(null); const [error, setError] = useState(""); const [opening, setOpening] = useState(false);
  const refs = useLoad<References>("/personnel-references", refresh + revision);
  const list = useLoad<Page<Employee>>(`/employees?${new URLSearchParams({ page: String(page), pageSize: "12", search: query, archive, ...(status ? { status } : {}), ...(department ? { departmentId: department } : {}) })}`, refresh + revision);
  useEffect(() => {
    if (list.loading || !list.data) return;
    const lastPage = Math.max(1, Math.ceil(list.data.total / list.data.pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [list.loading, list.data, page]);
  const can = (p: string) => user.permissions.includes(p);
  async function open(id: string) { setOpening(true); setError(""); try { setSelected(await api<Employee>(`/employees/${id}`)); } catch (err) { setError((err as Error).message); } finally { setOpening(false); } }
  return <div className="personnel-module"><div className="module-intro"><p>L’équipe, ses fonctions et ses accès.<br /><span>Les fiches et les comptes restent indépendants.</span></p>
    {can("employees.write") && <button className="primary" disabled={!refs.data} onClick={() => setSelected("new")}>+ Ajouter un employé</button>}</div>
    <div className="filters"><label>Rechercher<input type="search" placeholder="Nom ou matricule" value={search} maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <label>Statut<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tous les statuts</option>{Object.entries(EMPLOYEE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>Service<select value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}><option value="">Tous les services</option>{refs.data?.departments.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label>Fiches<select value={archive} onChange={e => { setArchive(e.target.value); setPage(1); }}><option value="current">Non archivées</option><option value="archived">Archivées</option><option value="all">Toutes les fiches</option></select></label></div>
    <ErrorMessage message={error || list.error || refs.error} />
    {list.loading ? <p role="status">Chargement du personnel…</p> : list.data && <>
      <div className="table-wrap"><table><caption>{list.data.total} fiche(s) · Les données du personnel sont confidentielles.</caption><thead><tr><th>Employé</th><th>Fonction / Service</th><th>Statut</th><th>Compte</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {list.data.items.map(employee => <tr key={employee.id}><td><div className="person-cell"><Avatar employee={employee} /><div><strong>{employee.fullName}</strong><small>{employee.staffNumber}</small></div></div></td>
          <td>{employee.jobTitle?.name ?? "Non renseignée"}<small>{employee.department?.name ?? "Sans service"}</small></td><td><span className={`badge ${employee.status !== "ACTIVE" || employee.archivedAt ? "inactive" : ""}`}>{employee.archivedAt ? "Archivé" : EMPLOYEE_STATUS_LABELS[employee.status]}</span></td>
          <td>{employee.user ? <>{employee.user.username}<small>{employee.user.isActive ? "Accès actif" : "Accès désactivé"}</small></> : <span className="muted">Aucun</span>}</td><td><button className="secondary" aria-label={`Ouvrir la fiche de ${employee.fullName}`} disabled={opening} onClick={() => void open(employee.id)}>Ouvrir ↗</button></td></tr>)}
      </tbody></table>{!list.data.total && <div className="empty-state"><span aria-hidden="true">◇</span><h2>{search || status || department || archive !== "current" ? "Aucune fiche correspondante" : "Votre équipe commence ici"}</h2><p>{search || status || department || archive !== "current" ? "Modifiez les filtres pour retrouver un employé." : "Créez vos fonctions et services, puis ajoutez votre premier employé."}</p></div>}</div>
      <Pagination data={list.data} page={page} onPage={setPage} />
    </>}
    {selected && refs.data && <EmployeeEditor key={selected === "new" ? "new" : selected.id} employee={selected === "new" ? null : selected} user={user} references={refs.data}
      onClose={() => setSelected(null)} onSaved={value => { setSelected(value); setRevision(v => v + 1); }} />}
  </div>;
}
function Avatar({ employee }: { employee: Pick<Employee, "photoUrl" | "fullName"> }) {
  return employee.photoUrl ? <img className="avatar" src={`${apiBase}${employee.photoUrl}`} alt="" /> : <span className="avatar initials" aria-hidden="true">{employee.fullName.split(/\s+/).slice(0, 2).map(n => n[0]).join("") || "LY"}</span>;
}
function EmployeeEditor({ employee, user, references, onClose, onSaved }: { employee: Employee | null; user: SessionUser; references: References; onClose: () => void; onSaved: (value: Employee) => void }) {
  const [draft, setDraft] = useState<EmployeeInput>(() => employee ? { staffNumber: employee.staffNumber, fullName: employee.fullName, gender: employee.gender, phone: employee.phone, address: employee.address, hiredAt: employee.hiredAt, status: employee.status, notes: employee.notes, departmentId: employee.departmentId, jobTitleId: employee.jobTitleId, ...(employee.salary !== undefined ? { salary: employee.salary } : {}), ...(user.permissions.includes("users.write") ? { userId: employee.userId } : {}) } : { ...initial, ...(user.permissions.includes("employees.salary") ? { salary: null } : {}) });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [confirm, setConfirm] = useState<"archive" | "restore" | "photo" | null>(null); const [card, setCard] = useState<StaffCard | null>(null);
  const can = (p: string) => user.permissions.includes(p);
  const editable = can("employees.write") && !employee?.archivedAt;
  const field = <K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(""); setNotice("");
    const parsed = EmployeeInputSchema.safeParse(draft);
    if (!parsed.success) { setError("Vérifiez le matricule (lettres/chiffres, sans espace), le nom (2 caractères minimum), la date et le salaire (maximum 2 décimales)."); return; }
    setBusy(true);
    try { const saved = await api<Employee>(employee ? `/employees/${employee.id}` : "/employees", { ...parsed.data, ...(employee ? { version: employee.version } : {}) }, employee ? "PATCH" : "POST"); onSaved(saved); setNotice("Fiche enregistrée."); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !employee) return;
    setError(""); setNotice("");
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024) { setError("Choisissez une photo JPEG, PNG ou WebP de 2 Mo maximum."); return; }
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]!); reader.onerror = () => reject(new Error("Lecture de la photo impossible.")); reader.readAsDataURL(file); });
      onSaved(await api<Employee>(`/employees/${employee.id}/photo`, { data, version: employee.version })); setNotice("Photo enregistrée. Les autres champs du formulaire ne sont pas modifiés.");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function previewCard() { if (!employee) return; setBusy(true); setError(""); try { setCard(await api<StaffCard>(`/employees/${employee.id}/card`)); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <Modal title={employee ? employee.fullName : "Ajouter un employé"} onClose={onClose} busy={busy}>
    {employee?.archivedAt && <p className="alert error">Fiche archivée : {employee.archiveReason}. Le compte associé conserve son propre statut.</p>}
    <p className="muted">Matricule et nom obligatoires. Les autres informations peuvent être complétées plus tard.</p>
    <ErrorMessage message={error} />{notice && <p className="alert success" role="status">{notice}</p>}
    {employee && <div className="photo-editor"><Avatar employee={employee} /><div><strong>Photo du personnel</strong><p className="muted">Privée · JPEG, PNG ou WebP · 2 Mo maximum</p>
      {editable && <label className="upload-label">Choisir une photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>}</div>
      {editable && employee.photoUrl && <button className="text-button" onClick={() => setConfirm("photo")} disabled={busy}>Retirer la photo</button>}</div>}
    <form onSubmit={save}><fieldset disabled={!editable || busy} className="form-grid">
      <label>Matricule *<input required maxLength={30} placeholder="LYNE-001" value={draft.staffNumber} onChange={e => field("staffNumber", e.target.value)} autoFocus={!employee} /></label>
      <label>Nom complet *<input required minLength={2} maxLength={150} value={draft.fullName} onChange={e => field("fullName", e.target.value)} /></label>
      <label>Sexe<select value={draft.gender ?? ""} onChange={e => field("gender", (e.target.value || null) as EmployeeInput["gender"])}><option value="">Non renseigné</option><option value="FEMALE">Féminin</option><option value="MALE">Masculin</option><option value="OTHER">Autre</option></select></label>
      <label>Téléphone<input type="tel" maxLength={40} value={draft.phone ?? ""} onChange={e => field("phone", e.target.value)} /></label>
      <ReferenceSelect label="Fonction" value={draft.jobTitleId} values={references.jobTitles} onChange={v => field("jobTitleId", v)} />
      <ReferenceSelect label="Service" value={draft.departmentId} values={references.departments} onChange={v => field("departmentId", v)} />
      <label>Date d’embauche<input type="date" min="1900-01-01" max="2100-12-31" value={draft.hiredAt ?? ""} onChange={e => field("hiredAt", e.target.value || null)} /></label>
      <label>Statut de l’employé<select value={draft.status} onChange={e => field("status", e.target.value as EmployeeInput["status"])}>{Object.entries(EMPLOYEE_STATUS_LABELS).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      {can("employees.salary") && <label>Salaire (USD) · confidentiel<input inputMode="decimal" placeholder="Non renseigné" value={draft.salary ?? ""} onChange={e => field("salary", e.target.value.replace(",", ".") || null)} /></label>}
      <label className="full-width">Adresse<textarea maxLength={500} value={draft.address ?? ""} onChange={e => field("address", e.target.value)} /></label>
      <label className="full-width">Notes internes<textarea maxLength={2000} value={draft.notes ?? ""} onChange={e => field("notes", e.target.value)} /></label>
      {can("users.write") && can("users.read") && <div className="full-width"><AccountLink value={draft.userId ?? null} current={employee?.user ?? null} employeeId={employee?.id} onChange={v => field("userId", v)} /></div>}
    </fieldset>
      <p className="muted">Changer le statut ou archiver cette fiche ne désactive pas le compte. Gérez son accès dans « Comptes ».</p>
      {!employee && <p className="muted">Enregistrez la fiche pour ajouter sa photo et imprimer sa carte.</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Fermer</button>{editable && <button className="primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer la fiche"}</button>}</div>
    </form>
    {employee && <div className="record-actions">{can("employees.print") && !employee.archivedAt && employee.status === "ACTIVE" && <button className="secondary" onClick={() => void previewCard()} disabled={busy}>Carte de service ↗</button>}
      {can("employees.archive") && <button className="secondary" onClick={() => setConfirm(employee.archivedAt ? "restore" : "archive")} disabled={busy}>{employee.archivedAt ? "Restaurer la fiche" : "Archiver la fiche"}</button>}
      <small>Version {employee.version} · Modifiée le {new Date(employee.updatedAt).toLocaleString("fr-FR")}</small></div>}
    {confirm && employee && <ConfirmAction title={confirm === "photo" ? "Retirer la photo ?" : confirm === "archive" ? "Archiver cette fiche ?" : "Restaurer cette fiche ?"}
      explanation={confirm === "photo" ? "La photo sera retirée de la fiche. Son fichier privé est conservé pour récupération." : "Aucune donnée n’est supprimée. Cette opération ne modifie pas l’accès du compte associé."}
      label={confirm === "photo" ? "Retirer" : confirm === "archive" ? "Archiver" : "Restaurer"} reasonRequired={confirm !== "photo"} onClose={() => setConfirm(null)} onConfirm={async reason => {
        const next = await api<Employee>(`/employees/${employee.id}/${confirm === "photo" ? "photo/remove" : confirm}`, { version: employee.version, ...(confirm !== "photo" ? { reason } : {}) }); onSaved(next);
      }} />}
    {card && <CardPreview card={card} onClose={() => setCard(null)} />}
  </Modal>;
}
function ReferenceSelect({ label, value, values, onChange }: { label: string; value: string | null; values: Reference[]; onChange: (value: string | null) => void }) {
  return <label>{label}<select value={value ?? ""} onChange={e => onChange(e.target.value || null)}><option value="">Non renseigné</option>{values.filter(r => r.isActive || r.id === value).map(r => <option value={r.id} key={r.id}>{r.name}{!r.isActive ? " (désactivé)" : ""}</option>)}</select></label>;
}
function AccountLink({ value, current, employeeId, onChange }: { value: string | null; current: Employee["user"]; employeeId?: string; onChange: (id: string | null) => void }) {
  const [search, setSearch] = useState(""); const query = useDebounced(search); const [page, setPage] = useState(1);
  const list = useLoad<Page<Account>>(`/users?search=${encodeURIComponent(query)}&page=${page}&pageSize=10`, 0);
  const [picked, setPicked] = useState(current);
  return <div className="account-link"><label>Compte associé<select value={value ?? ""} onChange={e => { onChange(e.target.value || null); const row = list.data?.items.find(u => u.id === e.target.value); setPicked(row ? { id: row.id, username: row.username, isActive: row.isActive } : null); }}>
    <option value="">Aucun compte</option>{picked && !list.data?.items.some(u => u.id === picked.id) && <option value={picked.id}>{picked.username}</option>}
    {list.data?.items.map(u => <option key={u.id} value={u.id} disabled={Boolean(u.employee && u.employee.id !== employeeId)}>{u.username}{u.employee && u.employee.id !== employeeId ? " (déjà associé)" : ""}{!u.isActive ? " (désactivé)" : ""}</option>)}</select></label>
    <label>Rechercher un compte<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Identifiant, nom ou e-mail" maxLength={100} /></label>
    <ErrorMessage message={list.error} />{list.loading && <span role="status">Recherche…</span>}{list.data && <div className="inline-pages"><button type="button" className="text-button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Comptes précédents</button><span>{list.data.total} compte(s)</span><button type="button" className="text-button" disabled={page * 10 >= list.data.total} onClick={() => setPage(p => p + 1)}>Comptes suivants</button></div>}
  </div>;
}
export function CardPreview({ card, onClose }: { card: StaffCard; onClose: () => void }) {
  const [ready, setReady] = useState(!card.photoUrl); const [error, setError] = useState("");
  return <Modal title="Carte de service" onClose={onClose} className="card-dialog"><div className="no-print"><p className="muted">Format 85,6 × 54 mm · Imprimez à 100 %, sans en-tête ni pied de page. Vous pouvez choisir « Enregistrer en PDF » dans la fenêtre d’impression.</p><ErrorMessage message={error} /></div>
    <div className="card-print-area"><article className="staff-card"><header><img src={lyneLogo} alt="LYNE Restaurant" /><span>CARTE DE SERVICE</span></header><div className="staff-card-body">
      {card.photoUrl ? <img className="staff-card-photo" src={`${apiBase}${card.photoUrl}`} alt={`Photo de ${card.fullName}`} onLoad={() => setReady(true)} onError={() => { setReady(false); setError("La photo n’a pas pu être chargée. Fermez et réessayez avant d’imprimer."); }} /> : <div className="staff-card-photo placeholder" aria-hidden="true">LY</div>}
      <div><strong>{card.fullName}</strong><p>{card.jobTitle ?? "Équipe LYNE"}</p><p>{card.department ?? ""}</p><b>{card.staffNumber}</b></div></div><footer>DOCUMENT INTERNE · PERSONNEL AUTORISÉ</footer></article></div>
    <div className="form-actions no-print"><button className="secondary" onClick={onClose}>Fermer</button><button className="primary" disabled={!ready} onClick={() => window.print()}>Imprimer / PDF</button></div>
  </Modal>;
}
