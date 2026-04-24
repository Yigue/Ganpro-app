import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing } from '@theme/index';

const { width } = Dimensions.get('window');

interface StockChartProps {
  data: { name: string; population: number; color: string; legendFontColor: string; legendFontSize: number }[];
}

export function StockDistributionChart({ data }: StockChartProps) {
  const [viewType, setViewMode] = useState<'PIE' | 'BAR'>('PIE');

  const barData = {
    labels: data.map(d => d.name.substring(0, 3)),
    datasets: [{ data: data.map(d => d.population) }]
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Distribución de Stock</Text>
        <View style={styles.toggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewType === 'PIE' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('PIE')}
          >
            <Ionicons name="pie-chart" size={14} color={viewType === 'PIE' ? 'white' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewType === 'BAR' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('BAR')}
          >
            <Ionicons name="bar-chart" size={14} color={viewType === 'BAR' ? 'white' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        {viewType === 'PIE' ? (
          <PieChart
            data={data}
            width={width - 40}
            height={180}
            chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute
          />
        ) : (
          <BarChart
            data={barData}
            width={width - 60}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.textSecondary,
              style: { borderRadius: 16 },
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            showValuesOnTopOfBars
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  toggle: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 },
  toggleBtn: { padding: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.primary },
  chartWrapper: { alignItems: 'center', justifyContent: 'center' },
});
