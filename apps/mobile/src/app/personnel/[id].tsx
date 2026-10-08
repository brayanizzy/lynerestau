import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { EmployeeInputSchema, EMPLOYEE_STATUS_LABELS, type Account, type Employee, type EmployeeInput, type Page, type Reference } from "@lyne/shared";
import { useAuth } from "../../auth";
import { employeeDraft } from "../../personnel/model";
import { Button, Choice, Field, Message, Screen, s } from "../../personnel/ui";
type References = { departments: Reference[]; jobTitles: Reference[] };
export default function EmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmployeeForm key={id} id={id} />;
}
function EmployeeForm({ id }: { id: string }) {
  const { api, photo, session } = useAuth();
  const permissions = session?.user.permissions;
  const allowed = Boolean(permissions?.includes("employees.read") && !session?.user.mustChangePassword);
  const creating = id === "new";
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [draft, setDraft] = useState<EmployeeInput>(() => employeeDraft(null, []));
  const [refs, setRefs] = useState<References>({ departments: [], jobTitles: [] });
  const [picture, setPicture] = useState<{ version: number; data: string } | null>(null);
  const image = employee?.photoUrl && picture?.version === employee.version ? picture.data : null; const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [reason, setReason] = useState(""); const [confirm, setConfirm] = useState<"archive" | "restore" | "remove-photo" | null>(null);
  const [accountSearch, setAccountSearch] = useState(""); const [accounts, setAccounts] = useState<Account[]>([]);
  const [revision, setRevision] = useState(0);
  const canWrite = Boolean(permissions?.includes("employees.write") && !employee?.archivedAt);
  const editable = canWrite && !busy;
  const load = useCallback(async () => {
    const [references, record] = await Promise.all([api<References>("/personnel-references"), creating ? Promise.resolve(null) : api<Employee>(`/employees/${encodeURIComponent(id)}`)]);
    return { references, record };
  }, [api, creating, id]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void load().then(({ references, record }) => {
      if (active) { setRefs(references); setEmployee(record); setDraft(employeeDraft(record, permissions ?? [])); }
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, load, revision, permissions]);
  useEffect(() => {
    let active = true;
    if (employee?.photoUrl) void photo(employee.id, employee.version).then(value => { if (active) setPicture({ version: employee.version, data: value }); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [employee, photo]);
  function reload() { setLoading(true); setError(""); setEmployee(null); setPicture(null); setAccounts([]); setConfirm(null); setRevision(value => value + 1); }
  function field<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) { setDraft(current => ({ ...current, [key]: value })); setNotice(""); }
  async function action(run: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await run(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    await action(async () => {
      const parsed = EmployeeInputSchema.safeParse(draft);
      if (!parsed.success) throw new Error(`Vérifiez ${parsed.error.issues.map(issue => issue.path.join(".")).join(", ")} (date : AAAA-MM-JJ, salaire : montant USD).`);
      const value = await api<Employee>(creating ? "/employees" : `/employees/${id}`, { ...parsed.data, ...(!creating ? { version: employee!.version } : {}) }, creating ? "POST" : "PATCH");
      if (creating) router.replace({ pathname: "/personnel/[id]", params: { id: value.id } });
      else { setEmployee(value); setDraft(employeeDraft(value, permissions ?? [])); setNotice("Fiche enregistrée."); }
    });
  }
  async function choosePhoto() {
    await action(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: .8, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 2796204) throw new Error("Choisissez une photo de moins de 2 Mo.");
      if (asset.width * asset.height > 16000000) throw new Error("Choisissez une photo de moins de 16 mégapixels.");
      const value = await api<Employee>(`/employees/${id}/photo`, { version: employee!.version, data: asset.base64 });
      setEmployee(value); setNotice("Photo enregistrée. Les modifications du formulaire restent à enregistrer.");
    });
  }
  async function confirmAction() {
    await action(async () => {
      if (!confirm || !employee) return;
      if (confirm !== "remove-photo" && reason.trim().length < 3) throw new Error("Indiquez un motif d’au moins 3 caractères.");
      const value = await api<Employee>(`/employees/${id}/${confirm === "remove-photo" ? "photo/remove" : confirm}`, { version: employee.version, ...(confirm === "remove-photo" ? {} : { reason: reason.trim() }) });
      setEmployee(value); setDraft(employeeDraft(value, permissions ?? [])); setConfirm(null); setReason(""); setNotice("Opération enregistrée.");
    });
  }
  const referenceOptions = (items: Reference[], selected: string | null) => [{ value: "", label: "Non renseigné" }, ...items.filter(item => item.isActive || item.id === selected).map(item => ({ value: item.id, label: item.name + (item.isActive ? "" : " (désactivé)"), disabled: !item.isActive }))];
  return <Screen title={creating ? "Nouvelle fiche" : "Fiche du personnel"}>
    <Link href="/personnel" style={s.back}>← Liste du personnel</Link><Message text={error} /><Message text={notice} success />
    {loading ? <ActivityIndicator accessibilityLabel="Chargement de la fiche" /> : !creating && !employee ? <Button label="Réessayer" onPress={reload} /> : <>
      {employee?.archivedAt && <Text style={s.message}>Fiche archivée : {employee.archiveReason}. Le compte associé conserve son état.</Text>}
      <View style={s.card}>
        <Field label="Matricule *" value={draft.staffNumber} onChangeText={value => field("staffNumber", value)} editable={editable} autoCapitalize="characters" maxLength={30} />
        <Field label="Nom complet *" value={draft.fullName} onChangeText={value => field("fullName", value)} editable={editable} maxLength={150} />
        <Choice label="Genre" value={draft.gender ?? ""} options={[{ value: "", label: "Non renseigné" }, { value: "FEMALE", label: "Femme" }, { value: "MALE", label: "Homme" }, { value: "OTHER", label: "Autre" }]} disabled={!editable} onChange={value => field("gender", (value || null) as EmployeeInput["gender"])} />
        <Field label="Téléphone" value={draft.phone ?? ""} onChangeText={value => field("phone", value || null)} editable={editable} keyboardType="phone-pad" maxLength={40} />
        <Field label="Adresse" value={draft.address ?? ""} onChangeText={value => field("address", value || null)} editable={editable} multiline maxLength={500} />
        <Field label="Date d’embauche (AAAA-MM-JJ)" value={draft.hiredAt ?? ""} onChangeText={value => field("hiredAt", value || null)} editable={editable} maxLength={10} placeholder="2026-10-08" />
        <Choice label="Statut" value={draft.status} options={Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => ({ value, label }))} disabled={!editable} onChange={value => field("status", value as EmployeeInput["status"])} />
        <Choice label="Service" value={draft.departmentId ?? ""} options={referenceOptions(refs.departments, draft.departmentId)} disabled={!editable} onChange={value => field("departmentId", value || null)} />
        <Choice label="Fonction" value={draft.jobTitleId ?? ""} options={referenceOptions(refs.jobTitles, draft.jobTitleId)} disabled={!editable} onChange={value => field("jobTitleId", value || null)} />
        {permissions?.includes("employees.salary") && <Field label="Salaire (USD, confidentiel)" value={draft.salary ?? ""} onChangeText={value => field("salary", value.replace(",", ".") || null)} editable={editable} keyboardType="decimal-pad" maxLength={13} />}
        <Field label="Notes internes" value={draft.notes ?? ""} onChangeText={value => field("notes", value || null)} editable={editable} multiline maxLength={2000} />
        <Text style={s.body}>Compte associé : {employee?.user?.username ?? "Aucun"}</Text>
        {permissions?.includes("users.read") && permissions.includes("users.write") && canWrite && <>
          <Field label="Rechercher un compte existant" value={accountSearch} onChangeText={setAccountSearch} maxLength={100} editable={!busy} autoCapitalize="none" />
          <Button label="Rechercher les comptes" secondary disabled={busy} onPress={() => void action(async () => { const result = await api<Page<Account>>(`/users?search=${encodeURIComponent(accountSearch.trim())}&pageSize=20`); setAccounts(result.items); setNotice(`${result.total} compte(s), 20 résultats maximum. Affinez la recherche si nécessaire.`); })} />
          <Choice label="Association à enregistrer" value={draft.userId ?? ""} options={[{ value: "", label: "Aucun compte" }, ...(employee?.user && !accounts.some(a => a.id === employee.userId) ? [{ value: employee.user.id, label: employee.user.username }] : []), ...accounts.map(account => ({ value: account.id, label: `${account.username}${account.isActive ? "" : " (désactivé)"}`, disabled: Boolean(account.employee && account.employee.id !== id) }))]} onChange={value => field("userId", value || null)} disabled={busy} />
          <Text style={s.muted}>Les comptes et les rôles se créent dans l’administration web.</Text>
        </>}
        {canWrite && <Button label={busy ? "Enregistrement…" : "Enregistrer la fiche"} disabled={busy} onPress={() => void save()} />}
      </View>
      {employee && <View style={s.card}><Text style={s.heading}>Photo et carte de service</Text>{image ? <Image source={{ uri: image }} style={s.photo} accessibilityLabel="Photo du personnel" /> : <Text style={s.body}>{employee.photoUrl ? "Photo indisponible ou en cours de chargement." : "Aucune photo."}</Text>}
        {canWrite && <><Button label="Choisir une photo" disabled={busy} onPress={() => void choosePhoto()} />{employee.photoUrl && <Button label="Retirer la photo" secondary disabled={busy} onPress={() => setConfirm("remove-photo")} />}</>}
        {permissions?.includes("employees.print") && !employee.archivedAt && employee.status === "ACTIVE" && <Link href={{ pathname: "/personnel/carte/[id]", params: { id } }} style={s.back}>Préparer la carte de service →</Link>}
      </View>}
      {employee && permissions?.includes("employees.archive") && <Button label={employee.archivedAt ? "Restaurer la fiche" : "Archiver la fiche"} secondary disabled={busy} onPress={() => setConfirm(employee.archivedAt ? "restore" : "archive")} />}
      {confirm && <View style={s.card}><Text style={s.heading}>Confirmer {confirm === "archive" ? "l’archivage" : confirm === "restore" ? "la restauration" : "le retrait de la photo"}</Text><Text style={s.body}>Les changements non enregistrés du formulaire seront abandonnés.</Text>
        {confirm !== "remove-photo" && <Field label="Motif obligatoire" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!busy} />}
        <Button label="Confirmer" disabled={busy} onPress={() => void confirmAction()} /><Button label="Annuler" secondary disabled={busy} onPress={() => setConfirm(null)} />
      </View>}
      <Button label="Recharger et abandonner les modifications" secondary disabled={busy} onPress={reload} />
    </>}
  </Screen>;
}
