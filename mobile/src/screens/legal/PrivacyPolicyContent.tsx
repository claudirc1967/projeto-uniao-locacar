import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { PRIVACY_POLICY_VERSION } from "../../constants/privacyPolicyVersion";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Quem somos",
    body: [
      "Este aplicativo (“App”) é operado para conectar proprietários de veículos e motoristas interessados em locação. O tratamento dos seus dados pessoais observa a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).",
    ],
  },
  {
    title: "2. Quais dados coletamos",
    body: [
      "Dados de cadastro e conta: e-mail, senha (armazenada de forma criptografada), papel (proprietário ou motorista).",
      "Dados de proprietário: nome ou razão social, CPF ou CNPJ, telefone, endereço e dados usados em contratos.",
      "Dados de motorista: nome, documentos e informações de habilitação e endereço quando informados no cadastro.",
      "Dados de veículos e locações: descrição do veículo, fotos enviadas por você, valores, prazos e textos de contrato.",
      "Dados de parceiros que você cadastra (nome, contato e observações).",
      "Avaliações e comentários relacionados às locações.",
      "Dados técnicos: identificadores de sessão (token) no dispositivo para manter o login.",
    ],
  },
  {
    title: "3. Finalidades",
    body: [
      "Criar e gerenciar sua conta, autenticar o acesso e exibir o perfil adequado (proprietário ou motorista).",
      "Permitir cadastro e exibição de veículos, solicitações de locação, contratos e comunicação entre as partes.",
      "Cumprir obrigações legais e regulatórias aplicáveis.",
      "Melhorar a segurança, prevenir fraudes e resolver problemas técnicos.",
    ],
  },
  {
    title: "4. Compartilhamento",
    body: [
      "Os dados necessários à operação da locação podem ser visíveis entre proprietário e motorista dentro do App, conforme as funcionalidades (por exemplo, dados de contato ou documentos exigidos para análise).",
      "Podemos utilizar prestadores de serviço (hospedagem, armazenamento de arquivos, infraestrutura) que tratam dados em nosso nome, mediante contratos e medidas de segurança compatíveis com a LGPD.",
      "Não vendemos seus dados pessoais.",
    ],
  },
  {
    title: "5. Armazenamento e segurança",
    body: [
      "Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acessos não autorizados, perda ou destruição acidental.",
      "Fotos e alguns documentos podem ser armazenados em serviços de nuvem; senhas não são armazenadas em texto puro.",
    ],
  },
  {
    title: "6. Seus direitos (LGPD)",
    body: [
      "Você pode solicitar confirmação de tratamento, acesso, correção, anonimização ou eliminação de dados desnecessários, informações sobre compartilhamentos e outras medidas previstas na lei, mediante canal de contato divulgado pelo responsável pelo tratamento.",
      "Para excluir sua conta pelo App, utilize a opção “Excluir minha conta”, quando disponível; a exclusão remove seu cadastro e dados associados na medida possível, ressalvadas retenções legais.",
    ],
  },
  {
    title: "7. Retenção",
    body: [
      "Mantemos os dados pelo tempo necessário para as finalidades descritas e para cumprimento de obrigações legais (por exemplo, obrigações fiscais ou contratuais), após o que podem ser eliminados ou anonimizados.",
    ],
  },
  {
    title: "8. Atualizações",
    body: [
      `Esta política está na versão ${PRIVACY_POLICY_VERSION}. Podemos atualizá-la; nesse caso, solicitaremos novo aceite no App quando exigido.`,
    ],
  },
];

export function PrivacyPolicyBody() {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="bodySmall" style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
        Versão {PRIVACY_POLICY_VERSION}
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
