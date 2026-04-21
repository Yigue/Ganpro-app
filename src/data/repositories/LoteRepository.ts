import { Database, Q } from '@nozbe/watermelondb';
import LoteModel from '../models/LoteModel';
import AnimalModel from '../models/AnimalModel';

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

  async updateGeoData(
    id: string,
    params: { hectareas?: number; costoAlquilerHa?: number; geoJson?: string }
  ): Promise<LoteModel> {
    return this.database.write(async () => {
      const lote = await this.database.get<LoteModel>('lotes').find(id);
      return lote.update((l) => {
        if (params.hectareas !== undefined) l.hectareas = params.hectareas ?? null;
        if (params.costoAlquilerHa !== undefined) l.costoAlquilerHa = params.costoAlquilerHa ?? null;
        if (params.geoJson !== undefined) l.geoJson = params.geoJson;
      });
    });
  }

  /**
   * Recalculates densidad_carga for a lote as activeAnimals / hectareas.
   * No-ops if hectareas is null or zero to avoid division by zero.
   */
  async updateDensidad(loteId: string): Promise<void> {
    const lote = await this.database.get<LoteModel>('lotes').find(loteId);
    if (!lote.hectareas || lote.hectareas === 0) return;

    const activeAnimals = await this.database
      .get<AnimalModel>('animals')
      .query(Q.where('lote_id', loteId), Q.where('estado', 'ACTIVO'))
      .fetchCount();

    await this.database.write(async () => {
      await lote.update((l) => {
        l.densidadCarga = activeAnimals / (lote.hectareas as number);
      });
    });
  }
}
