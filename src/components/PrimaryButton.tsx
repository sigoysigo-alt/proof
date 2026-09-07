import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    width: '100%',
  },
  buttonPressed: {
    backgroundColor: colors.brandPressed,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.onBrand,
  },
});
