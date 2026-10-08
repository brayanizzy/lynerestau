import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Link } from "expo-router";
import { EMPLOYEE_STATUS_LABELS, type Employee, type Page } from "@lyne/shared";
import { useAuth } from "../../auth";
import { Button, Choice, Field, Message, Screen, s } from "../../personnel/ui";
export default function Personnel() {
  const { api, session } = useAuth();
  const permissions = session?.user.permissions ?? [];
  const allowed = permissions.includes("employees.read") && !session?.user.mustChangePassword;
  const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [archive, setArchive] = useState("current"); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Employee> | null>(null); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  const load = useCallback(async () => api<Page<Employee>>(`/employees?${new URLSearchParams({ search: query, archive, page: String(page), pageSize: "20", ...(status ? { status } : {}) })}`), [api, query, archive, page, status]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void load().then(value => { if (active) setResult(value); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, load, revision]);
  function refresh() { setLoading(true); setError(""); setResult(null); }
  return <Screen title="Personnel">
    {permissions.includes("employees.write") && <Link href="/personnel/new" style={s.back}>+ Nouvelle fiche</Link>}
    {permissions.includes("references.write") && <Link href="/personnel/references" style={s.back}>Gérer les fonctions et services →</Link>}
    <Field label="Rechercher un nom ou un matricule" value={search} onChangeText={setSearch} maxLength={100} returnKeyType="search" onSubmitEditing={() => { refresh(); setPage(1); setQuery(search.trim()); setRevision(value => value + 1); }} />
    <Button label="Rechercher" onPress={() => { refresh(); setPage(1); setQuery(search.trim()); setRevision(value => value + 1); }} disabled={loading} />
    <Choice label="Fiches" value={archive} options={[{ value: "current", label: "Courantes" }, { value: "archived", label: "Archivées" }, { value: "all", label: "Toutes" }]} onChange={value => { refresh(); setPage(1); setArchive(value); }} />
    <Choice label="Statut" value={status} options={[{ value: "", label: "Tous" }, ...Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => ({ value, label }))]} onChange={value => { refresh(); setPage(1); setStatus(value); }} />
    <Message text={error} />{loading && <ActivityIndicator accessibilityLabel="Chargement des fiches" />}
    {result && <><Text style={s.muted}>{result.total} fiche(s)</Text>{result.items.map(employee => <View key={employee.id} style={s.card}>
      <Text style={s.heading}>{employee.fullName}</Text><Text style={s.body}>{employee.staffNumber} · {EMPLOYEE_STATUS_LABELS[employee.status]}{employee.archivedAt ? " · Archivé" : ""}</Text>
      <Text style={s.muted}>{employee.jobTitle?.name ?? "Fonction non renseignée"} · {employee.department?.name ?? "Service non renseigné"}</Text>
      <Link href={{ pathname: "/personnel/[id]", params: { id: employee.id } }} style={s.back}>Ouvrir la fiche →</Link>
    </View>)}{!result.items.length && <Text style={s.body}>Aucune fiche ne correspond à cette recherche.</Text>}
      <View style={s.row}><Button label="Précédent" secondary disabled={loading || page === 1} onPress={() => { refresh(); setPage(value => value - 1); }} /><Text style={s.body}>Page {page}</Text><Button label="Suivant" secondary disabled={loading || page * result.pageSize >= result.total} onPress={() => { refresh(); setPage(value => value + 1); }} /></View></>}
    <Button label="Actualiser" secondary disabled={loading} onPress={() => { refresh(); setRevision(value => value + 1); }} />
  </Screen>;
}
