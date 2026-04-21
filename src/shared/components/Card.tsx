import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '@theme/index';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', onPress, style }: CardProps) {
  const bg = variant === 'elevated' ? colors.surfaceElevated : colors.surface;
  const combined = [styles.base, { backgroundColor: bg }, style];

  if (onPress != null) {
    return (
      <TouchableOpacity
        style={combined}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combined}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
