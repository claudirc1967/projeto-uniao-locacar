import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  HelperText,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerPartners">;

type PartnerCategory =
  | "INSURANCE"
  | "WORKSHOP"
  | "BODYSHOP"
  | "PARTS"
  | "OTHER";

const CATEGORIES: PartnerCategory[] = [
  "INSURANCE",
  "WORKSHOP",
  "BODYSHOP",
  "PARTS",
  "OTHER",
];

function categoryLabel(c: PartnerCategory): string {
  switch (c) {
    case "INSURANCE":
      return "Seguradora";
    case "WORKSHOP":
      return "Oficina";
    case "BODYSHOP":
      return "Funilaria";
    case "PARTS":
      return "Peças / pneus";
    default:
      return "Outro";
  }
}

export function OwnerPartnersScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const listQ = trpc.owner.listMyPartners.useQuery({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PartnerCategory>("OTHER");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setCategory("OTHER");
    setEmail("");
    setPhone("");
    setNotes("");
    setFormErr(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: {
    id: string;
    name: string;
    category: PartnerCategory;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }) => {
    setEditingId(p.id);
    setName(p.name);
    setCategory(p.category);
    setEmail(p.email ?? "");
    setPhone(p.phone ?? "");
    setNotes(p.notes ?? "");
    setFormErr(null);
    setDialogOpen(true);
  };

  const invalidatePartners = async () => {
    await utils.owner.listMyPartners.invalidate();
    await utils.owner.listMyVehicles.invalidate();
  };

  const createM = trpc.owner.createPartner.useMutation({
    onSuccess: async () => {
      setFormErr(null);
      setDialogOpen(false);
      resetForm();
      await invalidatePartners();
    },
    onError: (e) => setFormErr(trpcErrorMessage(e)),
  });

  const updateM = trpc.owner.updatePartner.useMutation({
    onSuccess: async () => {
      setFormErr(null);
      setDialogOpen(false);
      resetForm();
      await invalidatePartners();
    },
    onError: (e) => setFormErr(trpcErrorMessage(e)),
  });

  const deleteM = trpc.owner.deletePartner.useMutation({
    onSuccess: async () => {
      await invalidatePartners();
    },
    onError: (e) => {
      Alert.alert("Erro", trpcErrorMessage(e));
    },
  });

  const busy = createM.isPending || updateM.isPending;

  const onSave = () => {
    const n = name.trim();
    if (n.length < 2) {
      setFormErr("Informe o nome (mínimo 2 caracteres).");
      return;
    }
    const em = email.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormErr("E-mail inválido.");
      return;
    }
    const ph = phone.trim();
    if (ph && ph.length < 8) {
      setFormErr("Telefone muito curto.");
      return;
    }

    if (editingId) {
      updateM.mutate({
        partnerId: editingId,
        name: n,
        category,
        email: em ? em.toLowerCase() : null,
        phone: ph || null,
        notes: notes.trim() || null,
      });
    } else {
      createM.mutate({
        name: n,
        category,
        email: em ? em.toLowerCase() : null,
        phone: ph || null,
        notes: notes.trim() || null,
      });
    }
  };

  const onDelete = (partnerId: string, partnerName: string) => {
    Alert.alert(
      "Excluir parceiro",
      `Excluir "${partnerName}"? Veículos vinculados ficarão sem este parceiro.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteM.mutate({ partnerId }),
        },
      ]
    );
  };

  if (listQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (listQ.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(listQ.error)}
        </Text>
        <Button mode="contained" onPress={() => listQ.refetch()}>
          Tentar de novo
        </Button>
      </View>
    );
  }

  const data = listQ.data ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 8 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall">Parceiros</Text>
            <Text variant="bodySmall" style={styles.sub}>
              Cadastre fornecedores (seguradora, oficina, etc.). No veículo você
              pode vincular a seguradora.
            </Text>
            <Button mode="contained" icon="plus" onPress={openCreate}>
              Novo parceiro
            </Button>
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhum parceiro cadastrado. Toque em &quot;Novo parceiro&quot; para
            começar.
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content>
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <Text variant="titleMedium">{item.name}</Text>
                  <Text variant="bodySmall" style={styles.categoryLine}>
                    {categoryLabel(item.category as PartnerCategory)}
                  </Text>
                  {item.phone ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      Tel.: {item.phone}
                    </Text>
                  ) : null}
                  {item.email ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.email}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text variant="bodySmall" style={styles.notes} numberOfLines={3}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="pencil-outline"
                    onPress={() =>
                      openEdit({
                        id: item.id,
                        name: item.name,
                        category: item.category as PartnerCategory,
                        email: item.email,
                        phone: item.phone,
                        notes: item.notes,
                      })
                    }
                  />
                  <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.error}
                    onPress={() => onDelete(item.id, item.name)}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      />

      <Portal>
        <Dialog
          visible={dialogOpen}
          onDismiss={() => {
            if (!busy) {
              setDialogOpen(false);
              resetForm();
            }
          }}
        >
          <Dialog.Title>
            {editingId ? "Editar parceiro" : "Novo parceiro"}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Dialog.Content>
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                  <Text variant="labelLarge" style={styles.fieldLabel}>
                    Tipo
                  </Text>
                  <View style={styles.chipRow}>
                    {CATEGORIES.map((c) => (
                      <Chip
                        key={c}
                        selected={category === c}
                        onPress={() => setCategory(c)}
                        style={styles.chip}
                        mode="outlined"
                      >
                        {categoryLabel(c)}
                      </Chip>
                    ))}
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Nome"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Telefone (opcional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="E-mail (opcional)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Observações (opcional)"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    style={styles.input}
                    contentStyle={{ minHeight: 72 }}
                  />

                  <HelperText type="error" visible={!!formErr}>
                    {formErr ?? ""}
                  </HelperText>
                </KeyboardAvoidingView>
              </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
          <Divider />
          <Dialog.Actions>
            <Button
              onPress={() => {
                if (!busy) {
                  setDialogOpen(false);
                  resetForm();
                }
              }}
            >
              Cancelar
            </Button>
            <Button mode="contained" onPress={onSave} loading={busy} disabled={busy}>
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  list: { padding: 16, paddingBottom: 12 },
  header: { marginBottom: 16, gap: 10 },
  sub: { opacity: 0.85 },
  empty: { marginTop: 8, opacity: 0.8 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  cardMain: { flex: 1, minWidth: 0 },
  categoryLine: { marginTop: 4, opacity: 0.85 },
  cardActions: { flexDirection: "row", alignItems: "flex-start" },
  meta: { marginTop: 2, opacity: 0.9 },
  notes: { marginTop: 8, opacity: 0.85 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  fieldLabel: { marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { marginRight: 0 },
  input: { marginBottom: 8, backgroundColor: "transparent" },
});
