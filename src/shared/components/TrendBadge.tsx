import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, typography } from '@theme/index';

interface TrendBadgeProps {
  /** Percentage change. Positive = up, negative = down, 0 = neutral */
  value: number;
  size?: 'sm' | 'md';
}

/**
 * Displays a trend indicator arrow + percentage.
 * Used in summary cards to show period-over-period change.
 *
 * @example
 *   <TrendBadge value={12.4} />  // ↑ 12.4%  (green)
 *   <TrendBadge value={-3.2} />  // ↓ 3.2%   (red)
 *   <TrendBadge value={0} />     // — 0%     (gray)
 */
export function TrendBadge({ value, size = 'sm' }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const arrow = isPositive ? '↑' : isNegative ? '↓' : '—';
  const color = isPositive ? colors.success : isNegative ? colors.error : colors.textDisabled;
  const bgColor = isPositive ? colors.primaryAlpha : isNegative ? colors.errorAlpha : 'transparent';

  const fontSize = size === 'md' ? typography.sizes.sm : typography.sizes.xs;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color, fontSize }]}>
        {arrow} {Math.abs(value).toFixed(1)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
});
