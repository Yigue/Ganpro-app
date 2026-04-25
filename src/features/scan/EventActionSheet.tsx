import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import type AnimalModel from '@data/models/AnimalModel';
import type LoteModel from '@data/models/LoteModel';
import { AnimalMovementService } from '@core/services/AnimalMovementService';
import { SanitaryOperationService } from '@core/services/SanitaryOperationService';
import { ReproductionService } from '@core/services/ReproductionService';
import { WeightService } from '@core/services/WeightService';
import { CATEGORIAS_MACHO, CATEGORIAS_HEMBRA, type CategoriaType } from '@core/constants/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Q } from '@nozbe/watermelondb';

interface Props {
  visible: boolean;
  rfid: string;
  onClose: () => void;
}

const ACTIONS: { tipo: EventoTipoType; label: string; icon: string; color: string }[] = [
  { tipo: EVENTO_TIPO.PESAJE, label: 'Pesaje', icon: '⚖️', color: colors.info },
  { tipo: EVENTO_TIPO.VACUNACION, label: 'Vacunación', icon: '💉', color: colors.warning },
  { tipo: EVENTO_TIPO.CAMBIO_LOTE, label: 'Cambio de Lote', icon: '🔀', color: colors.primary },
  { tipo: EVENTO_TIPO.TACTO, label: 'Tacto', icon: '🔬', color: colors.purple },
  { tipo: EVENTO_TIPO.OTRO, label: 'Otro', icon: '📋', color: colors.textSecondary },
];

type TactoResultado = 'PREÑADA' | 'VACIA' | null;
type LocalAction = EventoTipoType | 'CAMBIO_CATEGORIA';

export function EventActionSheet({ visible, rfid, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const database = useDatabase();
  const { triggerSelection, triggerSuccess } = useHapticFeedback();

  const [animal, setAnimal] = useState<AnimalModel | null>(null);
  const [selectedAction, setSelectedAction] = useState<LocalAction | null>(null);
  const [peso, setPeso] = useState('');
  const [notas, setNotas] = useState('');
  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaType | null>(null);
  const [tactoResultado, setTactoResultado] = useState<TactoResultado>(null);
  const [saving, setSaving] = useState(false);

  const enCarencia = useMemo(() => {
    return animal?.lastWeightDate && new Date() < animal.lastWeightDate;
  }, [animal]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedAction(null);
      setPeso('');
      setNotas('');
      setLoteDestinoId(null);
      setNuevaCategoria(null);
      setTactoResultado(null);

      void (async () => {
        try {
          const [foundAnimals, loadedLotes] = await Promise.all([
            database.get<AnimalModel>('animals').query(Q.where('rfid', rfid)).fetch(),
            database.get<LoteModel>('lotes').query().fetch(),
          ]);

          setAnimal(foundAnimals[0] || null);
          setLotes(loadedLotes);
        } catch (e) {
          console.error('[EventActionSheet] load error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, rfid, database]);

  const handleSave = useCallback(async () => {
    if (!selectedAction || !animal) return;
    setSaving(true);
    try {
      switch (selectedAction) {
        case EVENTO_TIPO.CAMBIO_LOTE:
          if (loteDestinoId) {
            await AnimalMovementService.transferAnimals([animal.id], loteDestinoId);
          }
          break;
        case EVENTO_TIPO.VACUNACION:
          await SanitaryOperationService.applyTreatment([animal.id], 'demo-vacuna-id', 1);
          break;
        case EVENTO_TIPO.TACTO:
          if (tactoResultado) {
            await ReproductionService.registerTacto(animal.id, tactoResultado);
          }
          break;
        case EVENTO_TIPO.PESAJE:
          await WeightService.registerWeight(animal.id, parseFloat(peso));
          break;
        default:
          Alert.alert('Info', 'Acción no implementada aún con Application Services.');
      }

      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[EventActionSheet] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el evento.');
    } finally {
      setSaving(false);
    }
  }, [selectedAction, animal, database, peso, loteDestinoId, tactoResultado, triggerSuccess, onClose]);

  const isSaveEnabled =
    selectedAction !== null &&
    (selectedAction !== EVENTO_TIPO.PESAJE || peso.length > 0) &&
    (selectedAction !== EVENTO_TIPO.CAMBIO_LOTE || loteDestinoId !== null) &&
    (selectedAction !== EVENTO_TIPO.VACUNACION || !enCarencia) &&
    !saving;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Registrar Evento</Text>
        <Text style={styles.rfidText}>{animal?.idCaravana ?? rfid}</Text>

        {enCarencia && animal?.lastWeightDate && (
          <View style={styles.carenciaBanner}>
            <Text style={styles.carenciaBannerTitle}>⚠️ EN CARENCIA</Text>
            <Text style={styles.carenciaBannerBody}>
              Libre el {format(animal.lastWeightDate, 'dd/MM/yyyy', { locale: es })}
            </Text>
            <Text style={styles.carenciaBannerSub}>
              Acciones sanitarias y de venta bloqueadas preventivamente.
            </Text>
          </View>
        )}

        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => {
            const isDisabled = action.tipo === EVENTO_TIPO.VACUNACION && enCarencia;
            return (
              <TouchableOpacity
                key={action.tipo}
                style={[
                  styles.actionButton,
                  selectedAction === action.tipo && { borderColor: action.color, backgroundColor: `${action.color}20` },
                  isDisabled && styles.actionButtonDisabled,
                ]}
                onPress={() => {
                  if (isDisabled) return;
                  triggerSelection();
                  setSelectedAction(action.tipo);
                }}
                activeOpacity={isDisabled ? 1 : 0.8}
              >
                <Text style={[styles.actionIcon, isDisabled && styles.actionIconDisabled]}>{action.icon}</Text>
                <Text style={[styles.actionLabel, selectedAction === action.tipo && { color: action.color }, isDisabled && styles.actionLabelDisabled]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedAction === EVENTO_TIPO.PESAJE && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>PESO (kg)</Text>
            <RNTextInput
              style={styles.textInput}
              placeholder="Ej: 320"
              keyboardType="numeric"
              value={peso}
              onChangeText={setPeso}
            />
          </View>
        )}

        {selectedAction === EVENTO_TIPO.CAMBIO_LOTE && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>LOTE DESTINO</Text>
            <View style={styles.loteGrid}>
              {lotes.filter(l => l.id !== animal?.loteId).map((lote) => (
                <TouchableOpacity
                  key={lote.id}
                  style={[styles.loteOption, loteDestinoId === lote.id && styles.loteOptionSelected]}
                  onPress={() => setLoteDestinoId(lote.id)}
                >
                  <Text style={[styles.loteOptionText, loteDestinoId === lote.id && styles.loteOptionTextSelected]}>
                    {lote.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedAction === EVENTO_TIPO.TACTO && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>RESULTADO TACTO</Text>
            <View style={styles.tactoRow}>
              <TouchableOpacity
                style={[styles.tactoBtn, tactoResultado === 'PREÑADA' && styles.tactoBtnPrenada]}
                onPress={() => setTactoResultado('PREÑADA')}
              >
                <Text style={styles.tactoBtnText}>PREÑADA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tactoBtn, tactoResultado === 'VACIA' && styles.tactoBtnVacia]}
                onPress={() => setTactoResultado('VACIA')}
              >
                <Text style={styles.tactoBtnText}>VACÍA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Button
          label="REGISTRAR"
          onPress={handleSave}
          size="lg"
          disabled={!isSaveEnabled}
          loading={saving}
          style={styles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceElevated },
  indicator: { backgroundColor: colors.border, width: 40 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  rfidText: { color: colors.primary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  carenciaBanner: { backgroundColor: colors.errorAlpha, borderWidth: 1, borderColor: colors.error, borderRadius: 12, padding: spacing.md, gap: 4 },
  carenciaBannerTitle: { color: colors.error, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  carenciaBannerBody: { color: colors.error, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  carenciaBannerSub: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { width: '30%', flexGrow: 1, minHeight: 80, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  actionButtonDisabled: { opacity: 0.3 },
  actionIcon: { fontSize: 24 },
  actionIconDisabled: { opacity: 0.5 },
  actionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  actionLabelDisabled: { color: colors.textDisabled },
  fieldSection: { gap: spacing.sm, marginTop: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  textInput: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', paddingHorizontal: spacing.md, height: 50 },
  loteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loteOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  loteOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  loteOptionText: { color: colors.textSecondary, fontSize: 14 },
  loteOptionTextSelected: { color: colors.primary, fontWeight: 'bold' },
  tactoRow: { flexDirection: 'row', gap: spacing.sm },
  tactoBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tactoBtnPrenada: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  tactoBtnVacia: { borderColor: colors.error, backgroundColor: colors.errorAlpha },
  tactoBtnText: { fontWeight: 'bold' },
  saveButton: { marginTop: spacing.lg },
});
