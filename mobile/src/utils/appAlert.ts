import { Alert, Platform } from "react-native";

export type AppAlertButton = {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void;
};

function alertText(title: string, message?: string) {
  return message ? `${title}\n\n${message}` : title;
}

function showWebAlertModal(
  title: string,
  message: string | undefined,
  buttons: AppAlertButton[]
) {
  const doc = globalThis.document;
  if (!doc?.body) return;

  const overlay = doc.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "99999",
    padding: "16px",
  });

  const panel = doc.createElement("div");
  Object.assign(panel.style, {
    background: "#ffffff",
    borderRadius: "12px",
    maxWidth: "420px",
    width: "100%",
    padding: "20px",
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.18)",
  });

  const heading = doc.createElement("div");
  heading.textContent = title;
  Object.assign(heading.style, {
    fontWeight: "600",
    fontSize: "18px",
    marginBottom: "8px",
    color: "#0f172a",
  });
  panel.appendChild(heading);

  if (message) {
    const body = doc.createElement("div");
    body.textContent = message;
    Object.assign(body.style, {
      fontSize: "14px",
      lineHeight: "1.5",
      marginBottom: "16px",
      color: "#334155",
      whiteSpace: "pre-wrap",
    });
    panel.appendChild(body);
  }

  const actions = doc.createElement("div");
  Object.assign(actions.style, {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

  const close = () => overlay.remove();

  for (const button of buttons) {
    const el = doc.createElement("button");
    el.type = "button";
    el.textContent = button.text;
    const isCancel = button.style === "cancel";
    const isDestructive = button.style === "destructive";
    Object.assign(el.style, {
      padding: "10px 16px",
      borderRadius: "8px",
      border: isCancel ? "1px solid #cbd5e1" : "none",
      background: isDestructive ? "#dc2626" : isCancel ? "#ffffff" : "#2563eb",
      color: isCancel ? "#0f172a" : "#ffffff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    });
    el.onclick = () => {
      close();
      button.onPress?.();
    };
    actions.appendChild(el);
  }

  panel.appendChild(actions);
  overlay.appendChild(panel);
  overlay.onclick = (event) => {
    if (event.target === overlay) close();
  };
  doc.body.appendChild(overlay);
}

function webAlert(title: string, message: string | undefined, buttons: AppAlertButton[]) {
  const cancelButtons = buttons.filter((b) => b.style === "cancel");
  const actionButtons = buttons.filter((b) => b.style !== "cancel");

  if (buttons.length === 1) {
    globalThis.alert?.(alertText(title, message));
    buttons[0]?.onPress?.();
    return;
  }

  if (buttons.length === 2 && cancelButtons.length === 1 && actionButtons.length === 1) {
    if (globalThis.confirm?.(alertText(title, message))) {
      actionButtons[0]?.onPress?.();
    }
    return;
  }

  showWebAlertModal(title, message, buttons);
}

/** Substitui `Alert.alert` com suporte ao app web. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[]
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  webAlert(title, message, buttons ?? [{ text: "OK" }]);
}
