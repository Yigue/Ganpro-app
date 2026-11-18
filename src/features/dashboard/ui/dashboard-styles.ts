import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  scrollContent: { paddingBottom: spacing.xxl },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  gdpValue: {
    color: colors.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  semaforoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  eventoIcon: { fontSize: 22 },
  eventoInfo: { flex: 1 },
  eventoTipo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  eventoAnimal: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  eventoTime: { color: colors.textDisabled, fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
});
