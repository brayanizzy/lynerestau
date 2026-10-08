import type { PropsWithChildren, ComponentProps } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Redirect } from "expo-router";
import { useAuth } from "../auth";

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  const auth = useAuth();
  if (auth.loading) return <SafeAreaView style={s.safe}><ActivityIndicator accessibilityLabel="Vérification de la session" /></SafeAreaView>;
  if (!auth.session || auth.session.user.mustChangePassword) return <Redirect href="/" />;
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Link href="/" style={s.back}>← Mon espace</Link><Text style={s.brand}>LYNE RESTAURANT</Text><Text style={s.title}>{title}</Text>
      {auth.session.user.permissions.includes("employees.read") ? children : <Message text="Votre compte n’a pas accès au personnel." />}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Button({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={[s.button, secondary && s.secondary, disabled && s.disabled]}>
    <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text></Pressable>;
}
export function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input, props.multiline && s.multiline]} {...props} /></View>;
}
export function Choice({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: { value: string; label: string; disabled?: boolean }[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}>{options.map(option => <Pressable key={option.value}
    accessibilityRole="radio" accessibilityLabel={`${label} : ${option.label}`} accessibilityState={{ selected: value === option.value, disabled: disabled || option.disabled }}
    disabled={disabled || option.disabled} onPress={() => { if (value !== option.value) onChange(option.value); }} style={[s.choice, value === option.value && s.chosen, (disabled || option.disabled) && s.disabled]}>
    <Text style={value === option.value ? s.chosenText : s.body}>{option.label}</Text></Pressable>)}</View></View>;
}
export function Message({ text, success = false }: { text: string; success?: boolean }) {
  return text ? <Text accessibilityRole={success ? undefined : "alert"} accessibilityLiveRegion="polite" style={[s.message, success && s.success]}>{text}</Text> : null;
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fbf7f7" }, flex: { flex: 1 }, content: { padding: 20, gap: 14, width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 45 },
  brand: { fontSize: 11, letterSpacing: 2, color: "#b40712", fontWeight: "700" }, title: { fontSize: 29, fontWeight: "700", color: "#211719" }, back: { paddingVertical: 12, minHeight: 44, color: "#8f0912" },
  card: { padding: 18, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e8d9db", gap: 12 }, heading: { fontSize: 20, fontWeight: "600", color: "#211719" },
  body: { fontSize: 14, lineHeight: 21, color: "#392f31" }, muted: { fontSize: 13, lineHeight: 20, color: "#6c5f63" }, field: { gap: 7 }, label: { fontSize: 14, fontWeight: "600", color: "#392f31" },
  input: { borderWidth: 1, borderColor: "#cdbdc0", borderRadius: 9, padding: 12, minHeight: 48, backgroundColor: "#fff", color: "#241a1d", fontSize: 16 }, multiline: { minHeight: 95, textAlignVertical: "top" },
  button: { backgroundColor: "#b40712", borderRadius: 10, padding: 14, minHeight: 48, alignItems: "center", justifyContent: "center" }, buttonText: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d7b9bd" }, secondaryText: { color: "#910913" }, disabled: { opacity: .5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { borderWidth: 1, borderColor: "#e0ced1", borderRadius: 8, padding: 11, minHeight: 44, justifyContent: "center" }, chosen: { backgroundColor: "#b40712", borderColor: "#b40712" }, chosenText: { color: "#fff", fontSize: 14 },
  message: { color: "#8f0912", backgroundColor: "#ffecee", padding: 14, borderRadius: 9, lineHeight: 21 }, success: { color: "#235235", backgroundColor: "#eaf6ee" },
  photo: { width: 112, height: 135, borderRadius: 9, backgroundColor: "#eee5e7" }, logo: { width: 90, height: 90, resizeMode: "contain" },
});
