import { Platform } from "react-native";

type GetFn = (key: string) => Promise<string | null>;
type SetFn = (key: string, value: string) => Promise<void>;
type DelFn = (key: string) => Promise<void>;

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

const webGet: GetFn = async (key) => {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const webSet: SetFn = async (key, value) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const webDel: DelFn = async (key) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

async function nativeSecureStore() {
  const SecureStore = await import("expo-secure-store");
  return SecureStore;
}

export const secureStorage: {
  getItemAsync: GetFn;
  setItemAsync: SetFn;
  deleteItemAsync: DelFn;
} = Platform.OS === "web"
  ? {
      getItemAsync: webGet,
      setItemAsync: webSet,
      deleteItemAsync: webDel,
    }
  : {
      getItemAsync: async (key) => {
        const SecureStore = await nativeSecureStore();
        return SecureStore.getItemAsync(key);
      },
      setItemAsync: async (key, value) => {
        const SecureStore = await nativeSecureStore();
        await SecureStore.setItemAsync(key, value);
      },
      deleteItemAsync: async (key) => {
        const SecureStore = await nativeSecureStore();
        await SecureStore.deleteItemAsync(key);
      },
    };

