import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { colors, spacing, typography } from '@theme/index';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
  resetKey: number;
}

/**
 * Catches render-time errors from WatermelonDB observable subscriptions
 * (e.g. withObservables HOC, Q.experimentalJoinTables schema mismatches).
 * Shows a retry button that resets its subtree by bumping a key.
 */
export class ObservableErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ObservableErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    const { error, resetKey } = this.state;
    const { children, fallbackTitle } = this.props;

    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>{fallbackTitle ?? 'Error al cargar datos'}</Text>
          <Text style={styles.message}>{error.message}</Text>
          <Button
            label="REINTENTAR"
            onPress={this.handleRetry}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      );
    }

    return <React.Fragment key={resetKey}>{children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  icon: { fontSize: 48 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
    minWidth: 180,
  },
});
