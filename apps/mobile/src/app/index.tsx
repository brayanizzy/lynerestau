import { Link } from "expo-router";
import { PERMISSION_LABELS } from "@lyne/shared";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth";

export default function Home() {
  const auth = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const user = auth.session?.user;
  const mustChange = Boolean(user && (user.mustChangePassword || changing));
  async function submit() {
    if (busy) return;
    setError(""); setNotice("");
    if (!password || (!user && !identifier.trim())) { setError("Complétez tous les champs."); return; }
    if (mustChange && (next.length < 12 || next.length > 128 || next !== confirmation)) { setError("Choisissez au moins 12 caractères et confirmez le même mot de passe."); return; }
    setBusy(true);
    try {
      if (mustChange) { await auth.changePassword(password, next); setChanging(false); setNotice("Mot de passe modifié. Reconnectez-vous."); }
      else await auth.login(identifier.trim(), password);
    } catch (err) { setError((err as Error).message); }
    finally { setPassword(""); setNext(""); setConfirmation(""); setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError("");
    try { await auth.logout(); setChanging(false); setPassword(""); setNotice("Vous êtes déconnecté."); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.brand}><Text style={s.logo}>LYNE</Text><Text style={s.restaurant}>RESTAURANT</Text></View>
      <Text style={s.eyebrow}>ESPACE INTERNE · PHASE 02</Text>
      {auth.loading ? <ActivityIndicator size="large" color="#b40712" accessibilityLabel="Vérification de la session" /> : auth.restoreError ? <View style={s.card}><Text style={s.error} accessibilityRole="alert">{auth.restoreError}</Text><Pressable style={s.button} onPress={() => void auth.restore()}><Text style={s.buttonText}>Réessayer</Text></Pressable></View> : <>
        <Text style={s.title}>{user ? mustChange ? "Sécurisez votre compte." : `Bonjour, ${user.displayName}.` : "Le service commence ici."}</Text>
        <Text style={s.subtitle}>{user ? mustChange ? "Choisissez un nouveau mot de passe de 12 caractères minimum." : "Votre espace de travail, réservé à l’équipe LYNE." : "Connectez-vous avec votre compte personnel."}</Text>
        {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}{!!notice && <Text style={s.notice} accessibilityLiveRegion="polite">{notice}</Text>}
        {!user || mustChange ? <View style={s.card}>
          {!user && <><Text style={s.label}>Identifiant ou e-mail</Text><TextInput accessibilityLabel="Identifiant ou e-mail" style={s.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={191} editable={!busy} /></>}
          <Text style={s.label}>{mustChange ? "Mot de passe actuel" : "Mot de passe"}</Text><TextInput accessibilityLabel={mustChange ? "Mot de passe actuel" : "Mot de passe"} style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={128} editable={!busy} />
          {mustChange && <><Text style={s.label}>Nouveau mot de passe</Text><TextInput accessibilityLabel="Nouveau mot de passe" style={s.input} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={128} editable={!busy} />
            <Text style={s.label}>Confirmation</Text><TextInput accessibilityLabel="Confirmer le nouveau mot de passe" style={s.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={128} editable={!busy} /></>}
          <Pressable accessibilityRole="button" style={[s.button, busy && s.disabled]} onPress={() => void submit()} disabled={busy}><Text style={s.buttonText}>{busy ? "Veuillez patienter…" : mustChange ? "Enregistrer le mot de passe" : "Accéder à mon espace →"}</Text></Pressable>
          <Text style={s.help}>{mustChange ? "Tous vos appareils seront déconnectés après le changement." : "Un problème ? Contactez votre administrateur."}</Text>
          {changing && !user?.mustChangePassword && <Pressable accessibilityRole="button" style={s.link} onPress={() => { setChanging(false); setError(""); setPassword(""); }}><Text>Annuler</Text></Pressable>}
        </View> : <>
          <View style={s.welcome}><Text style={s.welcomeLabel}>SESSION AUTHENTIFIÉE</Text><Text style={s.welcomeTitle}>{user.role.name}</Text><Text style={s.welcomeBody}>Compte : {user.username}</Text></View>
          <View style={s.card}>{user.permissions.includes("employees.read") && <Link href="/personnel" style={s.outlineButton}>Ouvrir le personnel →</Link>}<Text style={s.cardTitle}>Vos accès actuels</Text>{user.permissions.length ? user.permissions.map(permission => <Text key={permission} style={s.permission}>✓ {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] ?? permission}</Text>) : <Text style={s.help}>Les permissions opérationnelles seront ajoutées dans les prochaines phases.</Text>}
            <Text style={s.help}>Session valable jusqu’au {new Date(auth.session!.expiresAt).toLocaleString("fr-FR")}.</Text>
            <Pressable accessibilityRole="button" style={s.outlineButton} onPress={() => { setChanging(true); setError(""); }}><Text style={s.outlineText}>Changer mon mot de passe</Text></Pressable>
          </View>
        </>}
        {user && <Pressable accessibilityRole="button" style={s.link} disabled={busy} onPress={() => void logout()}><Text style={s.outlineText}>Se déconnecter</Text></Pressable>}
      </>}
      <Text style={s.footer}>Gestion du restaurant · Accès réservé</Text>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fbf7f7" }, flex: { flex: 1 }, content: { padding: 28, paddingBottom: 35, maxWidth: 550, width: "100%", alignSelf: "center", flexGrow: 1 },
  brand: { marginTop: 12, marginBottom: 40 }, logo: { fontSize: 35, fontWeight: "500", letterSpacing: 6, color: "#b40712" }, restaurant: { fontSize: 9, letterSpacing: 3, color: "#b40712", marginTop: 3 },
  eyebrow: { fontSize: 9, letterSpacing: 1.7, color: "#696e61", marginBottom: 18 }, title: { fontSize: 34, lineHeight: 40, fontWeight: "500", color: "#b40712", marginBottom: 15 }, subtitle: { color: "#62675b", fontSize: 14, lineHeight: 22, marginBottom: 25 },
  card: { borderRadius: 6, borderWidth: 1, borderColor: "#e0ddd4", backgroundColor: "white", padding: 24, marginBottom: 18 }, label: { fontSize: 13, color: "#30392e", fontWeight: "500", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#cecec4", borderRadius: 4, padding: 13, minHeight: 50, marginBottom: 20, fontSize: 16, color: "#1b1b1b", backgroundColor: "#fdfdfb" },
  button: { backgroundColor: "#b40712", borderRadius: 4, padding: 16, minHeight: 50, alignItems: "center" }, buttonText: { color: "white", fontWeight: "600", fontSize: 14 }, disabled: { opacity: .55 },
  help: { fontSize: 12, lineHeight: 20, color: "#707467", marginTop: 18 }, error: { color: "#96291f", backgroundColor: "#fff0ed", padding: 16, marginBottom: 20, fontSize: 13, lineHeight: 20, borderRadius: 4 }, notice: { color: "#265531", backgroundColor: "#edf4e8", padding: 16, marginBottom: 20 },
  welcome: { backgroundColor: "#b40712", padding: 25, borderRadius: 5, marginBottom: 22 }, welcomeLabel: { fontSize: 9, letterSpacing: 1.5, color: "#cfdfc9", marginBottom: 20 }, welcomeTitle: { color: "white", fontSize: 25, marginBottom: 12 }, welcomeBody: { color: "#d5dfd7", fontSize: 13 },
  cardTitle: { fontSize: 20, fontWeight: "500", color: "#b40712", marginBottom: 17 }, permission: { fontSize: 13, color: "#40533d", marginBottom: 12 }, outlineButton: { minHeight: 46, borderWidth: 1, borderColor: "#d8d2c8", borderRadius: 4, padding: 13, alignItems: "center", marginTop: 25 }, outlineText: { color: "#b40712", fontSize: 13 },
  link: { padding: 15, minHeight: 44, alignItems: "center" }, footer: { textAlign: "center", color: "#808476", fontSize: 10, marginTop: "auto", paddingTop: 30 },
});
