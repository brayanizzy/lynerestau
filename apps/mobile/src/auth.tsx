import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@lyne/shared";
import { ApiFailure, apiRequest } from "./api-client";

const key = "lyne.session.v1";
const web = Platform.OS === "web";
type Auth = {
  session: AuthSession | null; loading: boolean; restoreError: string;
  restore: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  api: <T>(path: string, body?: unknown, method?: "POST" | "PATCH") => Promise<T>;
  photo: (employeeId: string, version: number) => Promise<string>;
};
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const epoch = useRef(0);
  const clear = useCallback(async () => {
    epoch.current++;
    setSession(null); setToken(null);
    setRestoreError("");
    if (!web) await SecureStore.deleteItemAsync(key);
  }, []);
  const request = useCallback(<T,>(path: string, credential: string | null, body?: unknown, method?: "POST" | "PATCH", photo = false) =>
    apiRequest<T>({ base: process.env.EXPO_PUBLIC_API_URL ?? "", token: credential, web, development: __DEV__, onUnauthorized: clear }, path, body, method, photo), [clear]);
  const api = useCallback(<T,>(path: string, body?: unknown, method?: "POST" | "PATCH") => request<T>(path, token, body, method), [request, token]);
  const photo = useCallback(async (id: string, version: number) => {
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) throw new Error("Fiche invalide.");
    const blob = await request<Blob>(`/employees/${id}/photo?v=${version}`, token, undefined, undefined, true);
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Lecture de la photo impossible.")); reader.readAsDataURL(blob);
    });
  }, [request, token]);
  const restoreSession = useCallback(async () => {
    const current = ++epoch.current;
    try {
      const saved = web ? null : await SecureStore.getItemAsync(key);
      const value = !web && !saved ? null : await request<AuthSession>("/auth/me", saved);
      if (current === epoch.current) { setToken(saved); setSession(previous => JSON.stringify(previous) === JSON.stringify(value) ? previous : value); setRestoreError(""); }
    } catch (error) {
      if (current === epoch.current && !(error instanceof ApiFailure && error.status === 401)) { setSession(null); setRestoreError((error as Error).message); }
    } finally { setLoading(false); }
  }, [request]);
  const restore = useCallback(async () => {
    setLoading(true); setRestoreError("");
    await restoreSession();
  }, [restoreSession]);
  // Restore the external secure session once on mount; state follows the async result.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void restoreSession(); }, [restoreSession]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void restoreSession(); });
    return () => subscription.remove();
  }, [restoreSession]);
  const auth: Auth = { session, loading, restoreError, restore, api, photo,
    async login(identifier, password) {
      epoch.current++;
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
