import { Database, Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';
import MovimientoFinancieroModel from '../models/MovimientoFinancieroModel';
import PrecioMercadoModel from '../models/PrecioMercadoModel';
import AgregadoFinancieroModel from '../models/AgregadoFinancieroModel';

export class FinancieroRepository {
  constructor(private database: Database) {}

  // ── Movimientos ─────────────────────────────────────────────────────────────

  async createMovimiento(params: {
    tipo: string;
    categoria: string;
    loteId?: string;
    animalId?: string;
    monto: number;
    fecha: number;
    descripcion?: string;
    comprobante?: string;
    dteNumero?: string;
  }): Promise<MovimientoFinancieroModel> {
    return this.database.write(async () => {
      return this.database
        .get<MovimientoFinancieroModel>('movimientos_financieros')
        .create((m) => {
          m.tipo = params.tipo;
          m.categoria = params.categoria;
          m.loteId = params.loteId ?? null;
          m.animalId = params.animalId ?? null;
          m.monto = params.monto;
          m.fecha = params.fecha;
          m.descripcion = params.descripcion ?? '';
          m.comprobante = params.comprobante ?? '';
          m.dteNumero = params.dteNumero ?? '';
        });
    });
  }

  /**
   * Returns all movimientos for a given month period (YYYYMM).
   * Filters by the month boundaries computed from the period string.
   */
  queryMovimientosByPeriodo(periodoMes: string): Query<MovimientoFinancieroModel> {
    const year = parseInt(periodoMes.slice(0, 4), 10);
    const month = parseInt(periodoMes.slice(4, 6), 10) - 1; // 0-based
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    return this.database
      .get<MovimientoFinancieroModel>('movimientos_financieros')
      .query(Q.where('fecha', Q.gte(start)), Q.where('fecha', Q.lt(end)));
  }

  queryMovimientosByLote(loteId: string): Query<MovimientoFinancieroModel> {
    return this.database
      .get<MovimientoFinancieroModel>('movimientos_financieros')
      .query(Q.where('lote_id', loteId));
  }

  // ── Precios de Mercado ──────────────────────────────────────────────────────

  /**
   * Creates or updates a precio_mercado record for the given fecha.
   * Uses the first existing record with the same fecha as an upsert target.
   */
  async upsertPrecioMercado(params: {
    fecha: number;
    novilloKg?: number;
    terneroKg?: number;
    vacaKg?: number;
    vacaDescarteKg?: number;
    fuente: string;
  }): Promise<PrecioMercadoModel> {
    const existing = await this.database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.where('fecha', params.fecha))
      .fetch();

    if (existing.length > 0) {
      return this.database.write(async () => {
        return existing[0].update((p) => {
          p.novilloKg = params.novilloKg ?? null;
          p.terneroKg = params.terneroKg ?? null;
          p.vacaKg = params.vacaKg ?? null;
          p.vacaDescarteKg = params.vacaDescarteKg ?? null;
          p.fuente = params.fuente;
        });
      });
    }

    return this.database.write(async () => {
      return this.database.get<PrecioMercadoModel>('precios_mercado').create((p) => {
        p.fecha = params.fecha;
        p.novilloKg = params.novilloKg ?? null;
        p.terneroKg = params.terneroKg ?? null;
        p.vacaKg = params.vacaKg ?? null;
        p.vacaDescarteKg = params.vacaDescarteKg ?? null;
        p.fuente = params.fuente;
      });
    });
  }

  /** Returns precios_mercado sorted by fecha descending (most recent first). */
  queryUltimoPrecio(): Query<PrecioMercadoModel> {
    return this.database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.sortBy('fecha', Q.desc));
  }

  // ── Agregados Financieros ───────────────────────────────────────────────────

  /**
   * Creates or updates an agregado_financiero for the given periodo/lote pair.
   */
  async upsertAgregado(params: {
    periodoMes: string;
    loteId?: string;
    costoSanidad?: number;
    costoNutricion?: number;
    costoAlquiler?: number;
    kgGanados?: number;
    costoXKg?: number;
    margenBruto?: number;
    calculadoAt: number;
  }): Promise<AgregadoFinancieroModel> {
    const queryConditions = params.loteId
      ? [Q.where('periodo_mes', params.periodoMes), Q.where('lote_id', params.loteId)]
      : [Q.where('periodo_mes', params.periodoMes), Q.where('lote_id', null)];

    const existing = await this.database
      .get<AgregadoFinancieroModel>('agregados_financieros')
      .query(...queryConditions)
      .fetch();

    const applyParams = (a: AgregadoFinancieroModel) => {
      a.periodoMes = params.periodoMes;
      a.loteId = params.loteId ?? null;
      a.costoSanidad = params.costoSanidad ?? null;
      a.costoNutricion = params.costoNutricion ?? null;
      a.costoAlquiler = params.costoAlquiler ?? null;
      a.kgGanados = params.kgGanados ?? null;
      a.costoXKg = params.costoXKg ?? null;
      a.margenBruto = params.margenBruto ?? null;
      a.calculadoAt = params.calculadoAt;
    };

    if (existing.length > 0) {
      return this.database.write(async () => {
        return existing[0].update(applyParams);
      });
    }

    return this.database.write(async () => {
      return this.database
        .get<AgregadoFinancieroModel>('agregados_financieros')
        .create(applyParams);
    });
  }

  queryAgregadosByLote(loteId: string): Query<AgregadoFinancieroModel> {
    return this.database
      .get<AgregadoFinancieroModel>('agregados_financieros')
      .query(Q.where('lote_id', loteId));
  }
}
