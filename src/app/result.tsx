import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DemoBadge } from '../components/DemoBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  classificationColors,
  classificationEmoji,
  classificationLabels,
} from '../constants/classification';
import { colors, radius, spacing, typography } from '../constants/theme';
import { pickDemoResult } from '../data/demoResults';
import type { InputKind } from '../types/analysis';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: InputKind; value?: string }>();

  const result = useMemo(
    () => pickDemoResult(`${params.kind ?? ''}:${params.value ?? ''}`),
    [params.kind, params.value],
  );

  const palette = classificationColors[result.classification];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <DemoBadge />

        <View style={[styles.classificationCard, { backgroundColor: palette.background }]}>
          <Text style={[styles.classificationLabel, { color: palette.text }]}>
            {classificationEmoji[result.classification]}{' '}
            {classificationLabels[result.classification].toUpperCase()}
          </Text>
          {result.score !== null && (
            <Text style={[styles.score, { color: palette.text }]}>
              {result.score}/100
            </Text>
          )}
          <Text style={[styles.headline, { color: palette.text }]}>
            {result.headline}
          </Text>
        </View>

        <Section title="Qué hacer ahora">
          <Text style={styles.bodyText}>{result.recommendedAction}</Text>
        </Section>

        <Section title="¿Por qué?">
          {result.reasons.map((reason) => (
            <Text key={reason} style={styles.listItem}>
              • {reason}
            </Text>
          ))}
        </Section>

        <Section title="Fuentes consultadas">
          {result.sourcesChecked.map((source) => (
            <Text key={source} style={styles.listItem}>
              ✓ {source}
            </Text>
          ))}
          {result.sourcesNotApplicable.map((source) => (
            <Text key={source} style={styles.listItemMuted}>
              ✗ {source} — no aplicable
            </Text>
          ))}
        </Section>

        <Section title="Qué no hemos podido comprobar">
          {result.notVerified.map((item) => (
            <Text key={item} style={styles.listItemMuted}>
              • {item}
            </Text>
          ))}
        </Section>

        <Text style={styles.disclaimer}>
          Este resultado es una demostración con datos ficticios. No proviene
          de ninguna verificación real: en esta fase PROOF todavía no
          consulta providers externos ni utiliza inteligencia artificial.
        </Text>

        <PrimaryButton label="Verificar otra cosa" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  classificationCard: {
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  classificationLabel: {
    ...typography.bodyStrong,
    letterSpacing: 0.5,
  },
  score: {
    ...typography.title,
  },
  headline: {
    ...typography.headline,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionBody: {
    gap: spacing.xs,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  listItem: {
    ...typography.body,
    color: colors.textPrimary,
  },
  listItemMuted: {
    ...typography.body,
    color: colors.textMuted,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
