import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '@theme/index';

interface SegmentedControlProps {
  options: [string, string];
  selectedIndex: 0 | 1;
  onChange: (index: 0 | 1) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  return (
    <View style={[styles.container, style]}>
      {(options as string[]).map((label, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.option, isSelected && styles.optionActive]}
            onPress={() => onChange(index as 0 | 1)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  optionTextActive: {
    color: colors.textOnPrimary,
  },
});
