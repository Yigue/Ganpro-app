import { Database, Q } from '@nozbe/watermelondb';
import AnimalModel from '../models/AnimalModel';

/**
 * Repository encapsulates all DB access for animals.
 * Components never access the DB directly — they go through repositories.
 */
export class AnimalRepository {
  constructor(private database: Database) {}

  async findByRfid(rfid: string): Promise<AnimalModel | null> {
    const results = await this.database
      .get<AnimalModel>('animals')
      .query(Q.where('id_caravana', rfid))
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
    loteId: string;
  }): Promise<AnimalModel> {
    return this.database.write(async () => {
      return this.database.get<AnimalModel>('animals').create((animal) => {
        animal.idCaravana = params.rfid;
        animal.sexo = params.sexo;
        animal.categoria = params.categoria;
        animal.raza = params.raza ?? '';
        animal.estado = params.estado;
        animal.loteId = params.loteId;
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
}
