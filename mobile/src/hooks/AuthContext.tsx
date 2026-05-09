import { useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
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
import { secureStorage } from "../utils/secureStorage";

const JWT_KEY = "jwt";

export type SessionUser = {
  id: string;
  email: string;
  role: "OWNER" | "DRIVER";
  needsPrivacyPolicyAcceptance?: boolean;
  privacyPolicyVersion?: string;
  privacyPolicyAcceptedAt?: string | Date | null;
  currentPrivacyPolicyVersion?: string;
  driverProfile: {
    status: string;
    fullName: string | null;
    phone: string | null;
    averageRating?: number;
    ratingCount?: number;
  } | null;
  ownerProfile: {
    id: string;
    nomeRazaoSocial: string;
    emailLocador: string;
    contractTemplateText: string | null;
    cpfCnpj: string;
    phone: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    averageRating?: number;
    ratingCount?: number;
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
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await secureStorage.getItemAsync(JWT_KEY);
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

  useEffect(() => {
    if (me.data) {
      setUser(me.data as SessionUser);
    }
  }, [me.data]);

  const logout = useCallback(async () => {
    try {
      await secureStorage.deleteItemAsync(JWT_KEY);
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (hydrated && token && me.isError) {
      const err = me.error;
      const unauthorized =
        err instanceof TRPCClientError &&
        ((err.data as any)?.code === "UNAUTHORIZED" ||
          (err.data as any)?.httpStatus === 401);
      if (unauthorized) {
        void logout();
      }
    }
  }, [hydrated, token, me.isError, me.error, logout]);

  const loginWithToken = useCallback(async (jwt: string) => {
    await secureStorage.setItemAsync(JWT_KEY, jwt);
    setAuthToken(jwt);
    setToken(jwt);
  }, []);

  const sessionLoading = Boolean(token && !user && (me.isLoading || me.isFetching));

  const value = useMemo<AuthCtx>(
    () => ({
      hydrated,
      token,
      user,
      sessionLoading,
      loginWithToken,
      logout,
    }),
    [hydrated, token, user, sessionLoading, loginWithToken, logout]
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
