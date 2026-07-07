import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpfCnpj, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerProfile">;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionFields}>{children}</View>
    </View>
  );
}

export function OwnerProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const o = user?.ownerProfile;

  const addressLine1 = o
    ? `${o.logradouro}, ${o.numero}${
        o.complemento?.trim() ? ` — ${o.complemento.trim()}` : ""
      }`
    : "—";

  const addressLine2 = o
    ? `${o.bairro} — ${o.cidade}/${o.uf} — CEP ${o.cep}`
    : "—";

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 8 + insets.bottom },
        ]}
      >
        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {o ? (
              <>
                  <Field
                    label="Nome / Razão Social"
                    value={o.nomeRazaoSocial?.trim() || "—"}
                  />
                  <Field
                    label="E-mail"
                    value={o.emailLocador?.trim() || "—"}
                  />
                  <Field
                    label="Modelo de contrato"
                    value={
                      o.contractTemplateText?.trim()
                        ? "Customizado"
                        : "Modelo padrão do app"
                    }
                  />
                  <Field label="CPF/CNPJ" value={maskCpfCnpj(o.cpfCnpj)} />
                  <Field
                    label="Telefone / WhatsApp"
                    value={maskPhone(o.phone)}
                  />
                
                  <Field label="Logradouro" value={addressLine1} />
                  <Field label="Cidade / UF / CEP" value={addressLine2} />                
              </>
            ) : null}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          icon="pencil-outline"
          onPress={() => navigation.navigate("OwnerProfileEdit")}
          style={styles.btn}
        >
          Editar meus dados
        </Button>
        <Button
          mode="outlined"
          icon="file-document-outline"
          onPress={() => navigation.navigate("TermsOfUse")}
          style={styles.btn}
        >
          Termos de uso
        </Button>
        <Button
          mode="outlined"
          icon="shield-account-outline"
          onPress={() => navigation.navigate("AccountPrivacy")}
          style={styles.btn}
        >
          Privacidade e conta
        </Button>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 12, gap: 12 },
  card: { borderRadius: 16 },
  cardContent: { gap: 4 },
  section: { gap: 12 },
  sectionTitle: { opacity: 0.85 },
  sectionFields: { gap: 16 },
  field: { gap: 4 },
  fieldLabel: { opacity: 0.85, fontWeight: "700" },
  divider: { marginVertical: 8 },
  btn: { borderRadius: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
});
