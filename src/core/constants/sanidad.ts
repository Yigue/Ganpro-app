export const VIA_ADMINISTRACION = {
  IM: 'Intramuscular',
  SC: 'Subcutánea',
  IV: 'Intravenosa',
  ORAL: 'Oral',
  TOPICA: 'Tópica',
} as const;

export const TIPO_SUPLEMENTO = {
  MAIZ: 'Maíz',
  SILO: 'Silo',
  HENO: 'Heno',
  PELLET: 'Pellet',
  UREA: 'Urea',
  OTRO: 'Otro',
} as const;

export const ESTADO_PROTOCOLO = {
  ACTIVO: 'ACTIVO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO',
} as const;

export const TIPO_MOVIMIENTO = {
  GASTO: 'GASTO',
  INGRESO: 'INGRESO',
} as const;

export const CATEGORIA_MOVIMIENTO = {
  SANIDAD: 'SANIDAD',
  NUTRICION: 'NUTRICION',
  ALQUILER: 'ALQUILER',
  VENTA: 'VENTA',
  COMPRA: 'COMPRA',
  OTRO: 'OTRO',
} as const;

export const ESTADO_ANIMAL = {
  ACTIVO: 'ACTIVO',
  VENDIDO: 'VENDIDO',
  MUERTO: 'MUERTO',
  DESCARTE: 'DESCARTE',
} as const;

/** Target slaughter weight by animal category (kg). */
export const PESO_OBJETIVO_FAENA: Record<string, number> = {
  Novillo: 480,
  Vaca: 400,
  Ternero: 220,
  Ternera: 200,
  Vaquillona: 360,
  Toro: 550,
};
