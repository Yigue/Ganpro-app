import { database } from '../../data/database/database';
import { eventBus, DomainEvents } from '../events/DomainEventBus';
import type AnimalModel from '../../data/models/AnimalModel';

export class WeightService {
  /**
   * Registra un nuevo pesaje para un animal y actualiza sus campos desnormalizados.
   */
  static async registerWeight(animalId: string, pesoKg: number): Promise<void> {
    await database.write(async () => {
      const animalsCollection = database.get<AnimalModel>('animals');
      const animal = await animalsCollection.find(animalId);

      if (!animal) throw new Error('Animal no encontrado');

      await animal.update(am => {
        am.lastWeightKg = pesoKg;
        am.lastWeightDate = new Date();
      });

      // TODO: En Fase 4, crear registro en la tabla animal_weights para histórico.
    });

    // Publicamos evento (podemos agregar uno nuevo o usar uno genérico de actualización)
    // eventBus.publish(DomainEvents.ANIMAL_WEIGHTED, { animalId, pesoKg });
  }
}

export default WeightService;
