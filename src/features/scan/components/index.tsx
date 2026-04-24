import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';
import type { QueueItem } from '@store/scanStore';
import { StatusBadge } from '@shared/components/StatusBadge';
import { type CategoriaType } from '@core/constants/categories';

// ── Segmented Control ────────────────────────────────────────────────────────

export const SegmentedControl = ({ options, selectedIndex, onChange, style }: any) => (
  <View style={[styles.segmentContainer, style]}>
    {options.map((opt: string, i: number) => (
      <TouchableOpacity 
        key={opt}
        style={[styles.segmentBtn, selectedIndex === i && styles.segmentBtnActive]}
        onPress={() => onChange(i)}
      >
        <Text style={[styles.segmentText, selectedIndex === i && styles.segmentTextActive]}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Individual Mode View (The "Big Card") ─────────────────────────────────────

export const IndividualModeView = ({ phase, currentRfid }: { phase: string, currentRfid: string | null }) => {
  const isIdle = phase === 'idle';
  const isScanning = phase === 'scanning';
  const isFound = phase === 'found';
  const isNotFound = phase === 'not_found';

  return (
    <View style={styles.individualContainer}>
      <View style={[
        styles.mainRfidCard, 
        isFound && styles.cardFound, 
        isNotFound && styles.cardNotFound,
        isScanning && styles.cardScanning
      ]}>
        <Ionicons 
          name={isFound ? "checkmark-circle" : isNotFound ? "help-circle" : "barcode-outline"} 
          size={48} 
          color={isFound ? colors.primary : isNotFound ? colors.warning : colors.textSecondary} 
        />
        <Text style={styles.mainRfidText}>
          {currentRfid || 'ESPERANDO TAG...'}
        </Text>
        <Text style={styles.statusLabel}>
          {isFound ? 'ANIMAL IDENTIFICADO' : isNotFound ? 'ANIMAL NO REGISTRADO' : 'APROXIME EL LECTOR'}
        </Text>
      </View>

      {isFound && (
        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoBox}>
            <Text style={styles.quickInfoLabel}>PESO EST.</Text>
            <Text style={styles.quickInfoValue}>380 kg</Text>
          </View>
          <View style={styles.quickInfoBox}>
            <Text style={styles.quickInfoLabel}>CARENCIA</Text>
            <Text style={[styles.quickInfoValue, { color: colors.primary }]}>LIMPIO</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ── Session Queue View (The "Digital Race") ──────────────────────────────────

export const SessionQueueView = ({ queue, onClear, onProcess, onBulkRegister, onItemPress }: any) => {
  const unknownCount = queue.filter((i: any) => i.status === 'pending_registration').length;

  return (
    <View style={styles.queueContainer}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>COLA DE ESCANEO ({queue.length})</Text>
        <TouchableOpacity onPress={onClear}>
          <Text style={styles.clearText}>LIMPIAR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.queueScroll} contentContainerStyle={{ paddingBottom: 20 }}>
        {queue.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Ionicons name=" people-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyQueueText}>La manga está vacía. Escanee para empezar.</Text>
          </View>
        ) : (
          queue.map((item: QueueItem, index: number) => (
            <TouchableOpacity 
              key={`${item.rfid}-${index}`} 
              style={[styles.queueItem, item.status === 'pending_registration' && styles.queueItemUnknown]}
              onPress={() => onItemPress(item)}
            >
              <View style={styles.queueItemIndex}><Text style={styles.indexText}>{queue.length - index}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueRfid}>{item.rfid}</Text>
                <Text style={styles.queueSub}>{item.categoria || 'Desconocido'}</Text>
              </View>
              {item.status === 'pending_registration' ? (
                <Ionicons name="warning" size={20} color={colors.warning} />
              ) : (
                <StatusBadge label="OK" categoria="Vaca" />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.queueActions}>
        {unknownCount > 0 && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warning }]} onPress={onBulkRegister}>
            <Text style={styles.actionBtnText}>REGISTRAR {unknownCount} NUEVOS</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colors.primary }]} 
          onPress={onProcess}
          disabled={queue.length === 0}
        >
          <Text style={styles.actionBtnText}>APLICAR ACCIÓN A {queue.length}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Batch Mode View (Pre-Session) ───────────────────────────────────────────

export const BatchModeView = ({ ensureFocus }: any) => (
  <View style={styles.batchIdleContainer}>
    <Ionicons name="layers-outline" size={80} color={colors.textDisabled} />
    <Text style={styles.batchIdleTitle}>Modo Lote</Text>
    <Text style={styles.batchIdleSub}>Inicie una sesión para escanear múltiples animales y procesarlos en conjunto.</Text>
  </View>
);

export * from './ItemDetailModal';

const styles = StyleSheet.create({
  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: colors.background },

  individualContainer: { flex: 1, width: '100%', justifyContent: 'center' },
  mainRfidCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardFound: { borderColor: colors.primary, backgroundColor: 'rgba(0,214,143,0.05)' },
  cardNotFound: { borderColor: colors.warning, backgroundColor: 'rgba(255,170,0,0.05)' },
  cardScanning: { borderColor: colors.info },
  mainRfidText: { color: colors.textPrimary, fontSize: 28, fontWeight: 'bold', marginTop: 20, letterSpacing: 1 },
  statusLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  quickInfoRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  quickInfoBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border },
  quickInfoLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  quickInfoValue: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  queueContainer: { flex: 1, width: '100%' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  queueTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  clearText: { color: colors.error, fontSize: 12, fontWeight: 'bold' },
  queueScroll: { flex: 1 },
  queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  queueItemUnknown: { borderColor: colors.warning },
  queueItemIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexText: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  queueRfid: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  queueSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  emptyQueue: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
  emptyQueueText: { color: colors.textSecondary, textAlign: 'center', marginTop: 10 },

  queueActions: { gap: 10, marginTop: 10 },
  actionBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: colors.background, fontWeight: 'bold', fontSize: 14 },

  batchIdleContainer: { alignItems: 'center', padding: 40 },
  batchIdleTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  batchIdleSub: { color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 14, lineHeight: 20 },
});
