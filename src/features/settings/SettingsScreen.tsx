import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@shared/components/Button';
import { useSettingsStore } from '@store/settingsStore';
import { testSyncConnection, type ConnectionTestResult } from './testConnection';
import { colors, spacing, typography } from '@theme/index';

export function SettingsScreen() {
  const syncApiUrl = useSettingsStore(s => s.syncApiUrl);
  const hapticEnabled = useSettingsStore(s => s.hapticEnabled);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const autoFocusRFID = useSettingsStore(s => s.autoFocusRFID);
  const setSyncApiUrl = useSettingsStore(s => s.setSyncApiUrl);
  const setHapticEnabled = useSettingsStore(s => s.setHapticEnabled);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setAutoFocusRFID = useSettingsStore(s => s.setAutoFocusRFID);

  const [urlDraft, setUrlDraft] = useState(syncApiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setUrlDraft(syncApiUrl);
  }, [syncApiUrl]);

  const isDirty = urlDraft.trim() !== syncApiUrl;

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSyncConnection(urlDraft);
    setTestResult(result);
    setTesting(false);
  }, [urlDraft]);

  const handleSave = useCallback(() => {
    setSyncApiUrl(urlDraft.trim());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }, [urlDraft, setSyncApiUrl]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Configuración</Text>

        {/* Sincronización */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SINCRONIZACIÓN</Text>

          <Text style={styles.fieldLabel}>URL del servidor</Text>
          <TextInput
            style={styles.textInput}
            placeholder="https://api.ganpro.com"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={urlDraft}
            onChangeText={setUrlDraft}
            returnKeyType="done"
          />

          {testResult && (
            <View
              style={[
                styles.resultBanner,
                testResult.ok ? styles.resultBannerOk : styles.resultBannerErr,
              ]}
            >
              <Text
                style={[
                  styles.resultBannerText,
                  { color: testResult.ok ? colors.success : colors.error },
                ]}
              >
                {testResult.ok
                  ? `Conexión exitosa (${testResult.latencyMs} ms)`
                  : `Falló: ${testResult.error}`}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Button
              label="PROBAR CONEXIÓN"
              onPress={handleTest}
              variant="secondary"
              size="md"
              loading={testing}
              disabled={!urlDraft.trim()}
              style={styles.flexButton}
            />
            <Button
              label={savedFlash ? 'GUARDADO ✓' : 'GUARDAR'}
              onPress={handleSave}
              variant="primary"
              size="md"
              disabled={!isDirty || savedFlash}
              style={styles.flexButton}
            />
          </View>

          {!syncApiUrl && (
            <Text style={styles.hint}>
              Sin URL configurada la app funciona 100% offline.
            </Text>
          )}
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEEDBACK</Text>

          <SettingRow
            title="Vibración háptica"
            description="Vibra al escanear una caravana"
            value={hapticEnabled}
            onChange={setHapticEnabled}
          />
          <SettingRow
            title="Sonido de escaneo"
            description="Beep en escaneos exitosos y fallidos"
            value={soundEnabled}
            onChange={setSoundEnabled}
          />
        </View>

        {/* Escaneo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ESCANEO</Text>

          <SettingRow
            title="Auto-foco del lector RFID"
            description="Mantiene el cursor siempre listo para recibir caravanas"
            value={autoFocusRFID}
            onChange={setAutoFocusRFID}
          />
        </View>

        <Text style={styles.versionText}>GanPro · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function SettingRow({ title, description, value, onChange }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingRowText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primaryDark }}
        thumbColor={value ? colors.primary : colors.textDisabled}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.heavy,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  resultBanner: {
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
  },
  resultBannerOk: {
    backgroundColor: colors.scanSuccess,
    borderColor: colors.success,
  },
  resultBannerErr: {
    backgroundColor: colors.scanError,
    borderColor: colors.error,
  },
  resultBannerText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flexButton: { flex: 1 },
  hint: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: spacing.touchTarget,
    gap: spacing.md,
  },
  settingRowText: { flex: 1 },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  versionText: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
