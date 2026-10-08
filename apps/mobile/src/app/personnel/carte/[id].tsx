import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import * as Print from "expo-print";
import type { StaffCard } from "@lyne/shared";
import { useAuth } from "../../../auth";
import { staffCardHtml } from "../../../personnel/model";
import { Button, Message, Screen, s } from "../../../personnel/ui";
const logo = require("../../../../../../website/logo-lyne.png");
export default function Card() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CardContent key={id} id={id} />;
}
function CardContent({ id }: { id: string }) {
  const { api, photo, session } = useAuth();
  const allowed = Boolean(session?.user.permissions.includes("employees.print") && session.user.permissions.includes("employees.read") && !session.user.mustChangePassword);
  const [card, setCard] = useState<StaffCard | null>(null); const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void api<StaffCard>(`/employees/${encodeURIComponent(id)}/card`).then(async value => {
      const picture = value.photoUrl ? await photo(value.id, Number(new URL(value.photoUrl, "https://local.invalid").searchParams.get("v")) || 1) : null;
      if (active) { setCard(value); setImage(picture); }
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, api, photo, id, revision]);
  async function print() {
    if (busy || !card) return; setBusy(true); setError("");
    try {
      // Revalidate authorization and status immediately before opening the system print dialog.
      const latest = await api<StaffCard>(`/employees/${encodeURIComponent(id)}/card`);
      const picture = latest.photoUrl ? await photo(latest.id, Number(new URL(latest.photoUrl, "https://local.invalid").searchParams.get("v")) || 1) : null;
      const asset = await Asset.fromModule(logo).downloadAsync();
      if (!asset.localUri) throw new Error("Logo indisponible.");
      const data = await new File(asset.localUri).base64();
      await Print.printAsync({ html: staffCardHtml(latest, `data:image/png;base64,${data}`, picture) });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Screen title="Carte de service"><Link href={{ pathname: "/personnel/[id]", params: { id } }} style={s.back}>← Fiche du personnel</Link>
    <Message text={error} />{!allowed ? <Message text="Vous n’avez pas la permission d’imprimer les cartes." /> : <>
      {loading && <ActivityIndicator accessibilityLabel="Préparation de la carte" />}
      {card && <><View style={s.card}><Image source={logo} style={s.logo} accessibilityLabel="LYNE Restaurant" /><Text style={s.brand}>CARTE DE SERVICE</Text>
        {image && <Image source={{ uri: image }} style={s.photo} accessibilityLabel="Photo du personnel" />}<Text style={s.heading}>{card.fullName}</Text>
        <Text style={s.body}>{card.jobTitle ?? "Équipe LYNE"}</Text><Text style={s.body}>{card.department}</Text><Text style={s.heading}>{card.staffNumber}</Text></View>
        <Text style={s.muted}>Format imprimé : 85,6 × 54 mm, sur une feuille A4. Choisissez l’échelle 100 % dans les options d’impression.</Text>
        {Platform.OS === "web" ? <Text style={s.body}>Pour imprimer depuis un navigateur, utilisez Personnel dans l’administration web.</Text> : <Button label={busy ? "Préparation…" : "Imprimer la carte"} disabled={busy} onPress={() => void print()} />}
      </>}
      <Button label="Réessayer / actualiser" secondary disabled={loading || busy} onPress={() => { setLoading(true); setError(""); setCard(null); setImage(null); setRevision(value => value + 1); }} />
    </>}
  </Screen>;
}
