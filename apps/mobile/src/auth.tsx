import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { ApiError, ApiSuccess, AuthSession } from "@lyne/shared";

const key = "lyne.session.v1";
const web = Platform.OS === "web";
class ApiFailure extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, token: string | null, body?: unknown): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base || (!__DEV__ && !base.startsWith("https://"))) throw new Error("L’adresse HTTPS de l’API doit être configurée.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try { response = await fetch(`${base}/api/v1${path}`, { method: body === undefined ? "GET" : "POST", credentials: web ? "include" : "omit",
    headers: { "X-Lyne-Client": web ? "web" : "mobile", ...(token && !web ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal }); }
  catch { throw new Error("Connexion au serveur impossible. Vérifiez votre réseau."); }
  finally { clearTimeout(timer); }
  let result: ApiSuccess<T> | ApiError;
  try { result = await response.json(); } catch { throw new Error("Réponse du serveur inattendue."); }
  if (!response.ok || !result.ok) throw new ApiFailure(result.ok ? "Requête refusée." : result.error.message, response.status);
  return result.data;
}
type Auth = {
  session: AuthSession | null; loading: boolean; restoreError: string;
  restore: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
async function readSavedSession() {
  const saved = web ? null : await SecureStore.getItemAsync(key);
  if (!web && !saved) return null;
  return { token: saved, session: await request<AuthSession>("/auth/me", saved) };
}
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const clear = useCallback(async () => {
    setSession(null); setToken(null);
    if (!web) await SecureStore.deleteItemAsync(key);
  }, []);
  const restoreSession = useCallback(() => readSavedSession().then(value => {
      setToken(value?.token ?? null); setSession(value?.session ?? null); setRestoreError("");
    }).catch(async error => {
      if (error instanceof ApiFailure && error.status === 401) await clear();
      else { setSession(null); setRestoreError((error as Error).message); }
    }).finally(() => { setLoading(false); }), [clear]);
  const restore = useCallback(async () => {
    setLoading(true); setRestoreError("");
    await restoreSession();
  }, [restoreSession]);
  useEffect(() => { void restoreSession(); }, [restoreSession]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void restore(); });
    return () => subscription.remove();
  }, [restore]);
  const auth: Auth = { session, loading, restoreError, restore,
    async login(identifier, password) {
      const value = await request<AuthSession>("/auth/login", null, { identifier, password });
      if (!web) {
        if (!value.token) throw new Error("Le serveur n’a pas fourni de session mobile.");
        try { await SecureStore.setItemAsync(key, value.token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); }
        catch { await request("/auth/logout", value.token, {}).catch(() => {}); throw new Error("Stockage sécurisé indisponible. Connexion annulée."); }
      }
      setToken(value.token ?? null); setSession({ user: value.user, expiresAt: value.expiresAt });
    },
    async logout() {
      try { await request("/auth/logout", token, {}); }
      catch (error) { if (!(error instanceof ApiFailure && error.status === 401)) throw error; }
      await clear();
    },
    async changePassword(currentPassword, newPassword) {
      try { await request("/auth/password", token, { currentPassword, newPassword }); }
      catch (error) { if (error instanceof ApiFailure && error.status === 401) await clear(); throw error; }
      await clear();
    },
  };
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider absent");
  return auth;
}
