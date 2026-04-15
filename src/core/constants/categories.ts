export const SEXO = {
  MACHO: 'M',
  HEMBRA: 'H',
} as const;

export type SexoType = (typeof SEXO)[keyof typeof SEXO];

export const CATEGORIA = {
  TERNERO: 'Ternero',
  TERNERA: 'Ternera',
  VACA: 'Vaca',
  TORO: 'Toro',
  VAQUILLONA: 'Vaquillona',
  NOVILLO: 'Novillo',
} as const;

export type CategoriaType = (typeof CATEGORIA)[keyof typeof CATEGORIA];

export const ESTADO = {
  ACTIVO: 'ACTIVO',
  VENDIDO: 'VENDIDO',
  MUERTO: 'MUERTO',
} as const;

export type EstadoType = (typeof ESTADO)[keyof typeof ESTADO];

/** Category options filtered by sex for the registration modal */
export const CATEGORIAS_MACHO: CategoriaType[] = [
  CATEGORIA.TERNERO,
  CATEGORIA.TORO,
  CATEGORIA.NOVILLO,
];

export const CATEGORIAS_HEMBRA: CategoriaType[] = [
  CATEGORIA.TERNERA,
  CATEGORIA.VACA,
  CATEGORIA.VAQUILLONA,
];
