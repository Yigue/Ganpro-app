import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

interface CalendarDay {
  date: string; // 'YYYY-MM-DD'
  hasScheduled: boolean;
  hasCompleted: boolean;
}

interface SanidadCalendarProps {
  /** Year and month to display, format: 'YYYY-MM' */
  yearMonth: string;
  /** Days that have events, pre-computed by container */
  days: CalendarDay[];
  /** Currently selected date */
  selectedDate: string | null;
  /** Callback when user taps a day */
  onDateSelect: (date: string) => void;
}

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Pure presentational mini-calendar for Sanidad module.
 * Shows a 7-column grid with dot indicators for scheduled/completed operations.
 */
export function SanidadCalendar({
  yearMonth,
  days,
  selectedDate,
  onDateSelect,
}: SanidadCalendarProps) {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.monthLabel}>
        {MONTH_NAMES[month - 1]} {year}
      </Text>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`e-${idx}`} style={styles.cell} />;
          }
          const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
          const info = dayMap.get(dateStr);
          const isSelected = selectedDate === dateStr;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => onDateSelect(dateStr)}
              accessibilityLabel={`Día ${day}`}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                {day}
              </Text>
              {/* Dot indicators */}
              <View style={styles.dots}>
                {info?.hasScheduled && <View style={[styles.dot, styles.dotScheduled]} />}
                {info?.hasCompleted && <View style={[styles.dot, styles.dotCompleted]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotScheduled]} />
          <Text style={styles.legendText}>Programada</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotCompleted]} />
          <Text style={styles.legendText}>Realizada</Text>
        </View>
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as unknown as number,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontVariant: ['tabular-nums'],
  },
  dayTextSelected: {
    color: '#000',
    fontWeight: typography.weights.bold,
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    height: 4,
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotScheduled: { backgroundColor: '#F59E0B' },
  dotCompleted: { backgroundColor: colors.primary },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { color: colors.textSecondary, fontSize: typography.sizes.xs },
});
