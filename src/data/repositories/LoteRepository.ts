import { Database } from '@nozbe/watermelondb';
import LoteModel from '../models/LoteModel';

export class LoteRepository {
  constructor(private database: Database) {}

  async findAll(): Promise<LoteModel[]> {
    return this.database.get<LoteModel>('lotes').query().fetch();
  }

  async findById(id: string): Promise<LoteModel> {
    return this.database.get<LoteModel>('lotes').find(id);
  }

  async create(params: {
    nombre: string;
    ubicacion?: string;
    descripcion?: string;
  }): Promise<LoteModel> {
    return this.database.write(async () => {
      return this.database.get<LoteModel>('lotes').create((lote) => {
        lote.nombre = params.nombre;
        lote.ubicacion = params.ubicacion ?? '';
        lote.descripcion = params.descripcion ?? '';
      });
    });
  }

  async update(
    id: string,
    params: { nombre?: string; ubicacion?: string; descripcion?: string }
  ): Promise<LoteModel> {
    return this.database.write(async () => {
      const lote = await this.database.get<LoteModel>('lotes').find(id);
      return lote.update((l) => {
        if (params.nombre !== undefined) l.nombre = params.nombre;
        if (params.ubicacion !== undefined) l.ubicacion = params.ubicacion;
        if (params.descripcion !== undefined) l.descripcion = params.descripcion;
      });
    });
  }

  async delete(id: string): Promise<void> {
    return this.database.write(async () => {
      const lote = await this.database.get<LoteModel>('lotes').find(id);
      await lote.destroyPermanently();
    });
  }

  queryAll() {
    return this.database.get<LoteModel>('lotes').query();
  }
}
