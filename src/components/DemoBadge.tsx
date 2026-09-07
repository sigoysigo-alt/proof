import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

/**
 * Distintivo obligatorio para dejar claro que un resultado es de
 * demostración y no una verificación real (docs/PRODUCT_SPEC.md, sección 38).
 */
export function DemoBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>DEMO · Sin verificación real</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.demoBackground,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.caption,
    color: colors.demo,
  },
});
