import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import RacionModel from '@data/models/RacionModel';

interface Props {
  visible: boolean;
  onClose: () => void;
  racion: RacionModel | null;
}

export function RacionCalculadoraModal({ visible, onClose, racion }: Props) {
  const [nAnimales, setNAnimales] = useState('50');
  const [kgDia, setKgDia] = useState('');
  const [precioCarne, setPrecioCarne] = useState('');
  const [gdp, setGdp] = useState('0.8');

  useEffect(() => {
    if (racion && (racion.kgDiaAnimal ?? 0) > 0) {
      setKgDia(String(racion.kgDiaAnimal));
    }
  }, [racion?.id]);

  const costoKg = racion?.costoEstimadoKg ?? 0;
  const kgDiaPlaceholder = (racion?.kgDiaAnimal ?? 0) > 0 ? String(racion!.kgDiaAnimal) : '5';

  const calc = useMemo(() => {
    const n = parseFloat(nAnimales) || 0;
    const kg = parseFloat(kgDia || kgDiaPlaceholder) || 0;
    const precio = parseFloat(precioCarne) || 0;
    const gdpVal = parseFloat(gdp) || 0;

    const consumoDiario = n * kg;
    const costoTotalDia = consumoDiario * costoKg;
    const costoTotalMes = costoTotalDia * 30;
    const kgGanadosMes = gdpVal * 30 * n;
    const ingresoMes = kgGanadosMes * precio;
    const margenMes = ingresoMes - costoTotalMes;
    const costoPorKgProducido = kgGanadosMes > 0 ? costoTotalMes / kgGanadosMes : 0;

    return { consumoDiario, costoTotalDia, costoTotalMes, kgGanadosMes, ingresoMes, margenMes, costoPorKgProducido };
  }, [nAnimales, kgDia, precioCarne, gdp, costoKg, kgDiaPlaceholder]);

  if (!racion) return null;

  const showRentabilidad = (parseFloat(precioCarne) || 0) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.title}>Calculadora de Raciones</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {racion.nombre} · ${costoKg.toFixed(3)}/kg
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>PARÁMETROS</Text>
            <View style={styles.inputGrid}>
              <InputBox label="Nº Animales" value={nAnimales} onChange={setNAnimales} placeholder="50" />
              <InputBox label="kg/Animal/Día" value={kgDia} onChange={setKgDia} placeholder={kgDiaPlaceholder} />
              <InputBox label="Precio Carne ($/kg)" value={precioCarne} onChange={setPrecioCarne} placeholder="0" />
              <InputBox label="GDP (kg/día/animal)" value={gdp} onChange={setGdp} placeholder="0.8" />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>COSTOS (30 DÍAS)</Text>
            <View style={styles.resultsBox}>
              <ResultRow label="Consumo total / día" value={`${calc.consumoDiario.toFixed(0)} kg`} />
              <ResultRow label="Costo alimentación / día" value={`$${calc.costoTotalDia.toFixed(2)}`} />
              <ResultRow label="Costo alimentación / mes" value={`$${calc.costoTotalMes.toFixed(2)}`} highlight />
            </View>

            {showRentabilidad && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>RENTABILIDAD (30 DÍAS)</Text>
                <View style={styles.resultsBox}>
                  <ResultRow label="Kg ganados / mes (lote)" value={`${calc.kgGanadosMes.toFixed(1)} kg`} />
                  <ResultRow label="Ingreso estimado / mes" value={`$${calc.ingresoMes.toFixed(2)}`} />
                  <ResultRow
                    label="Margen neto / mes"
                    value={`$${calc.margenMes.toFixed(2)}`}
                    highlight
                    color={calc.margenMes >= 0 ? colors.primary : colors.error}
                  />
                  <ResultRow label="Costo / kg producido" value={`$${calc.costoPorKgProducido.toFixed(3)}/kg`} />
                </View>
              </>
            )}

            {!showRentabilidad && (
              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.hintText}>Ingresá el precio de la carne para ver la rentabilidad</Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function InputBox({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
      />
    </View>
  );
}

function ResultRow({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && styles.resultValueBig, color ? { color } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  content: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '92%',
  },
  handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  closeIcon: { padding: 4 },
  sectionLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inputBox: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  input: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  resultsBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultLabel: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  resultValue: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  resultValueBig: { fontSize: 16 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  closeBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  closeBtnText: { color: colors.background, fontWeight: 'bold', fontSize: 16 },
});
