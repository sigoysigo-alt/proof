import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DemoBadge } from '../components/DemoBadge';
import { colors, spacing, typography } from '../constants/theme';
import type { InputKind } from '../types/analysis';

const ANALYSIS_DELAY_MS = 1400;

export default function AnalyzeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: InputKind;
    value?: string;
    imageUri?: string;
  }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/result',
        params: {
          kind: params.kind ?? 'text',
          value: params.value ?? '',
        },
      });
    }, ANALYSIS_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <DemoBadge />
        <ActivityIndicator size="large" color={colors.brand} style={styles.spinner} />
        <Text style={styles.title}>Analizando…</Text>
        <Text style={styles.subtitle}>
          Esta es una pantalla provisional de demostración. En esta fase PROOF
          todavía no realiza ninguna comprobación real: no se consulta ningún
          proveedor externo ni se usa inteligencia artificial.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
