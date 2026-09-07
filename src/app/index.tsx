import { useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../constants/theme';

const EXAMPLES = [
  'Tienda online',
  'SMS',
  'WhatsApp',
  'Email',
  'Vendedor',
  'Oferta de trabajo',
];

export default function HomeScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const canVerify = useMemo(
    () => text.trim().length > 0 || Boolean(imageUri),
    [text, imageUri],
  );

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  }

  function handleRemoveImage() {
    setImageUri(undefined);
  }

  function handleVerify() {
    if (!canVerify) {
      return;
    }
    Keyboard.dismiss();
    if (imageUri) {
      router.push({
        pathname: '/analyze',
        params: { kind: 'image', value: text.trim(), imageUri },
      });
      return;
    }
    const trimmed = text.trim();
    const looksLikeUrl = /^(https?:\/\/|www\.)\S+$/i.test(trimmed);
    router.push({
      pathname: '/analyze',
      params: { kind: looksLikeUrl ? 'url' : 'text', value: trimmed },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>PROOF</Text>
            <Text style={styles.title}>¿Te puedes fiar?</Text>
            <Text style={styles.subtitle}>
              Pega un enlace, sube una captura o envíanos el mensaje.
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Pega aquí el mensaje o el enlace…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />

            {imageUri ? (
              <View style={styles.imagePreviewRow}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <Pressable onPress={handleRemoveImage} hitSlop={8}>
                  <Text style={styles.removeImage}>Quitar imagen</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={handlePickImage}
                style={styles.uploadButton}
              >
                <Text style={styles.uploadButtonText}>Subir captura o imagen</Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            label="VERIFICAR"
            onPress={handleVerify}
            disabled={!canVerify}
          />

          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Por ejemplo</Text>
            <View style={styles.examplesRow}>
              {EXAMPLES.map((example) => (
                <View key={example} style={styles.exampleChip}>
                  <Text style={styles.exampleText}>{example}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  brand: {
    ...typography.caption,
    color: colors.brand,
    letterSpacing: 2,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 120,
  },
  uploadButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  uploadButtonText: {
    ...typography.bodyStrong,
    color: colors.brand,
  },
  imagePreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  imagePreview: {
    borderRadius: radius.sm,
    height: 64,
    width: 64,
  },
  removeImage: {
    ...typography.caption,
    color: colors.riskHigh,
  },
  examplesSection: {
    gap: spacing.sm,
  },
  examplesTitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exampleChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  exampleText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
