import React from 'react';
import {View,Text} from 'react-native';
import {format} from 'date-fns';
import {es} from 'date-fns/locale';
import {colors} from '@theme/index';
import type {EventoTipoType} from '@core/constants/eventTypes';
import type EventoModel from '@data/models/EventoModel';
import {styles} from './dashboard-styles';
const TIPO_META: Record<EventoTipoType, { icon: string; color: string }> = {
  PESAJE: { icon: '⚖️', color: colors.info },
  VACUNACION: { icon: '💉', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', color: colors.primary },
  TACTO: { icon: '🔬', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

export function EventoRow({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;
  return (
    <View style={styles.eventoRow}>
      <Text style={styles.eventoIcon}>{meta.icon}</Text>
      <View style={styles.eventoInfo}>
        <Text style={[styles.eventoTipo, { color: meta.color }]}>{evento.tipo}</Text>
        <Text style={styles.eventoAnimal}>Animal: {evento.animalId.slice(0, 8)}…</Text>
      </View>
      <Text style={styles.eventoTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
  );
}
