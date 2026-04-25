import { Database, Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';
import OperationCatalogModel from '../models/OperationCatalogModel';
import OperationLogModel from '../models/OperationLogModel';
import ScheduledOperationModel from '../models/ScheduledOperationModel';
import ProtocoloIATFModel from '../models/ProtocoloIATFModel';
import EtapaProtocoloModel from '../models/EtapaProtocoloModel';

/**
 * SanidadRepository — V3 schema.
 * Migrated from MedicamentoModel/TratamientoSanidadModel (deleted in V3)
 * to OperationCatalogModel / OperationLogModel / ScheduledOperationModel.
 */
export class SanidadRepository {
  constructor(private database: Database) {}

  // ── Catálogo de Operaciones (replaces Vademécum / Medicamentos) ──────────────

  async createOperation(params: {
    nombre: string;
    tipo: string;
    diasCarencia?: number;
    costoUnitario?: number;
    notas?: string;
  }): Promise<OperationCatalogModel> {
    return this.database.write(async () => {
      return this.database.get<OperationCatalogModel>('operations_catalog').create((op) => {
        op.nombre = params.nombre;
        op.tipo = params.tipo;
        op.diasCarencia = params.diasCarencia ?? 0;
        op.costoUnitario = params.costoUnitario ?? 0;
        op.notas = params.notas ?? '';
      });
    });
  }

  /** Returns all operations sorted by nombre. */
  queryOperations(): Query<OperationCatalogModel> {
    return this.database
      .get<OperationCatalogModel>('operations_catalog')
      .query(Q.sortBy('nombre', Q.asc));
  }

  // ── Logs de Operaciones (replaces Tratamientos) ───────────────────────────────

  async createOperationLog(params: {
    animalId?: string;
    loteId?: string;
    operationId: string;
    fechaAplicacion: number;
    dosis?: string;
    responsable?: string;
  }): Promise<OperationLogModel> {
    // Fetch the catalog entry to compute carencia end date
    const catalog = await this.database
      .get<OperationCatalogModel>('operations_catalog')
      .find(params.operationId);

    const fechaFinCarencia =
      params.fechaAplicacion + (catalog.diasCarencia ?? 0) * 86_400_000;

    return this.database.write(async () => {
      return this.database.get<OperationLogModel>('operation_logs').create((log) => {
        log.animalId = params.animalId ?? '';
        log.loteId = params.loteId ?? '';
        log.operationId = params.operationId;
        log.fechaAplicacion = new Date(params.fechaAplicacion);
        log.fechaFinCarencia = new Date(fechaFinCarencia);
        log.dosis = params.dosis ?? '';
        log.responsable = params.responsable ?? '';
      });
    });
  }

  /**
   * Returns the active carencia for an animal (fechaFinCarencia > now),
   * or null if no active quarantine.
   */
  async getCarenciaActivaDetalle(animalId: string): Promise<OperationLogModel | null> {
    const results = await this.database
      .get<OperationLogModel>('operation_logs')
      .query(
        Q.where('animal_id', animalId),
        Q.where('fecha_fin_carencia', Q.gt(Date.now())),
        Q.sortBy('fecha_fin_carencia', Q.desc),
        Q.take(1)
      )
      .fetch();
    return results[0] ?? null;
  }

  /** Returns true if the animal has an active quarantine period. */
  async isAnimalEnCarencia(animalId: string): Promise<boolean> {
    const count = await this.database
      .get<OperationLogModel>('operation_logs')
      .query(
        Q.where('animal_id', animalId),
        Q.where('fecha_fin_carencia', Q.gt(Date.now()))
      )
      .fetchCount();
    return count > 0;
  }

  queryLogsByAnimal(animalId: string): Query<OperationLogModel> {
    return this.database
      .get<OperationLogModel>('operation_logs')
      .query(Q.where('animal_id', animalId));
  }

  queryLogsEnCarencia(): Query<OperationLogModel> {
    return this.database
      .get<OperationLogModel>('operation_logs')
      .query(Q.where('fecha_fin_carencia', Q.gt(Date.now())));
  }

  // ── Operaciones Programadas ───────────────────────────────────────────────────

  async scheduleOperation(params: {
    operationId: string;
    loteId?: string;
    fechaProgramada: number;
  }): Promise<ScheduledOperationModel> {
    return this.database.write(async () => {
      return this.database.get<ScheduledOperationModel>('scheduled_operations').create((op) => {
        op.operationId = params.operationId;
        op.loteId = params.loteId ?? '';
        op.fechaProgramada = new Date(params.fechaProgramada);
        op.estado = 'PENDING';
      });
    });
  }

  queryScheduledOperations(upcomingDays = 30): Query<ScheduledOperationModel> {
    const limit = Date.now() + upcomingDays * 24 * 60 * 60 * 1000;
    return this.database
      .get<ScheduledOperationModel>('scheduled_operations')
      .query(
        Q.where('fecha_programada', Q.lte(limit)),
        Q.where('estado', Q.notEq('DONE'))
      );
  }

  async markScheduledAsDone(op: ScheduledOperationModel): Promise<void> {
    await this.database.write(async () => {
      await op.update((o) => {
        o.estado = 'DONE';
      });
    });
  }

  // ── Protocolos IATF (unchanged) ───────────────────────────────────────────────

  async createProtocolo(params: {
    nombre: string;
    loteId: string;
    fechaInicio: number;
    notas?: string;
    etapas: Array<{
      nombre: string;
      diasDesdeInicio: number;
      descripcion?: string;
    }>;
  }): Promise<ProtocoloIATFModel> {
    return this.database.write(async () => {
      const protocolo = await this.database
        .get<ProtocoloIATFModel>('protocolos_iatf')
        .create((p) => {
          p.nombre = params.nombre;
          p.loteId = params.loteId;
          p.fechaInicio = params.fechaInicio;
          p.estado = 'ACTIVO';
          p.notas = params.notas ?? '';
        });

      await Promise.all(
        params.etapas.map((etapa) =>
          this.database.get<EtapaProtocoloModel>('etapas_protocolo').create((e) => {
            e.protocoloId = protocolo.id;
            e.nombre = etapa.nombre;
            e.diasDesdeInicio = etapa.diasDesdeInicio;
            e.descripcion = etapa.descripcion ?? '';
            e.completada = false;
            e.fechaCompletada = null;
            e.notificacionId = '';
          })
        )
      );

      return protocolo;
    });
  }

  queryProtocolosActivos(): Query<ProtocoloIATFModel> {
    return this.database
      .get<ProtocoloIATFModel>('protocolos_iatf')
      .query(Q.where('estado', 'ACTIVO'));
  }

  async completarEtapa(etapa: EtapaProtocoloModel): Promise<void> {
    await this.database.write(async () => {
      await etapa.update((e) => {
        e.completada = true;
        e.fechaCompletada = Date.now();
      });
    });
  }

  queryEtapasByProtocolo(protocoloId: string): Query<EtapaProtocoloModel> {
    return this.database
      .get<EtapaProtocoloModel>('etapas_protocolo')
      .query(Q.where('protocolo_id', protocoloId));
  }

  queryEtapasPendientesHoy(): Query<EtapaProtocoloModel> {
    return this.database
      .get<EtapaProtocoloModel>('etapas_protocolo')
      .query(Q.where('completada', false));
  }
}
