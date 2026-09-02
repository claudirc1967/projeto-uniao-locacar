import type { RootStackParamList } from "./types";

type PostLoginRoute = {
  [K in keyof RootStackParamList]: RootStackParamList[K] extends undefined
    ? { name: K }
    : { name: K; params: RootStackParamList[K] };
}[keyof RootStackParamList];

let pending: PostLoginRoute | null = null;

export function setPostLoginNavigation(route: PostLoginRoute | null) {
  pending = route;
}

export function consumePostLoginNavigation(): PostLoginRoute | null {
  const route = pending;
  pending = null;
  return route;
}
