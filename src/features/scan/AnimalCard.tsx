import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@shared/hooks/useDatabase';
import { StatusBadge } from '@shared/components/StatusBadge';
import { colors, spacing, typography } from '@theme/index';
import AnimalModel from '@data/models/AnimalModel';
import LoteModel from '@data/models/LoteModel';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
import type { CategoriaType } from '@core/constants/categories';
import { format } from 'date-fns';

interface Props {
  rfid: string;
}

export function AnimalCard({ rfid }: Props) {
  const database = useDatabase();
  const [animal, setAnimal] = useState<AnimalModel | null>(null);
  const [lote, setLote] = useState<LoteModel | null>(null);
  const [enCarencia, setEnCarencia] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const results = await database
          .get<AnimalModel>('animals')
          .query(Q.where('id_caravana', rfid))
          .fetch();

        if (!cancelled && results.length > 0) {
          const a = results[0];
          setAnimal(a);

          if (a.loteId) {
            const l = await database.get<LoteModel>('lotes').find(a.loteId);
            if (!cancelled) setLote(l);
          }

          const sanidadRepo = new SanidadRepository(database);
          const carencia = await sanidadRepo.isAnimalEnCarencia(a.id);
          if (!cancelled) setEnCarencia(carencia);
        }
      } catch (error) {
        console.error('[AnimalCard] Load error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [rfid, database]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!animal) return null;

  const edad = animal.fechaNacimiento
    ? `${Math.floor((Date.now() - animal.fechaNacimiento) / (1000 * 60 * 60 * 24 * 365))} años`
    : 'Edad desconocida';

  return (
    <View style={styles.card}>
      {enCarencia && (
        <View style={styles.carenciaBanner}>
          <Text style={styles.carenciaBannerText}>⚠️ EN PERÍODO DE CARENCIA</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.rfid}>{animal.idCaravana}</Text>
        <StatusBadge
          label={animal.categoria}
          categoria={animal.categoria as CategoriaType}
        />
      </View>

      <View style={styles.row}>
        <InfoItem label="Sexo" value={animal.sexo === 'M' ? 'Macho' : 'Hembra'} />
        <InfoItem label="Edad" value={edad} />
        <InfoItem label="Estado" value={animal.estado} />
      </View>

      {lote && (
        <View style={styles.loteRow}>
          <Text style={styles.loteLabel}>Lote</Text>
          <Text style={styles.loteValue}>{lote.nombre}</Text>
          {lote.ubicacion ? (
            <Text style={styles.loteUbicacion}>{lote.ubicacion}</Text>
          ) : null}
        </View>
      )}

      <Text style={styles.registrado}>
        Registrado: {format(animal.createdAt, 'dd/MM/yyyy')}
      </Text>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rfid: {
    color: colors.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  loteRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
  },
  loteLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loteValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  loteUbicacion: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  registrado: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    textAlign: 'right',
  },
  carenciaBanner: {
    backgroundColor: 'rgba(255,170,0,0.15)',
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    alignItems: 'center',
  },
  carenciaBannerText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
});
