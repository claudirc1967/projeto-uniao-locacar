import { Linking, Platform, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { trpc } from "../api/trpc";

function openExternalUrl(url: string) {
  if (Platform.OS === "web") {
    globalThis.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}

export function SupportContactBlock() {
  const theme = useTheme();
  const q = trpc.auth.getPublicSupport.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const { supportEmail, whatsAppUrl } = q.data ?? {};

  if (!supportEmail && !whatsAppUrl) {
    return null;
  }

  const linkStyle = { color: theme.colors.primary, fontWeight: "600" as const };

  return (
    <View style={styles.wrap}>
      <Text variant="bodySmall" style={styles.lead}>
        Aplicativo em fase inicial. Em caso de algum problema ou dúvida, entre em
        contato conosco
        {supportEmail && whatsAppUrl ? (
          <>
            {" "}
            pelo e-mail{" "}
            <Text
              style={linkStyle}
              onPress={() => openExternalUrl(`mailto:${supportEmail}`)}
            >
              {supportEmail}
            </Text>{" "}
            e no{" "}
            <Text style={linkStyle} onPress={() => openExternalUrl(whatsAppUrl)}>
              WhatsApp
            </Text>
            .
          </>
        ) : supportEmail ? (
          <>
            {" "}
            pelo e-mail{" "}
            <Text
              style={linkStyle}
              onPress={() => openExternalUrl(`mailto:${supportEmail}`)}
            >
              {supportEmail}
            </Text>
            .
          </>
        ) : (
          <>
            {" "}
            pelo{" "}
            <Text style={linkStyle} onPress={() => openExternalUrl(whatsAppUrl!)}>
              WhatsApp
            </Text>
            .
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cbd5e1",
  },
  lead: {
    opacity: 0.85,
    lineHeight: 20,
    textAlign: "center",
  },
});
