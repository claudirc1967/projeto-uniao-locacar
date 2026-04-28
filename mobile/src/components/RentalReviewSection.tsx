import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  Icon,
  Text,
  TextInput,
} from "react-native-paper";
import { trpc } from "../api/trpc";
import { trpcErrorMessage } from "../utils/trpcError";

const TAGS_HIGH = ["Pontual", "Comunicação boa", "Veículo em bom estado"];
const TAGS_LOW = ["Atraso", "Comunicação ruim", "Problema no veículo"];

export type RentalReviewState = {
  canSubmit: boolean;
  submitted: {
    stars: number;
    tags: string[];
    comment: string | null;
    createdAt: Date;
  } | null;
};

type Props = {
  rentalId: string;
  review: RentalReviewState;
  role: "OWNER" | "DRIVER";
  title: string;
  onCommentFocus?: () => void;
};

export function RentalReviewSection({
  rentalId,
  review,
  role,
  title,
  onCommentFocus,
}: Props) {
  const utils = trpc.useUtils();
  const [stars, setStars] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const submit = trpc.rentalReview.submit.useMutation({
    onSuccess: async () => {
      setErr(null);
      if (role === "OWNER") {
        await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      } else {
        await utils.driver.getRentalDetail.invalidate({ rentalId });
      }
      await utils.auth.me.invalidate();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const toggleTag = (t: string) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const onSubmit = () => {
    if (stars == null) {
      setErr("Toque nas estrelas para dar uma nota de 1 a 5.");
      return;
    }
    setErr(null);
    submit.mutate({
      rentalId,
      stars,
      tags: selectedTags.length ? selectedTags : undefined,
      comment: comment.trim() || undefined,
    });
  };

  if (skipped) {
    return null;
  }

  if (review.submitted) {
    const s = review.submitted;
    return (
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="titleMedium">Sua avaliação</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Icon
                key={n}
                source={s.stars >= n ? "star" : "star-outline"}
                size={28}
                color={s.stars >= n ? "#f59e0b" : "#cbd5e1"}
              />
            ))}
          </View>
          {s.tags.length > 0 ? (
            <View style={styles.chips}>
              {s.tags.map((t) => (
                <Chip key={t} style={styles.chip} compact>
                  {t}
                </Chip>
              ))}
            </View>
          ) : null}
          {s.comment ? (
            <Text variant="bodyMedium" style={styles.commentRead}>
              {s.comment}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    );
  }

  if (!review.canSubmit) {
    return null;
  }

  const tagList = stars != null && stars >= 4 ? TAGS_HIGH : TAGS_LOW;

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodySmall" style={styles.hint}>
          Avaliação rápida: estrelas obrigatórias; chips e texto são opcionais.
        </Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setStars(n);
                setSelectedTags([]);
              }}
              hitSlop={8}
            >
              <Icon
                source={stars != null && stars >= n ? "star" : "star-outline"}
                size={36}
                color={
                  stars != null && stars >= n ? "#f59e0b" : "#94a3b8"
                }
              />
            </Pressable>
          ))}
        </View>
        {stars != null ? (
          <>
            <Text variant="labelLarge" style={styles.tagsLabel}>
              {stars >= 4
                ? "Destaques (opcional)"
                : "O que não foi bem? (opcional)"}
            </Text>
            <View style={styles.chips}>
              {tagList.map((t) => (
                <Chip
                  key={t}
                  selected={selectedTags.includes(t)}
                  onPress={() => toggleTag(t)}
                  style={styles.chip}
                >
                  {t}
                </Chip>
              ))}
            </View>
          </>
        ) : null}
        <TextInput
          mode="outlined"
          label="Comentário (opcional)"
          value={comment}
          onChangeText={setComment}
          onFocus={onCommentFocus}
          multiline
          style={styles.commentInput}
        />
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => setSkipped(true)}
            disabled={submit.isPending}
          >
            Pular
          </Button>
          <Button mode="contained" onPress={onSubmit} loading={submit.isPending}>
            Enviar
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 0, borderRadius: 18, backgroundColor: "#fff" },
  content: { gap: 8 },
  hint: { marginTop: 6, opacity: 0.85, marginBottom: 8 },
  starRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  tagsLabel: { marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginVertical: 2 },
  commentInput: { marginTop: 12, minHeight: 80 },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  commentRead: { marginTop: 12, lineHeight: 22 },
});
