import { useState } from "react";
import { AccountInputSchema, PERMISSION_LABELS, RoleInputSchema, type Account, type AccountInput, type Page, type Permission, type Role, type SessionUser } from "@lyne/shared";
import { api } from "../api.js";
import { ConfirmAction, ErrorMessage, Modal, Pagination, useDebounced, useLoad } from "./common.js";
import "./personnel.css";

export function Accounts({ user, refresh }: { user: SessionUser; refresh: number }) {
  const [search, setSearch] = useState(""); const query = useDebounced(search); const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const list = useLoad<Page<Account>>(`/users?search=${encodeURIComponent(query)}&page=${page}&pageSize=12`, refresh + revision);
  const [selected, setSelected] = useState<Account | "new" | null>(null); const [reset, setReset] = useState<Account | null>(null);
  const [secret, setSecret] = useState<{ username: string; password: string } | null>(null);
  const can = (p: string) => user.permissions.includes(p);
  return <><div className="module-intro"><p>Des accès nominatifs et maîtrisés.<br /><span>Désactiver un compte révoque immédiatement ses sessions.</span></p>{can("users.write") && can("roles.read") && <button className="primary" onClick={() => setSelected("new")}>+ Créer un compte</button>}</div>
    <label className="search-field">Rechercher un compte<input type="search" value={search} maxLength={100} placeholder="Nom, identifiant ou e-mail" onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
    <ErrorMessage message={list.error} />{list.loading ? <p role="status">Chargement des comptes…</p> : list.data && <><div className="table-wrap"><table><caption>Les comptes ne sont jamais supprimés physiquement.</caption><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Fiche associée</th><th>Actions</th></tr></thead><tbody>
      {list.data.items.map(account => <tr key={account.id}><td><strong>{account.displayName}</strong><small>{account.username}{account.id === user.id ? " · Vous" : ""}</small></td><td>{account.role.name}</td><td><span className={`badge ${account.isActive ? "" : "inactive"}`}>{account.isActive ? "Actif" : "Désactivé"}</span>{account.mustChangePassword && <small>Mot de passe à changer</small>}</td><td>{account.employee?.fullName ?? "Aucune"}</td><td><div className="row-actions">
        {can("users.write") && can("roles.read") && <button className="secondary" onClick={() => setSelected(account)}>Modifier</button>}{can("users.reset") && account.id !== user.id && <button className="text-button" onClick={() => setReset(account)}>Réinitialiser</button>}</div></td></tr>)}
    </tbody></table>{!list.data.total && <p className="empty">Aucun compte correspondant à cette recherche.</p>}</div><Pagination data={list.data} page={page} onPage={setPage} /></>}
    {selected && <AccountEditor key={selected === "new" ? "new" : selected.id} account={selected === "new" ? null : selected} user={user} onClose={() => setSelected(null)} onSaved={(value, initialPassword) => {
      setSelected(null); setRevision(v => v + 1); if (initialPassword) setSecret({ username: value.username, password: initialPassword });
    }} />}
    {reset && <ConfirmAction title={`Réinitialiser ${reset.username} ?`} explanation="Un nouveau mot de passe provisoire sera généré. Toutes les sessions de ce compte seront révoquées et un changement sera obligatoire à la prochaine connexion."
      label="Réinitialiser le mot de passe" onClose={() => setReset(null)} onConfirm={async () => {
        const result = await api<{ initialPassword: string }>(`/users/${reset.id}/reset-password`, { version: reset.version }); setSecret({ username: reset.username, password: result.initialPassword }); setRevision(v => v + 1);
      }} />}
    {secret && <Modal title="Mot de passe provisoire" onClose={() => setSecret(null)}><p>Compte : <strong>{secret.username}</strong></p><p>Transmettez ce mot de passe uniquement à son titulaire, par un canal privé. Il devra le changer à sa première connexion.</p>
      <label>Mot de passe affiché une seule fois<input className="one-time-secret" readOnly value={secret.password} autoComplete="off" onFocus={e => e.target.select()} /></label><p className="muted">Il ne sera plus consultable après fermeture. Si nécessaire, vous pourrez en générer un autre.</p><div className="form-actions"><button className="primary" onClick={() => setSecret(null)}>J’ai conservé le mot de passe · Fermer</button></div></Modal>}
  </>;
}
function AccountEditor({ account, user, onClose, onSaved }: { account: Account | null; user: SessionUser; onClose: () => void; onSaved: (account: Account, password?: string) => void }) {
  const [draft, setDraft] = useState<AccountInput>(() => account ? { username: account.username, email: account.email, displayName: account.displayName, roleCode: account.role.code, isActive: account.isActive } : { username: "", email: null, displayName: "", roleCode: "", isActive: true });
  const roles = useLoad<Role[]>("/roles", 0); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const own = account?.id === user.id;
  async function save() {
    if (busy) return; const parsed = AccountInputSchema.safeParse(draft);
    if (!parsed.success) { setError("Vérifiez le nom, le rôle, l’e-mail et l’identifiant (3 caractères minimum : lettres minuscules, chiffres, point, tiret ou underscore)."); return; }
    setError(""); setBusy(true);
    try { const result = await api<{ account: Account; initialPassword?: string }>(account ? `/users/${account.id}` : "/users", { ...parsed.data, ...(account ? { version: account.version } : {}) }, account ? "PATCH" : "POST"); onSaved(result.account, result.initialPassword); }
    catch (err) { setError((err as Error).message); throw err; } finally { setBusy(false); }
  }
  return <Modal title={account ? `Compte ${account.username}` : "Créer un compte"} onClose={onClose} busy={busy}><p className="muted">Un compte peut être associé à une fiche depuis « Personnel ». La création génère un mot de passe provisoire.</p><ErrorMessage message={error || roles.error} />
    <form onSubmit={event => { event.preventDefault(); if (account && (account.role.code !== draft.roleCode || account.isActive !== draft.isActive || account.username !== draft.username)) setConfirm(true); else void save().catch(() => {}); }}><fieldset disabled={busy} className="form-grid">
      <label>Nom affiché *<input required minLength={2} maxLength={150} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} autoFocus /></label>
      <label>Identifiant *<input required minLength={3} maxLength={100} pattern="[a-z0-9._\-]+" value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value.toLowerCase() })} autoCapitalize="none" /></label>
      <label>E-mail<input type="email" maxLength={191} value={draft.email ?? ""} onChange={e => setDraft({ ...draft, email: e.target.value || null })} /></label>
      <label>Rôle *<select required disabled={own || roles.loading} value={draft.roleCode} onChange={e => setDraft({ ...draft, roleCode: e.target.value })}><option value="">Choisir un rôle</option>{roles.data?.filter(r => r.code === draft.roleCode || (r.code !== "ADMIN" || user.role.code === "ADMIN") && r.permissions.every(p => user.permissions.includes(p))).map(r => <option value={r.code} key={r.id}>{r.name}</option>)}</select></label>
      <label className="check-row full-width"><input type="checkbox" disabled={own} checked={draft.isActive} onChange={e => setDraft({ ...draft, isActive: e.target.checked })} />Compte actif · connexion autorisée</label>
    </fieldset>{own && <p className="muted">Vous ne pouvez pas désactiver ou changer le rôle de votre propre compte.</p>}<div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Annuler</button><button className="primary" disabled={busy || roles.loading}>{busy ? "Enregistrement…" : account ? "Enregistrer" : "Créer et générer le mot de passe"}</button></div></form>
    {confirm && <ConfirmAction title="Modifier les accès ?" explanation="Les sessions de ce compte seront déconnectées. Son nouveau rôle et son statut prendront effet immédiatement." label="Confirmer la modification" onClose={() => setConfirm(false)} onConfirm={save} />}
  </Modal>;
}
export function Roles({ user, refresh }: { user: SessionUser; refresh: number }) {
  const [revision, setRevision] = useState(0); const list = useLoad<Role[]>("/roles", refresh + revision); const [selected, setSelected] = useState<Role | "new" | null>(null);
  const writable = user.role.code === "ADMIN" && user.permissions.includes("roles.write");
  return <><div className="module-intro"><p>Un rôle, des permissions explicites.<br /><span>Les changements d’accès déconnectent les comptes concernés.</span></p>{writable && <button className="primary" onClick={() => setSelected("new")}>+ Créer un rôle</button>}</div><ErrorMessage message={list.error} />
    {list.loading ? <p role="status">Chargement des rôles…</p> : <div className="role-grid">{list.data?.map(role => <article className="card" key={role.id}><p className="eyebrow">{role.code} · {role.userCount} COMPTE(S)</p><h2>{role.name}</h2>
      <ul className="permission-list">{role.permissions.map(p => <li key={p}>{PERMISSION_LABELS[p as Permission] ?? p}</li>)}</ul>{!role.permissions.length && <p className="muted">Aucune permission attribuée.</p>}{role.code === "ADMIN" && <p className="muted">Rôle propriétaire protégé : tous les droits sont conservés.</p>}
      {writable && <button className="secondary" onClick={() => setSelected(role)}>Configurer le rôle</button>}</article>)}</div>}
    {selected && <RoleEditor role={selected === "new" ? null : selected} user={user} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setRevision(v => v + 1); }} />}
  </>;
}
function RoleEditor({ role, user, onClose, onSaved }: { role: Role | null; user: SessionUser; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(role?.code ?? ""); const [name, setName] = useState(role?.name ?? ""); const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  async function save() {
    if (busy) return;
    const parsed = RoleInputSchema.safeParse({ code, name, permissions });
    if (!parsed.success) { setError("Nom et code requis (code : lettres, chiffres et underscore, 2 caractères minimum)."); return; }
    setBusy(true); setError("");
    try { await api(role ? `/roles/${role.id}` : "/roles", { ...parsed.data, ...(role ? { version: role.version } : {}) }, role ? "PATCH" : "POST"); onSaved(); }
    catch (err) { setError((err as Error).message); throw err; } finally { setBusy(false); }
  }
  return <Modal title={role ? `Rôle ${role.name}` : "Créer un rôle"} onClose={onClose} busy={busy}><ErrorMessage message={error} /><form onSubmit={e => { e.preventDefault(); if (role && [...permissions].sort().join() !== [...role.permissions].sort().join()) setConfirm(true); else void save().catch(() => {}); }}>
    <fieldset className="form-grid" disabled={busy}><label>Code stable *<input required minLength={2} maxLength={50} disabled={Boolean(role)} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="RESSOURCES_HUMAINES" /></label><label>Nom du rôle *<input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
      <div className="full-width permission-picker"><p>Permissions</p>{Object.entries(PERMISSION_LABELS).map(([p, label]) => <label className="check-row" key={p}><input type="checkbox" checked={permissions.includes(p)} disabled={role?.code === "ADMIN" || !user.permissions.includes(p) || (p === "roles.write" && role?.code !== "ADMIN")}
        onChange={e => setPermissions(values => e.target.checked ? [...values, p] : values.filter(v => v !== p))} /><span>{label}{p === "roles.write" && <small>Réservé au propriétaire ADMIN</small>}</span></label>)}</div>
    </fieldset><p className="muted">Pour utiliser les fonctions d’écriture, accordez aussi la consultation du module. La gestion des comptes nécessite « Consulter les rôles ». Le salaire reste protégé par son droit dédié.</p>
    <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer le rôle</button></div></form>
    {confirm && <ConfirmAction title="Appliquer ces permissions ?" explanation={`Les sessions des ${role?.userCount ?? 0} compte(s) de ce rôle seront révoquées. Ils devront se reconnecter pour continuer.`} label="Appliquer et révoquer les sessions" onClose={() => setConfirm(false)} onConfirm={save} />}
  </Modal>;
}
