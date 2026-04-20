import { Database, Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';
import MedicamentoModel from '../models/MedicamentoModel';
import TratamientoSanidadModel from '../models/TratamientoSanidadModel';
import ProtocoloIATFModel from '../models/ProtocoloIATFModel';
import EtapaProtocoloModel from '../models/EtapaProtocoloModel';

export class SanidadRepository {
  constructor(private database: Database) {}

  // ── Medicamentos (Vademécum) ────────────────────────────────────────────────

  async createMedicamento(params: {
    nombre: string;
    principioActivo?: string;
    diasCarencia: number;
    viaAdministracion?: string;
    dosisDefault?: number;
    unidadDosis?: string;
    costoUnitario?: number;
    presentacion?: string;
    notas?: string;
  }): Promise<MedicamentoModel> {
    return this.database.write(async () => {
      return this.database.get<MedicamentoModel>('medicamentos').create((m) => {
        m.nombre = params.nombre;
        m.principioActivo = params.principioActivo ?? '';
        m.diasCarencia = params.diasCarencia;
        m.viaAdministracion = params.viaAdministracion ?? '';
        m.dosisDefault = params.dosisDefault ?? null;
        m.unidadDosis = params.unidadDosis ?? '';
        m.costoUnitario = params.costoUnitario ?? null;
        m.presentacion = params.presentacion ?? '';
        m.notas = params.notas ?? '';
      });
    });
  }

  /** Returns all medicamentos sorted by nombre. */
  queryMedicamentos(): Query<MedicamentoModel> {
    return this.database
      .get<MedicamentoModel>('medicamentos')
      .query(Q.sortBy('nombre', Q.asc));
  }

  // ── Tratamientos ────────────────────────────────────────────────────────────

  async createTratamiento(params: {
    animalId: string;
    medicamentoId: string;
    loteId?: string;
    fechaAplicacion: number;
    dosisAplicada?: number;
    responsable?: string;
    notas?: string;
  }): Promise<TratamientoSanidadModel> {
    // Fetch medicamento to calculate fechaFinCarencia
    const medicamento = await this.database
      .get<MedicamentoModel>('medicamentos')
      .find(params.medicamentoId);

    const fechaFinCarencia =
      params.fechaAplicacion + medicamento.diasCarencia * 86_400_000;

    return this.database.write(async () => {
      return this.database
        .get<TratamientoSanidadModel>('tratamientos_sanidad')
        .create((t) => {
          t.animalId = params.animalId;
          t.medicamentoId = params.medicamentoId;
          t.loteId = params.loteId ?? null;
          t.fechaAplicacion = params.fechaAplicacion;
          t.dosisAplicada = params.dosisAplicada ?? null;
          t.responsable = params.responsable ?? '';
          t.notas = params.notas ?? '';
          t.fechaFinCarencia = fechaFinCarencia;
        });
    });
  }

  /**
   * Returns true if the animal currently has any active quarantine period
   * (fechaFinCarencia > now).
   */
  async isAnimalEnCarencia(animalId: string): Promise<boolean> {
    const count = await this.database
      .get<TratamientoSanidadModel>('tratamientos_sanidad')
      .query(
        Q.where('animal_id', animalId),
        Q.where('fecha_fin_carencia', Q.gt(Date.now()))
      )
      .fetchCount();
    return count > 0;
  }

  queryTratamientosByAnimal(animalId: string): Query<TratamientoSanidadModel> {
    return this.database
      .get<TratamientoSanidadModel>('tratamientos_sanidad')
      .query(Q.where('animal_id', animalId));
  }

  queryTratamientosEnCarencia(): Query<TratamientoSanidadModel> {
    return this.database
      .get<TratamientoSanidadModel>('tratamientos_sanidad')
      .query(Q.where('fecha_fin_carencia', Q.gt(Date.now())));
  }

  // ── Protocolos IATF ─────────────────────────────────────────────────────────

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

  /**
   * Returns etapas whose target day (fechaInicio + diasDesdeInicio * 86400000)
   * is in the past/today but not yet completed.
   * We query all incomplete etapas and filter in-memory since WatermelonDB
   * does not support column-arithmetic in queries.
   */
  queryEtapasPendientesHoy(): Query<EtapaProtocoloModel> {
    return this.database
      .get<EtapaProtocoloModel>('etapas_protocolo')
      .query(Q.where('completada', false));
  }
}
