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

  async createRacion(params: {
    nombre: string;
    descripcion?: string; // Usaremos esto para JSON de ingredientes
  }): Promise<RacionModel> {
    return this.database.write(async () => {
      return this.database.get<RacionModel>('raciones').create((r) => {
        r.nombre = params.nombre;
        r.descripcion = params.descripcion ?? '';
        r.activa = true;
      });
    });
  }

  queryRacionesActivas(): Query<RacionModel> {
    return this.database
      .get<RacionModel>('raciones')
      .query(Q.where('activa', true));
  }

  // ── Feeding Logs ────────────────────────────────────────────────────────────
  // Como aún no tenemos el Model definido explícitamente en el repo importado,
  // podemos interactuar directamente con la tabla para registrar entregas.
  async logFeeding(params: {
    potreroId: string;
    racionId: string;
    cantidadKg: number;
    fecha: number;
    notas?: string;
  }): Promise<any> {
    return this.database.write(async () => {
      return this.database.get('potrero_feeding_logs').create((log: any) => {
        log.potreroId = params.potreroId;
        log.racionId = params.racionId;
        log.cantidadKg = params.cantidadKg;
        log.fecha = params.fecha;
        log.notas = params.notas ?? '';
      });
    });
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
