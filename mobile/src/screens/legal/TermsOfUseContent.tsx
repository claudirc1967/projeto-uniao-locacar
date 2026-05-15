import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { TERMS_OF_USE_VERSION } from "../../constants/termsOfUseVersion";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Aceitação",
    body: [
      "Ao criar conta ou utilizar o aplicativo União LocaCar (“App”), você declara ter lido e concordado com estes Termos de Uso. Se não concordar, não utilize o App.",
    ],
  },
  {
    title: "2. O que é o App",
    body: [
      "O App é uma plataforma de intermediação que conecta proprietários de veículos (“locadores”) e motoristas interessados em locação (“locatários”), permitindo cadastro de veículos, solicitações de locação, contratos, vistorias e comunicação entre as partes.",
      "O operador do App não é parte dos contratos de locação celebrados entre locador e locatário, salvo quando expressamente indicado.",
    ],
  },
  {
    title: "3. Cadastro e conta",
    body: [
      "Você deve fornecer informações verdadeiras e mantê-las atualizadas. É sua responsabilidade preservar a confidencialidade da senha e notificar uso não autorizado da conta.",
      "O operador pode recusar, suspender ou encerrar cadastros que violem estes termos, a lei ou representem risco à plataforma ou a terceiros.",
    ],
  },
  {
    title: "4. Uso permitido",
    body: [
      "Utilize o App apenas para finalidades legítimas relacionadas à locação de veículos entre usuários cadastrados.",
      "É proibido publicar conteúdo falso ou enganoso, praticar fraude, assediar outros usuários, burlar sistemas de segurança ou usar o App de forma que prejudique terceiros ou a operação da plataforma.",
    ],
  },
  {
    title: "5. Locações e contratos",
    body: [
      "Valores, prazos, condições de retirada e devolução, caução e demais regras da locação são definidos entre locador e locatário, inclusive por meio de contratos gerados ou anexados no App.",
      "Cada parte é responsável por cumprir obrigações legais aplicáveis (documentação, habilitação, seguro, impostos etc.), conforme o acordado e a legislação vigente.",
    ],
  },
  {
    title: "6. Conteúdo e avaliações",
    body: [
      "Fotos, textos e avaliações enviados por você devem ser pertinentes e respeitar direitos de terceiros. O operador pode remover conteúdo que viole estes termos ou a lei.",
      "Avaliações refletem opinião dos usuários e não constituem endosso do operador.",
    ],
  },
  {
    title: "7. Limitação de responsabilidade",
    body: [
      "O App é fornecido “como está”, dentro das possibilidades técnicas razoáveis. Na extensão permitida pela lei, o operador não se responsabiliza por danos indiretos, lucros cessantes ou disputas entre usuários decorrentes de locações.",
      "Nada nestes termos exclui direitos do consumidor ou responsabilidades que não possam ser limitadas por lei.",
    ],
  },
  {
    title: "8. Alterações e vigência",
    body: [
      `Estes termos estão na versão ${TERMS_OF_USE_VERSION}. Podemos alterá-los; quando exigido, solicitaremos novo aceite no App antes de continuar o uso.`,
      "O uso continuado após publicação de alterações pode constituir aceite, conforme aviso na plataforma e a legislação aplicável.",
    ],
  },
  {
    title: "9. Lei aplicável e contato",
    body: [
      "Estes termos são regidos pelas leis da República Federativa do Brasil. Dúvidas podem ser encaminhadas pelos canais de contato divulgados pelo operador do App.",
    ],
  },
];

export function TermsOfUseBody() {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text
        variant="bodySmall"
        style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
      >
        Versão {TERMS_OF_USE_VERSION}
      </Text>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            {s.title}
          </Text>
          {s.body.map((p, i) => (
            <Text key={i} variant="bodyMedium" style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  meta: { marginBottom: 4 },
  section: { gap: 8 },
  sectionTitle: { fontWeight: "600" },
  paragraph: { lineHeight: 22 },
});
