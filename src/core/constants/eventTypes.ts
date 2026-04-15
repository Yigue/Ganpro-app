export const EVENTO_TIPO = {
  PESAJE: 'PESAJE',
  VACUNACION: 'VACUNACION',
  CAMBIO_LOTE: 'CAMBIO_LOTE',
  TACTO: 'TACTO',
  OTRO: 'OTRO',
} as const;

export type EventoTipoType = (typeof EVENTO_TIPO)[keyof typeof EVENTO_TIPO];
