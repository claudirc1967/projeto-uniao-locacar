import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { setAuthToken } from "../api/authToken";
import { trpc } from "../api/trpc";

const JWT_KEY = "jwt";

export type SessionUser = {
  id: string;
  email: string;
  role: "OWNER" | "DRIVER";
  driverProfile: {
    status: string;
    fullName: string | null;
    phone: string | null;
  } | null;
  ownerProfile: {
    id: string;
    cpfCnpj: string;
    phone: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  } | null;
};

type AuthCtx = {
  hydrated: boolean;
  token: string | null;
  user: SessionUser | null;
  sessionLoading: boolean;
  loginWithToken: (jwt: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync(JWT_KEY);
        setAuthToken(t);
        setToken(t);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const me = trpc.auth.me.useQuery(undefined, {
    enabled: hydrated && !!token,
    retry: false,
  });

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(JWT_KEY);
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (hydrated && token && me.isError) {
      void logout();
    }
  }, [hydrated, token, me.isError, logout]);

  const loginWithToken = useCallback(async (jwt: string) => {
    await SecureStore.setItemAsync(JWT_KEY, jwt);
    setAuthToken(jwt);
    setToken(jwt);
  }, []);

  const sessionLoading = Boolean(token && (me.isLoading || me.isFetching));

  const value = useMemo<AuthCtx>(
    () => ({
      hydrated,
      token,
      user: me.data ? (me.data as SessionUser) : null,
      sessionLoading,
      loginWithToken,
      logout,
    }),
    [hydrated, token, me.data, sessionLoading, loginWithToken, logout]
  );

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
