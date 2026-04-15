import { Database, Q } from '@nozbe/watermelondb';
import EventoModel from '../models/EventoModel';

export class EventoRepository {
  constructor(private database: Database) {}

  async create(params: {
    animalId: string;
    tipo: string;
    valor?: number;
    notas?: string;
    loteDestinoId?: string;
  }): Promise<EventoModel> {
    return this.database.write(async () => {
      return this.database.get<EventoModel>('eventos').create((evento) => {
        evento.animalId = params.animalId;
        evento.tipo = params.tipo;
        evento.valor = params.valor ?? null;
        evento.notas = params.notas ?? '';
        evento.loteDestinoId = params.loteDestinoId ?? null;
        evento.timestamp = Date.now();
      });
    });
  }

  queryByAnimal(animalId: string) {
    return this.database
      .get<EventoModel>('eventos')
      .query(Q.where('animal_id', animalId), Q.sortBy('timestamp', Q.desc));
  }

  queryRecent(limit = 50) {
    return this.database
      .get<EventoModel>('eventos')
      .query(Q.sortBy('timestamp', Q.desc), Q.take(limit));
  }
}
