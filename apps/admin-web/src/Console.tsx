import { useEffect, useState, type FormEvent } from "react";
import { PERMISSION_LABELS, type AuthSession, type Page, type Permission } from "@lyne/shared";
import { api, ApiFailure, apiBase } from "./api.js";
import { AuthPanel } from "./AuthPanel.js";
import { Personnel } from "./admin/Personnel.js";
import { References } from "./admin/References.js";
import { Accounts, Roles } from "./admin/Access.js";

type Tab = "home" | "employees" | "references" | "users" | "roles" | "audit";
type Audit = { id: string; action: string; createdAt: string; user: { displayName: string } | null; ipAddress: string | null };
const labels: Record<string, string> = { "auth.login.succeeded": "Connexion réussie", "auth.login.failed": "Connexion refusée", "auth.logout": "Déconnexion",
  "auth.password.changed": "Mot de passe modifié", "auth.password.failed": "Changement de mot de passe refusé", "system.admin.seeded": "Compte administrateur initialisé" };
Object.assign(labels, { "employee.created": "Fiche créée", "employee.updated": "Fiche modifiée", "employee.archived": "Fiche archivée", "employee.restored": "Fiche restaurée", "employee.photo.updated": "Photo modifiée", "employee.photo.detached": "Photo retirée", "employee.card.generated": "Carte consultée", "reference.created": "Référence créée", "reference.updated": "Référence modifiée", "account.created": "Compte créé", "account.updated": "Compte modifié", "account.password.reset": "Mot de passe réinitialisé", "role.created": "Rôle créé", "role.updated": "Rôle modifié" });

export function Console() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [changePassword, setChangePassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [tableBusy, setTableBusy] = useState(false);
  const [audit, setAudit] = useState<Page<Audit> | null>(null);

  useEffect(() => {
    let active = true;
    api<AuthSession>("/auth/me").then(value => { if (active) setSession(value); }).catch(err => {
      if (active && (!(err instanceof ApiFailure) || err.status !== 401)) setError((err as Error).message);
    }).finally(() => { if (active) setLoading(false); });
    const expired = () => { setSession(null); setChangePassword(false); setPassword(""); setNewPassword(""); setConfirmation(""); };
    window.addEventListener("lyne:session-expired", expired);
    return () => { active = false; window.removeEventListener("lyne:session-expired", expired); };
  }, []);
  useEffect(() => {
    if (!session) { setAudit(null); return; }
    if (tab !== "audit" || session.user.mustChangePassword) return;
    let active = true;
    setError(""); setTableBusy(true);
    const request = api<Page<Audit>>(`/audit-logs?page=${page}&pageSize=15`).then(v => { if (active) setAudit(v); });
    request.catch(err => { if (active) { setError((err as Error).message); if (err instanceof ApiFailure && err.status === 401) setSession(null); } })
      .finally(() => { if (active) setTableBusy(false); });
    return () => { active = false; };
  }, [session, tab, page, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(""); setNotice("");
    const changing = session && (session.user.mustChangePassword || changePassword);
    if (changing && newPassword !== confirmation) { setError("Les nouveaux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      if (changing) {
        const result = await api<{ message: string }>("/auth/password", { currentPassword: password, newPassword });
        setNotice(result.message); setSession(null); setChangePassword(false);
      } else { setSession(await api<AuthSession>("/auth/login", { identifier, password })); setTab("home"); }
    } catch (err) {
      setError((err as Error).message);
      if (changing && err instanceof ApiFailure && err.status === 401) setSession(null);
    } finally { setPassword(""); setNewPassword(""); setConfirmation(""); setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError("");
    try { await api("/auth/logout", {}); setSession(null); setChangePassword(false); setPassword(""); setNotice("Vous êtes déconnecté."); }
    catch (err) { if (err instanceof ApiFailure && err.status === 401) setSession(null); else setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const user = session?.user;
  const changing = Boolean(user && (user.mustChangePassword || changePassword));
  const can = (permission: string) => user?.permissions.includes(permission);
  const selectedPage = audit;
  function navigate(next: Tab) { setTab(next); setPage(1); setError(""); }

  return <div className={`app-shell${!user || changing ? " auth-shell" : ""}`}>
    {user && !changing && <header className="topbar"><a className="wordmark" href="/gestion/" aria-label="LYNE Restaurant, accueil">LYNE<span>RESTAURANT</span></a>
      <span className="environment">ESPACE INTERNE <i /> PHASE 02</span>
      {user && <button className="text-button" onClick={() => void logout()} disabled={busy}>Se déconnecter <span aria-hidden="true">↗</span></button>}
    </header>}
    {loading ? <main className="loading" role="status">Vérification de votre session…</main> : <>
      {(!user || changing) ? <AuthPanel key={changing ? "password" : "login"} changing={changing} mandatory={Boolean(user?.mustChangePassword)}
        busy={busy} error={error} notice={notice} identifier={identifier} password={password} newPassword={newPassword} confirmation={confirmation}
        onIdentifier={setIdentifier} onPassword={setPassword} onNewPassword={setNewPassword} onConfirmation={setConfirmation} onSubmit={submit}
        onCancel={() => { setChangePassword(false); setPassword(""); setError(""); }} onLogout={logout} /> : <main className="workspace">
        <aside className="sidebar"><p className="eyebrow">VOTRE ESPACE</p><nav aria-label="Navigation principale">
          {([ ["home", "Vue d’ensemble", true], ["employees", "Personnel", can("employees.read")], ["references", "Fonctions & services", can("employees.read")], ["users", "Comptes", can("users.read")], ["roles", "Rôles & accès", can("roles.read")], ["audit", "Journal d’audit", can("audit.read")] ] as const)
            .filter(([, , visible]) => visible).map(([key, label]) => <button key={key} className={tab === key ? "nav-active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => navigate(key)}>{label}<span aria-hidden="true">↗</span></button>)}
        </nav><div className="sidebar-note">Personnel & administration<br /><strong>Phase 2 · recette</strong><p>Fiches archivables, données et historique conservés.</p></div></aside>
        <section className="workspace-content"><div className="section-heading"><div><p className="eyebrow">LYNE RESTAURANT / {tab === "home" ? "ACCUEIL" : "ADMINISTRATION"}</p><h1>{tab === "home" ? `Bonjour, ${user.displayName}.` : tab === "employees" ? "Le personnel" : tab === "references" ? "Fonctions & services" : tab === "users" ? "Les comptes" : tab === "roles" ? "Rôles & accès" : "Journal d’audit"}</h1></div>
          {tab !== "home" && <button className="secondary" onClick={() => setRefresh(v => v + 1)} disabled={tableBusy}>Actualiser</button>}</div>
          {error && <p className="alert error" role="alert">{error}</p>}
          {tab === "home" ? <>
            <div className="welcome-panel"><span className="status-dot" /><span>SESSION AUTHENTIFIÉE</span><h2>Une équipe bien organisée.</h2><p>Gérez le personnel, les fonctions et les accès depuis votre espace sécurisé.</p></div>
            <div className="card-grid"><article className="card"><p className="eyebrow">VOTRE COMPTE</p><h2>{user.role.name}</h2><dl><dt>Identifiant</dt><dd>{user.username}</dd><dt>Session valable jusqu’à</dt><dd>{new Date(session!.expiresAt).toLocaleString("fr-FR")}</dd></dl><button className="secondary" onClick={() => { setChangePassword(true); setError(""); }}>Changer mon mot de passe</button></article>
              <article className="card"><p className="eyebrow">PERMISSIONS ACTUELLES</p><h2>Vos accès</h2>{user.permissions.length ? <ul className="permission-list">{user.permissions.map(p => <li key={p}><span aria-hidden="true">✓</span>{PERMISSION_LABELS[p as Permission] ?? p}</li>)}</ul> : <p>Votre compte est actif. Les accès opérationnels seront configurés lors des prochaines phases.</p>}
                {can("permissions.read") && <a className="documentation" href={`${apiBase}/api/docs/`} target="_blank" rel="noreferrer">Documentation API ↗</a>}</article></div>
          </> : tab === "employees" ? <Personnel user={user} refresh={refresh} /> : tab === "references" ? <References user={user} refresh={refresh} /> : tab === "users" ? <Accounts user={user} refresh={refresh} /> : tab === "roles" ? <Roles user={user} refresh={refresh} /> : tableBusy ? <p role="status">Chargement…</p> : <>
            <div className="table-wrap"><table><caption>Connexions et opérations du personnel — historique conservé</caption>
              {                <><thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>Adresse IP</th></tr></thead><tbody>{audit?.items.map(a => <tr key={a.id}><td>{new Date(a.createdAt).toLocaleString("fr-FR")}</td><td>{labels[a.action] ?? a.action}</td><td>{a.user?.displayName ?? "Non identifié"}</td><td>{a.ipAddress ?? "—"}</td></tr>)}</tbody></>}
            </table>{selectedPage?.total === 0 && <p className="empty">Aucun élément à afficher.</p>}</div>
            {selectedPage && <div className="pagination"><span>{selectedPage.total} élément(s) · page {page}</span><div><button className="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</button><button className="secondary" disabled={page * 15 >= selectedPage.total} onClick={() => setPage(p => p + 1)}>Suivant</button></div></div>}
          </>}
        </section>
      </main>}
    </>}
    {user && !changing && <footer className="page-footer"><span>LYNE RESTAURANT</span><span>Espace interne · Développement par phases</span></footer>}
  </div>;
}
