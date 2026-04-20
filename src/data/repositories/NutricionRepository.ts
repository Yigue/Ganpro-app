import { Database, Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';
import SuplementoModel from '../models/SuplementoModel';
import RacionModel from '../models/RacionModel';
import CondicionCorporalModel from '../models/CondicionCorporalModel';

export class NutricionRepository {
  constructor(private database: Database) {}

  // ── Suplementos ─────────────────────────────────────────────────────────────

  async createSuplemento(params: {
    nombre: string;
    tipo: string;
    materiaSecaPct: number;
    proteinaBrutaPct?: number;
    energiaMcalKg?: number;
    precioPorTonelada?: number;
    stockKg?: number;
    proveedor?: string;
  }): Promise<SuplementoModel> {
    return this.database.write(async () => {
      return this.database.get<SuplementoModel>('suplementos').create((s) => {
        s.nombre = params.nombre;
        s.tipo = params.tipo;
        s.materiaSecaPct = params.materiaSecaPct;
        s.proteinaBrutaPct = params.proteinaBrutaPct ?? null;
        s.energiaMcalKg = params.energiaMcalKg ?? null;
        s.precioPorTonelada = params.precioPorTonelada ?? null;
        s.stockKg = params.stockKg ?? null;
        s.proveedor = params.proveedor ?? '';
      });
    });
  }

  querySuplementos(): Query<SuplementoModel> {
    return this.database.get<SuplementoModel>('suplementos').query();
  }

  // ── Raciones ────────────────────────────────────────────────────────────────

  /**
   * Deactivates any currently active racion for the same lote, then creates
   * a new active racion. Both operations run inside a single write transaction.
   */
  async createRacion(params: {
    loteId: string;
    suplementoId: string;
    kgDiaAnimal: number;
    fechaInicio: number;
    fechaFin?: number;
    notas?: string;
  }): Promise<RacionModel> {
    return this.database.write(async () => {
      // Deactivate previous active raciones for this lote
      const activeRaciones = await this.database
        .get<RacionModel>('raciones')
        .query(Q.where('lote_id', params.loteId), Q.where('activa', true))
        .fetch();

      await Promise.all(
        activeRaciones.map((r) =>
          r.update((rec) => {
            rec.activa = false;
          })
        )
      );

      return this.database.get<RacionModel>('raciones').create((r) => {
        r.loteId = params.loteId;
        r.suplementoId = params.suplementoId;
        r.kgDiaAnimal = params.kgDiaAnimal;
        r.fechaInicio = params.fechaInicio;
        r.fechaFin = params.fechaFin ?? null;
        r.notas = params.notas ?? '';
        r.activa = true;
      });
    });
  }

  queryRacionesActivasByLote(loteId: string): Query<RacionModel> {
    return this.database
      .get<RacionModel>('raciones')
      .query(Q.where('lote_id', loteId), Q.where('activa', true));
  }

  // ── Condición Corporal ──────────────────────────────────────────────────────

  async createCC(params: {
    loteId: string;
    animalId?: string;
    fecha: number;
    score: number;
    evaluador?: string;
    notas?: string;
  }): Promise<CondicionCorporalModel> {
    return this.database.write(async () => {
      return this.database
        .get<CondicionCorporalModel>('condicion_corporal')
        .create((cc) => {
          cc.loteId = params.loteId;
          cc.animalId = params.animalId ?? null;
          cc.fecha = params.fecha;
          cc.score = params.score;
          cc.evaluador = params.evaluador ?? '';
          cc.notas = params.notas ?? '';
        });
    });
  }

  /** Returns all body condition records for a lote, sorted by fecha descending. */
  queryCondicionCorporalByLote(loteId: string): Query<CondicionCorporalModel> {
    return this.database
      .get<CondicionCorporalModel>('condicion_corporal')
      .query(Q.where('lote_id', loteId), Q.sortBy('fecha', Q.desc));
  }
}
