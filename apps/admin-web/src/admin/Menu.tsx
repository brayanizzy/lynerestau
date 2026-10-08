import { useEffect, useState, type FormEvent } from "react";
import { MenuItemInputSchema, type MenuCategory, type MenuItem, type MenuItemInput, type MenuPriceHistory, type Page, type SessionUser } from "@lyne/shared";
import { api, apiBase } from "../api.js";
import { ErrorMessage, Modal, Pagination, useDebounced, useLoad } from "./common.js";
import "./personnel.css";
import "./menu.css";

const initial: MenuItemInput = { code: "", name: "", categoryId: "", description: "", price: "", isActive: true, isAvailable: true };
const draftOf = (item: MenuItem): MenuItemInput => ({ code: item.code, name: item.name, categoryId: item.categoryId,
  description: item.description, price: item.price, isActive: item.isActive, isAvailable: item.isAvailable });
const money = (value: string) => `${value.replace(".", ",")} USD`;
const availability = (item: MenuItem) => !item.isActive ? "Désactivé" : !item.category.isActive ? "Catégorie désactivée" : item.isAvailable ? "Disponible" : "Indisponible";

export function Menu({ user, refresh }: { user: SessionUser; refresh: number }) {
  const [search, setSearch] = useState(""); const query = useDebounced(search);
  const [categoryId, setCategoryId] = useState(""); const [status, setStatus] = useState("active");
  const [stock, setStock] = useState("all"); const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<MenuItem | "new" | null>(null); const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [error, setError] = useState(""); const [opening, setOpening] = useState(false);
  const canWrite = user.permissions.includes("menu.write");
  const categories = useLoad<MenuCategory[]>("/menu/categories", revision + refresh);
  const list = useLoad<Page<MenuItem>>(`/menu/items?${new URLSearchParams({ search: query, status, availability: stock, page: String(page), pageSize: "12", ...(categoryId ? { categoryId } : {}) })}`, revision + refresh);
  useEffect(() => {
    if (!list.loading && list.data) {
      const last = Math.max(1, Math.ceil(list.data.total / list.data.pageSize)); if (page > last) setPage(last);
    }
  }, [list.loading, list.data, page]);
  async function open(id: string) {
    setOpening(true); setError("");
    try { setSelected(await api<MenuItem>(`/menu/items/${id}`)); } catch (err) { setError((err as Error).message); } finally { setOpening(false); }
  }
  return <div className="menu-module">
    <div className="module-intro"><p>La carte du restaurant.<br /><span>Prix en USD · disponibilité mise à jour par l’équipe.</span></p>
      {canWrite && <div className="menu-actions"><button className="secondary" onClick={() => setCategoriesOpen(true)}>Gérer les catégories</button>
        <button className="primary" disabled={!categories.data?.some(c => c.isActive)} onClick={() => setSelected("new")}>+ Ajouter un produit</button></div>}</div>
    <div className="filters"><label>Rechercher un produit<input type="search" value={search} placeholder="Nom ou code" maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <label>Catégorie<select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}><option value="">Toutes les catégories</option>{categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}{!c.isActive ? " · désactivée" : ""}</option>)}</select></label>
      <label>Disponibilité<select value={stock} onChange={e => { setStock(e.target.value); setPage(1); }}><option value="all">Toutes</option><option value="available">Disponibles à la vente</option><option value="unavailable">Indisponibles à la vente</option></select></label>
      <label>Statut du produit<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="active">Actifs</option><option value="inactive">Désactivés</option><option value="all">Tous les produits</option></select></label></div>
    <ErrorMessage message={error || list.error || categories.error} />
    {list.loading ? <p role="status">Chargement du catalogue…</p> : list.data && <>
      <div className="menu-grid">{list.data.items.map(item => <article className="menu-product" key={item.id}>
        {item.photoUrl ? <img src={`${apiBase}${item.photoUrl}`} alt={item.name} loading="lazy" /> : <div className="menu-photo-placeholder" aria-hidden="true">LYNE<span>À LA CARTE</span></div>}
        <div className="menu-product-content"><p className="eyebrow">{item.category.name} · {item.code}</p><h2>{item.name}</h2>
          <p className="menu-description">{item.description || "Description à venir."}</p><div className="menu-product-meta"><strong>{money(item.price)}</strong><span className={`badge ${item.sellable ? "" : "inactive"}`}>{availability(item)}</span></div>
          <button className="secondary" disabled={opening} onClick={() => void open(item.id)} aria-label={`Ouvrir le produit ${item.name}`}>Voir le produit ↗</button></div></article>)}</div>
      {!list.data.total && <div className="empty-state"><h2>Aucun produit à afficher</h2><p>{canWrite && !categories.data?.some(c => c.isActive) ? "Créez une catégorie active pour ajouter vos premiers produits." : "Ajoutez un produit ou ajustez les filtres du catalogue."}</p></div>}
      <Pagination data={list.data} page={page} onPage={setPage} /></>}
    {categoriesOpen && <Categories onClose={() => setCategoriesOpen(false)} onSaved={() => setRevision(v => v + 1)} />}
    {selected && categories.data && <ItemEditor key={selected === "new" ? "new" : selected.id} item={selected === "new" ? null : selected} categories={categories.data} user={user}
      onClose={() => setSelected(null)} onSaved={value => { setSelected(value); setRevision(v => v + 1); }} />}
  </div>;
}
function Categories({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [revision, setRevision] = useState(0); const list = useLoad<MenuCategory[]>("/menu/categories", revision);
  const [selected, setSelected] = useState<MenuCategory | null>(null); const [name, setName] = useState(""); const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (selected?.isActive && !active && !window.confirm("Désactiver cette catégorie rend tous ses produits indisponibles à la vente. Continuer ?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(selected ? `/menu/categories/${selected.id}` : "/menu/categories", { name, isActive: active, ...(selected ? { version: selected.version } : {}) }, selected ? "PATCH" : "POST");
      setSelected(null); setName(""); setActive(true); setRevision(v => v + 1); onSaved(); setNotice("Catégorie enregistrée.");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="Catégories du menu" onClose={onClose} busy={busy}><ErrorMessage message={error || list.error} />{notice && <p role="status">{notice}</p>}
    <form onSubmit={save} className="employee-form"><label>Nom de la catégorie<input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} disabled={busy} />Catégorie active</label>
      <div className="form-actions">{selected && <button type="button" className="secondary" disabled={busy} onClick={() => { setSelected(null); setName(""); setActive(true); }}>Nouvelle catégorie</button>}
        <button className="primary" disabled={busy}>{selected ? "Enregistrer la catégorie" : "Créer la catégorie"}</button></div></form>
    {list.loading ? <p role="status">Chargement…</p> : <ul className="menu-category-list">{list.data?.map(c => <li key={c.id}><span>{c.name}<small>{c.isActive ? "Active" : "Désactivée"}</small></span>
      <button className="secondary" disabled={busy} onClick={() => { setSelected(c); setName(c.name); setActive(c.isActive); setError(""); setNotice(""); }} aria-label={`Modifier la catégorie ${c.name}`}>Modifier</button></li>)}</ul>}
  </Modal>;
}
function ItemEditor({ item, categories, user, onClose, onSaved }: { item: MenuItem | null; categories: MenuCategory[]; user: SessionUser; onClose: () => void; onSaved: (item: MenuItem) => void }) {
  const [draft, setDraft] = useState<MenuItemInput>(() => item ? draftOf(item) : { ...initial, categoryId: categories.find(c => c.isActive)?.id ?? "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [history, setHistory] = useState(false);
  const editable = user.permissions.includes("menu.write");
  const field = <K extends keyof MenuItemInput>(key: K, value: MenuItemInput[K]) => setDraft(v => ({ ...v, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(""); setNotice("");
    const parsed = MenuItemInputSchema.safeParse(draft);
    if (!parsed.success) { setError("Vérifiez le code, le nom, la catégorie et le prix (deux décimales maximum, point décimal)."); return; }
    if (item?.isActive && !draft.isActive && !window.confirm("Désactiver ce produit ? Il restera dans l’historique et ne sera plus disponible à la vente.")) return;
    setBusy(true);
    try { const saved = await api<MenuItem>(item ? `/menu/items/${item.id}` : "/menu/items", { ...parsed.data, ...(item ? { version: item.version } : {}) }, item ? "PATCH" : "POST");
      onSaved(saved); setDraft(draftOf(saved)); setNotice("Produit enregistré. Les changements de prix sont conservés.");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function operation(action: () => Promise<MenuItem>, message: string, resetDraft = false) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try { const saved = await action(); onSaved(saved); if (resetDraft) setDraft(draftOf(saved)); setNotice(message); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !item || busy) return;
    if (file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Photo JPEG, PNG ou WebP de 2 Mo maximum."); return; }
    await operation(async () => {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]!); reader.onerror = () => reject(new Error("Lecture de la photo impossible.")); reader.readAsDataURL(file); });
      return api<MenuItem>(`/menu/items/${item.id}/photo`, { version: item.version, data });
    }, "Photo enregistrée. Les autres champs ne sont pas enregistrés.");
  }
  return <Modal title={item?.name ?? "Ajouter un produit"} onClose={onClose} busy={busy}>
    <ErrorMessage message={error} />{notice && <p role="status">{notice}</p>}
    {item && <div className="menu-detail-top">{item.photoUrl && <img src={`${apiBase}${item.photoUrl}`} alt={item.name} />}<p><strong>{money(item.price)}</strong><br />{availability(item)}</p></div>}
    <form onSubmit={save} className="employee-form"><div className="form-grid">
      <label>Code produit *<input required maxLength={30} value={draft.code} disabled={!editable || busy} onChange={e => field("code", e.target.value)} /></label>
      <label>Nom du produit *<input required minLength={2} maxLength={150} value={draft.name} disabled={!editable || busy} onChange={e => field("name", e.target.value)} /></label>
      <label>Catégorie du produit *<select required value={draft.categoryId} disabled={!editable || busy} onChange={e => field("categoryId", e.target.value)}>
        {categories.filter(c => c.isActive || c.id === draft.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " · désactivée"}</option>)}</select></label>
      <label>Prix (USD) *<input required inputMode="decimal" value={draft.price} disabled={!editable || busy} onChange={e => field("price", e.target.value.replace(",", "."))} /></label>
    </div><label>Description<textarea maxLength={2000} value={draft.description ?? ""} disabled={!editable || busy} onChange={e => field("description", e.target.value)} /></label>
      <div className="menu-actions"><label className="checkbox-label"><input type="checkbox" checked={draft.isActive} disabled={!editable || busy} onChange={e => field("isActive", e.target.checked)} />Produit actif</label>
        <label className="checkbox-label"><input type="checkbox" checked={draft.isAvailable} disabled={!editable || busy} onChange={e => field("isAvailable", e.target.checked)} />Disponible</label></div>
      <div className="form-actions">{editable && <button className="primary" disabled={busy}>Enregistrer le produit</button>}
        {item && <button type="button" className="secondary" disabled={busy} onClick={() => void operation(() => api<MenuItem>(`/menu/items/${item.id}`), "Fiche actualisée.", true)}>Recharger la fiche</button>}</div>
    </form>
    {item && <div className="menu-detail-actions">
      {user.permissions.includes("menu.availability") && <button className="secondary" disabled={busy} onClick={() => void operation(async () => {
        const saved = await api<MenuItem>(`/menu/items/${item.id}/availability`, { version: item.version, isAvailable: !item.isAvailable }); field("isAvailable", saved.isAvailable); return saved;
      }, "Disponibilité mise à jour.")}>{item.isAvailable ? "Marquer indisponible" : "Marquer disponible"}</button>}
      {editable && <><label>Photo du produit (2 Mo maximum)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {item.photoUrl && <button className="secondary" disabled={busy} onClick={() => { if (window.confirm("Retirer la photo du produit ?")) void operation(() => api<MenuItem>(`/menu/items/${item.id}/photo/remove`, { version: item.version }), "Photo retirée."); }}>Retirer la photo</button>}</>}
      <button className="secondary" disabled={busy} onClick={() => setHistory(v => !v)}>{history ? "Masquer" : "Voir"} l’historique des prix</button>
      {history && <Prices id={item.id} revision={item.version} />}
    </div>}
  </Modal>;
}
function Prices({ id, revision }: { id: string; revision: number }) {
  const [page, setPage] = useState(1); const list = useLoad<Page<MenuPriceHistory>>(`/menu/items/${id}/prices?page=${page}&pageSize=10`, revision);
  return <section aria-label="Historique des prix"><h3>Historique des prix</h3><ErrorMessage message={list.error} />
    {list.loading ? <p role="status">Chargement…</p> : list.data && <><ul className="menu-price-history">{list.data.items.map(p => <li key={p.id}><strong>{p.previousPrice === null ? "Prix initial" : money(p.previousPrice)} → {money(p.price)}</strong><span>{new Date(p.createdAt).toLocaleString("fr-FR")} · {p.actor.displayName}</span></li>)}</ul><Pagination data={list.data} page={page} onPage={setPage} /></>}
  </section>;
}
