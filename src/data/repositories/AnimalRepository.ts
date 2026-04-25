import { Database, Q } from '@nozbe/watermelondb';
import AnimalModel from '../models/AnimalModel';
import EventoModel from '../models/EventoModel';
import { EVENTO_TIPO } from '@core/constants/eventTypes';

/**
 * Repository encapsulates all DB access for animals.
 * Components never access the DB directly — they go through repositories.
 */
export class AnimalRepository {
  constructor(private database: Database) {}

  async findByRfid(rfid: string): Promise<AnimalModel | null> {
    const results = await this.database
      .get<AnimalModel>('animals')
      .query(Q.where('rfid', rfid))
      .fetch();
    return results[0] ?? null;
  }

  async findById(id: string): Promise<AnimalModel> {
    return this.database.get<AnimalModel>('animals').find(id);
  }

  async create(params: {
    rfid: string;
    sexo: string;
    categoria: string;
    raza?: string;
    estado: string;
    loteId?: string;
    potreroId?: string;
  }): Promise<AnimalModel> {
    return this.database.write(async () => {
      return this.database.get<AnimalModel>('animals').create((animal) => {
        animal.idCaravana = params.rfid;
        animal.sexo = params.sexo;
        animal.categoria = params.categoria;
        animal.raza = params.raza ?? '';
        animal.estado = params.estado;
        if (params.loteId) animal.loteId = params.loteId;
        if (params.potreroId) animal.potreroId = params.potreroId;
        animal.isGeneric = false;
      });
    });
  }

  async createBulkGenerics(
    cantidad: number,
    categoria: string,
    potreroId: string,
    pesoTotalEstimado: number = 0
  ): Promise<void> {
    const timestamp = Date.now();
    const pesoUnitario = cantidad > 0 && pesoTotalEstimado > 0 ? pesoTotalEstimado / cantidad : null;

    await this.database.write(async () => {
      const newAnimals = Array.from({ length: cantidad }).map((_, i) =>
        this.database.get<AnimalModel>('animals').prepareCreate((animal) => {
          animal.idCaravana = `GEN-${timestamp}-${i}`;
          animal.isGeneric = true;
          animal.sexo = 'N/A'; // Or generic based on category
          animal.categoria = categoria;
          animal.estado = 'ACTIVO';
          animal.potreroId = potreroId; // mapped correctly to Potreros
          if (pesoUnitario) {
            animal.lastWeightKg = pesoUnitario;
            animal.lastWeightDate = new Date(timestamp);
          }
        })
      );
      await this.database.batch(...newAnimals);
    });
  }

  async linkRfidToGeneric(animalId: string, scannedRfid: string): Promise<void> {
    // Verificamos si ya existe alguien con esta caravana
    const existing = await this.findByRfid(scannedRfid);
    if (existing) {
      throw new Error(`La caravana ${scannedRfid} ya está registrada en el sistema.`);
    }

    const animal = await this.findById(animalId);
    if (!animal.isGeneric) {
      throw new Error(`El animal seleccionado no es genérico.`);
    }

    await this.database.write(async () => {
      await animal.update((a) => {
        a.idCaravana = scannedRfid;
        a.rfid = scannedRfid;
        a.isGeneric = false;
      });
    });
  }

  /**
   * Atomically moves an animal to a new lote and records the CAMBIO_LOTE evento
   * inside a single database.write() — guarantees inventory stays consistent
   * even if the operation is interrupted.
   */
  async transferToLote(
    animal: AnimalModel,
    toLoteId: string,
    notas: string = ''
  ): Promise<void> {
    await this.database.write(async () => {
      await this.database.get<EventoModel>('eventos').create((evento) => {
        evento.animalId = animal.id;
        evento.tipo = EVENTO_TIPO.CAMBIO_LOTE;
        evento.valor = null;
        evento.notas = notas;
        evento.loteDestinoId = toLoteId;
        evento.timestamp = Date.now();
      });
      await animal.update((a) => {
        a.loteId = toLoteId;
      });
    });
  }

  queryActive() {
    return this.database
      .get<AnimalModel>('animals')
      .query(Q.where('estado', 'ACTIVO'));
  }

  queryByLote(loteId: string) {
    return this.database
      .get<AnimalModel>('animals')
      .query(Q.where('lote_id', loteId), Q.where('estado', 'ACTIVO'));
  }

  queryByCategoria(categoria: string) {
    return this.database
      .get<AnimalModel>('animals')
      .query(Q.where('categoria', categoria), Q.where('estado', 'ACTIVO'));
  }

  async updateCategoria(animal: AnimalModel, newCategoria: string): Promise<void> {
    await this.database.write(async () => {
      await animal.update((a) => {
        a.categoria = newCategoria;
      });
    });
  }

  async updateEstado(
    animal: AnimalModel,
    newEstado: string,
    notas?: string
  ): Promise<void> {
    await this.database.write(async () => {
      await this.database.get<EventoModel>('eventos').create((evento) => {
        evento.animalId = animal.id;
        evento.tipo = 'BAJA';
        evento.notas = notas ?? '';
        evento.timestamp = Date.now();
      });
      await animal.update((a) => {
        a.estado = newEstado;
      });
    });
  }
}
