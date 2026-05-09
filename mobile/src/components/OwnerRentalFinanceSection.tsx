import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { trpc } from "../api/trpc";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatMoneyFromCents,
  maskMoneyInput,
  maskDate,
  moneyInputFromCents,
  onlyDigits,
} from "../utils/masks";
import { trpcErrorMessage } from "../utils/trpcError";

type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
type EntryType =
  | "RENT_PAYMENT"
  | "SECURITY_DEPOSIT"
  | "DISCOUNT"
  | "EXTRA_CHARGE"
  | "REFUND";
type PaymentMethod =
  | "PIX"
  | "CASH"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "OTHER";

type Finance = {
  summary: {
    agreedAmountCents: number;
    securityDepositCents: number | null;
    status: PaymentStatus;
    dueDate: Date | string | null;
    notes: string | null;
  } | null;
  entries: Array<{
    id: string;
    type: EntryType;
    amountCents: number;
    method: PaymentMethod | null;
    paidAt: Date | string | null;
    notes: string | null;
    createdAt: Date | string;
  }>;
  totals: {
    rentPaidAmountCents: number;
    securityDepositPaidCents: number;
    discountCents: number;
    extraChargeCents: number;
    refundCents: number;
    balanceCents: number;
  };
};

type Props = {
  rentalId: string;
  finance?: Finance;
  defaultAmountCents: number;
};

const emptyFinance: Finance = {
  summary: null,
  entries: [],
  totals: {
    rentPaidAmountCents: 0,
    securityDepositPaidCents: 0,
    discountCents: 0,
    extraChargeCents: 0,
    refundCents: 0,
    balanceCents: 0,
  },
};

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado",
};

const entryTypeLabels: Record<EntryType, string> = {
  RENT_PAYMENT: "Pagamento",
  SECURITY_DEPOSIT: "Caução",
  DISCOUNT: "Desconto",
  EXTRA_CHARGE: "Extra",
  REFUND: "Reembolso",
};

const methodLabels: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  BANK_TRANSFER: "Transferência",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  OTHER: "Outro",
};

const statusOptions = Object.keys(statusLabels) as PaymentStatus[];
const entryTypeOptions = Object.keys(entryTypeLabels) as EntryType[];
const methodOptions = Object.keys(methodLabels) as PaymentMethod[];

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function dateToDdMmYyyy(date: Date | string | null | undefined) {
  return date ? formatDateDisplay(date) : "";
}

function parseDdMmYyyy(raw: string): Date | null {
  const digits = onlyDigits(raw);
  if (!digits) return null;
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

export function OwnerRentalFinanceSection({
  rentalId,
  finance,
  defaultAmountCents,
}: Props) {
  const theme = useTheme();
  const utils = trpc.useUtils();
  const financeUnavailable = !finance;
  const financeData = finance ?? emptyFinance;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [entryErr, setEntryErr] = useState<string | null>(null);

  const [agreedAmount, setAgreedAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [dueDate, setDueDate] = useState("");
  const [summaryNotes, setSummaryNotes] = useState("");

  const [entryType, setEntryType] = useState<EntryType>("RENT_PAYMENT");
  const [entryAmount, setEntryAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [paidAt, setPaidAt] = useState(() => dateToDdMmYyyy(new Date()));
  const [entryNotes, setEntryNotes] = useState("");

  const upsertSummary = trpc.owner.upsertRentalFinancialSummary.useMutation({
    onSuccess: async () => {
      setSummaryOpen(false);
      setSummaryErr(null);
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
    },
    onError: (error) => setSummaryErr(trpcErrorMessage(error)),
  });

  const addEntry = trpc.owner.addRentalFinancialEntry.useMutation({
    onSuccess: async () => {
      setEntryOpen(false);
      setEntryErr(null);
      setEntryAmount("");
      setEntryNotes("");
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
    },
    onError: (error) => setEntryErr(trpcErrorMessage(error)),
  });

  const deleteEntry = trpc.owner.deleteRentalFinancialEntry.useMutation({
    onSuccess: async () => {
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
    },
    onError: (error) => Alert.alert("Falha", trpcErrorMessage(error)),
  });

  useEffect(() => {
    const summary = financeData.summary;
    setAgreedAmount(
      moneyInputFromCents(summary?.agreedAmountCents ?? defaultAmountCents)
    );
    setSecurityDeposit(moneyInputFromCents(summary?.securityDepositCents));
    setStatus(summary?.status ?? "PENDING");
    setDueDate(dateToDdMmYyyy(summary?.dueDate));
    setSummaryNotes(summary?.notes ?? "");
  }, [defaultAmountCents, financeData.summary]);

  const openSummary = () => {
    setSummaryErr(null);
    setSummaryOpen(true);
  };

  const openEntry = () => {
    setEntryErr(null);
    setPaidAt(dateToDdMmYyyy(new Date()));
    setEntryOpen(true);
  };

  const saveSummary = () => {
    const agreedAmountCents = parseMoneyInput(agreedAmount);
    if (agreedAmountCents == null) {
      setSummaryErr("Informe o valor combinado.");
      return;
    }
    const securityDepositCents = securityDeposit.trim()
      ? parseMoneyInput(securityDeposit)
      : null;
    if (securityDeposit.trim() && securityDepositCents == null) {
      setSummaryErr("Informe uma caução válida ou deixe em branco.");
      return;
    }
    const parsedDueDate = dueDate.trim() ? parseDdMmYyyy(dueDate) : null;
    if (dueDate.trim() && !parsedDueDate) {
      setSummaryErr("Data de vencimento inválida. Use DD/MM/AAAA.");
      return;
    }
    upsertSummary.mutate({
      rentalId,
      agreedAmountCents,
      securityDepositCents,
      status,
      dueDate: parsedDueDate,
      notes: summaryNotes.trim() || null,
    });
  };

  const saveEntry = () => {
    const amountCents = parseMoneyInput(entryAmount);
    if (!amountCents) {
      setEntryErr("Informe um valor maior que zero.");
      return;
    }
    const parsedPaidAt = paidAt.trim() ? parseDdMmYyyy(paidAt) : null;
    if (paidAt.trim() && !parsedPaidAt) {
      setEntryErr("Data do lançamento inválida. Use DD/MM/AAAA.");
      return;
    }
    addEntry.mutate({
      rentalId,
      type: entryType,
      amountCents,
      method,
      paidAt: parsedPaidAt,
      notes: entryNotes.trim() || null,
    });
  };

  const confirmDeleteEntry = (entryId: string) => {
    Alert.alert("Excluir lançamento", "Deseja remover este lançamento financeiro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => deleteEntry.mutate({ rentalId, entryId }),
      },
    ]);
  };

  const summary = financeData.summary;

  return (
    <>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text variant="titleMedium">Financeiro</Text>
              <Text variant="bodySmall" style={styles.meta}>
                Controle manual de valores e pagamentos da locação.
              </Text>
            </View>
            {!financeUnavailable ? (
              <Button mode="outlined" compact onPress={openSummary}>
                {summary ? "Editar" : "Configurar"}
              </Button>
            ) : null}
          </View>

          {financeUnavailable ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              Financeiro indisponível. Atualize o backend para a versão que retorna
              os dados financeiros da locação.
            </Text>
          ) : null}

          {!financeUnavailable && summary ? (
            <>
              <View style={styles.grid}>
                <FinanceRow
                  label="Valor combinado"
                  value={formatMoneyFromCents(summary.agreedAmountCents)}
                />
                <FinanceRow label="Status" value={statusLabels[summary.status]} />
                <FinanceRow
                  label="Pago em aluguel"
                  value={formatMoneyFromCents(financeData.totals.rentPaidAmountCents)}
                />
                <FinanceRow
                  label="Saldo"
                  value={formatMoneyFromCents(financeData.totals.balanceCents)}
                />
                <FinanceRow
                  label="Caução registrada"
                  value={
                    summary.securityDepositCents != null
                      ? formatMoneyFromCents(summary.securityDepositCents)
                      : "—"
                  }
                />
                <FinanceRow
                  label="Caução recebida"
                  value={formatMoneyFromCents(financeData.totals.securityDepositPaidCents)}
                />
                <FinanceRow
                  label="Vencimento"
                  value={summary.dueDate ? formatDateDisplay(summary.dueDate) : "—"}
                />
              </View>
              {summary.notes ? (
                <Text variant="bodyMedium" style={styles.notes}>
                  {summary.notes}
                </Text>
              ) : null}
            </>
          ) : !financeUnavailable ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              Nenhum valor financeiro foi registrado para esta locação.
            </Text>
          ) : null}

          {!financeUnavailable ? (
            <View style={styles.actions}>
              <Button mode="contained-tonal" onPress={openEntry}>
                Registrar lançamento
              </Button>
            </View>
          ) : null}

          {financeData.entries.length > 0 ? (
            <View style={styles.entries}>
              <Text variant="labelLarge">Histórico</Text>
              {financeData.entries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryText}>
                    <Text variant="bodyMedium">
                      {entryTypeLabels[entry.type]} ·{" "}
                      {formatMoneyFromCents(entry.amountCents)}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {entry.paidAt
                        ? formatDateDisplay(entry.paidAt)
                        : formatDateTimeDisplay(entry.createdAt)}
                      {entry.method ? ` · ${methodLabels[entry.method]}` : ""}
                    </Text>
                    {entry.notes ? (
                      <Text variant="bodySmall" style={styles.meta}>
                        {entry.notes}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    mode="text"
                    compact
                    disabled={deleteEntry.isPending}
                    onPress={() => confirmDeleteEntry(entry.id)}
                  >
                    Excluir
                  </Button>
                </View>
              ))}
            </View>
          ) : null}
        </Card.Content>
      </Card>

      <Modal
        visible={summaryOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSummaryOpen(false)}
      >
        <View style={styles.modalRoot}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <Text variant="titleLarge">Financeiro da locação</Text>
              <TextInput
                mode="outlined"
                label="Valor combinado (R$)"
                value={agreedAmount}
                onChangeText={(t) => setAgreedAmount(maskMoneyInput(t))}
                keyboardType="decimal-pad"
              />
              <TextInput
                mode="outlined"
                label="Caução registrada (R$)"
                value={securityDeposit}
                onChangeText={(t) => setSecurityDeposit(maskMoneyInput(t))}
                keyboardType="decimal-pad"
              />
              <TextInput
                mode="outlined"
                label="Vencimento (DD/MM/AAAA)"
                value={dueDate}
                onChangeText={(value) => setDueDate(maskDate(value))}
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text variant="labelLarge" style={styles.fieldLabel}>
                Status
              </Text>
              <View style={styles.optionGrid}>
                {statusOptions.map((option) => (
                  <Button
                    key={option}
                    mode={status === option ? "contained" : "outlined"}
                    compact
                    onPress={() => setStatus(option)}
                  >
                    {statusLabels[option]}
                  </Button>
                ))}
              </View>
              <TextInput
                mode="outlined"
                label="Observações"
                value={summaryNotes}
                onChangeText={setSummaryNotes}
                multiline
              />
              <HelperText type="error" visible={!!summaryErr}>
                {summaryErr ?? ""}
              </HelperText>
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => setSummaryOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={upsertSummary.isPending}
                  onPress={saveSummary}
                >
                  Salvar
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={entryOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEntryOpen(false)}
      >
        <View style={styles.modalRoot}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <Text variant="titleLarge">Registrar lançamento</Text>
              <Text variant="labelLarge" style={styles.fieldLabel}>
                Tipo
              </Text>
              <View style={styles.optionGrid}>
                {entryTypeOptions.map((option) => (
                  <Button
                    key={option}
                    mode={entryType === option ? "contained" : "outlined"}
                    compact
                    onPress={() => setEntryType(option)}
                  >
                    {entryTypeLabels[option]}
                  </Button>
                ))}
              </View>
              <TextInput
                mode="outlined"
                label="Valor (R$)"
                value={entryAmount}
                onChangeText={(t) => setEntryAmount(maskMoneyInput(t))}
                keyboardType="decimal-pad"
              />
              <TextInput
                mode="outlined"
                label="Data (DD/MM/AAAA)"
                value={paidAt}
                onChangeText={(value) => setPaidAt(maskDate(value))}
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text variant="labelLarge" style={styles.fieldLabel}>
                Forma
              </Text>
              <View style={styles.optionGrid}>
                {methodOptions.map((option) => (
                  <Button
                    key={option}
                    mode={method === option ? "contained" : "outlined"}
                    compact
                    onPress={() => setMethod(option)}
                  >
                    {methodLabels[option]}
                  </Button>
                ))}
              </View>
              <TextInput
                mode="outlined"
                label="Observações"
                value={entryNotes}
                onChangeText={setEntryNotes}
                multiline
              />
              <HelperText type="error" visible={!!entryErr}>
                {entryErr ?? ""}
              </HelperText>
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => setEntryOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={addEntry.isPending}
                  onPress={saveEntry}
                >
                  Registrar
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0, borderRadius: 18, backgroundColor: "#fff" },
  content: { gap: 12 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  headerText: { flex: 1 },
  meta: { opacity: 0.78 },
  grid: { gap: 10 },
  infoRow: { gap: 2 },
  infoLabel: { color: "#64748b" },
  infoValue: { color: "#0f172a", lineHeight: 21 },
  notes: { lineHeight: 21 },
  emptyText: { opacity: 0.78, lineHeight: 21 },
  actions: { alignItems: "flex-start" },
  entries: { gap: 8, paddingTop: 4 },
  entryRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  entryText: { flex: 1, gap: 2 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  fieldLabel: { marginTop: 4 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
