import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Link } from "expo-router";
import type { Reference } from "@lyne/shared";
import { useAuth } from "../../auth";
import { Button, Choice, Field, Message, Screen, s } from "../../personnel/ui";
export default function References() {
  const { api, session } = useAuth();
  const allowed = Boolean(session?.user.permissions.includes("references.write") && session.user.permissions.includes("employees.read") && !session.user.mustChangePassword);
  const [kind, setKind] = useState("departments"); const [items, setItems] = useState<Reference[]>([]);
  const [selected, setSelected] = useState<Reference | null>(null); const [name, setName] = useState(""); const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    void api<{ departments: Reference[]; jobTitles: Reference[] }>("/personnel-references").then(value => { if (current) setItems(kind === "departments" ? value.departments : value.jobTitles); }).catch(err => { if (current) setError(err.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [allowed, api, kind, revision]);
  function refresh() { setLoading(true); setItems([]); setError(""); }
  function reset() { setSelected(null); setName(""); setActive(true); }
  async function save() {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      if (name.trim().length < 2) throw new Error("Saisissez un nom d’au moins deux caractères.");
      await api(`/personnel-references/${kind}${selected ? `/${selected.id}` : ""}`, { name: name.trim(), isActive: active, ...(selected ? { version: selected.version } : {}) }, selected ? "PATCH" : "POST");
      reset(); refresh(); setRevision(value => value + 1); setNotice("Référence enregistrée.");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Screen title="Fonctions et services"><Link href="/personnel" style={s.back}>← Personnel</Link>
    {!allowed ? <Message text="Vous n’avez pas la permission de gérer les références." /> : <>
      <Choice label="Référentiel" value={kind} options={[{ value: "departments", label: "Services" }, { value: "job-titles", label: "Fonctions" }]} disabled={busy} onChange={value => { reset(); refresh(); setKind(value); setNotice(""); }} />
      <Message text={error} /><Message text={notice} success />{loading && <ActivityIndicator accessibilityLabel="Chargement des références" />}
      <View style={s.card}><Text style={s.heading}>{selected ? "Modifier" : "Ajouter"}</Text><Field label="Nom *" value={name} onChangeText={setName} maxLength={100} editable={!busy} />
        <Choice label="Disponible pour les nouvelles fiches" value={String(active)} options={[{ value: "true", label: "Oui" }, { value: "false", label: "Non" }]} disabled={busy} onChange={value => setActive(value === "true")} />
        <Button label="Enregistrer" disabled={busy} onPress={() => void save()} />{selected && <Button label="Annuler" secondary disabled={busy} onPress={reset} />}
      </View>
      {items.map(item => <View key={item.id} style={s.card}><Text style={s.heading}>{item.name}</Text><Text style={s.body}>{item.isActive ? "Disponible" : "Désactivé — conservé sur les fiches existantes"}</Text><Button label="Modifier" secondary disabled={busy} onPress={() => { setSelected(item); setName(item.name); setActive(item.isActive); setNotice(""); }} /></View>)}
      <Button label="Actualiser" secondary disabled={busy || loading} onPress={() => { reset(); refresh(); setRevision(value => value + 1); }} />
    </>}
  </Screen>;
}
