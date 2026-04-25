import { Database, Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';
import SuplementoModel from '../models/SuplementoModel';
import RacionModel from '../models/RacionModel';
import CondicionCorporalModel from '../models/CondicionCorporalModel';
import RacionIngredienteModel from '../models/RacionIngredienteModel';
import { PotreroFeedingLogModel } from '../models/PotreroFeedingLogModel';
import { AnimalMovementModel } from '../models/AnimalMovementModel';

export class NutricionRepository {
  constructor(private database: Database) {}

  // ── Suplementos (Ingredientes Base) ────────────────────────────────────────

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

  // ── Raciones & Ingredientes ──────────────────────────────────────────────────

  async createRacionConIngredientes(params: {
    nombre: string;
    descripcion?: string;
    ingredientes: { suplementoId: string; porcentaje: number; kgPorTonelada: number }[];
  }): Promise<RacionModel> {
    return this.database.write(async () => {
      const racion = await this.database.get<RacionModel>('raciones').create((r) => {
        r.nombre = params.nombre;
        r.descripcion = params.descripcion ?? '';
        r.activa = true;
      });

      await Promise.all(
        params.ingredientes.map((ing) =>
          this.database.get<RacionIngredienteModel>('racion_ingredientes').create((ri) => {
            ri.racionId = racion.id;
            ri.suplementoId = ing.suplementoId;
            ri.porcentaje = ing.porcentaje;
            ri.cantidadKgPorTonelada = ing.kgPorTonelada;
          })
        )
      );

      return racion;
    });
  }

  queryRacionesActivas(): Query<RacionModel> {
    return this.database
      .get<RacionModel>('raciones')
      .query(Q.where('activa', true));
  }

  queryIngredientesByRacion(racionId: string): Query<RacionIngredienteModel> {
    return this.database
      .get<RacionIngredienteModel>('racion_ingredientes')
      .query(Q.where('racion_id', racionId));
  }

  // ── Movimientos de Potrero ──────────────────────────────────────────────────

  queryMovimientosByPotrero(potreroId: string): Query<AnimalMovementModel> {
    return this.database
      .get<AnimalMovementModel>('animal_movements')
      .query(
        Q.or(
          Q.where('potrero_origen_id', potreroId),
          Q.where('potrero_destino_id', potreroId)
        ),
        Q.sortBy('fecha', Q.desc)
      );
  }

  // ── Feeding Logs (Entregas de Ración) ───────────────────────────────────────

  async logFeeding(params: {
    potreroId: string;
    racionId: string;
    cantidadKg: number;
    fecha: number;
    notas?: string;
  }): Promise<PotreroFeedingLogModel> {
    return this.database.write(async () => {
      return this.database.get<PotreroFeedingLogModel>('potrero_feeding_logs').create((log) => {
        log.potreroId = params.potreroId;
        log.racionId = params.racionId;
        log.cantidadKg = params.cantidadKg;
        log.fecha = params.fecha;
        log.notas = params.notas ?? '';
      });
    });
  }

  queryFeedingLogs(limit = 20): Query<PotreroFeedingLogModel> {
    return this.database
      .get<PotreroFeedingLogModel>('potrero_feeding_logs')
      .query(Q.sortBy('fecha', Q.desc), Q.take(limit));
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

  queryCondicionCorporalByLote(loteId: string): Query<CondicionCorporalModel> {
    return this.database
      .get<CondicionCorporalModel>('condicion_corporal')
      .query(Q.where('lote_id', loteId), Q.sortBy('fecha', Q.desc));
  }
}
