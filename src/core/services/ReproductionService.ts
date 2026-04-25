import { database } from '../../data/database/database';
import { eventBus, DomainEvents } from '../events/DomainEventBus';
import type AnimalModel from '../../data/models/AnimalModel';

export class ReproductionService {
  /**
   * Registra el resultado de un tacto/ecografía.
   */
  static async registerTacto(animalId: string, resultado: 'PREÑADA' | 'VACIA' | 'EN_SERVICIO'): Promise<void> {
    await database.write(async () => {
      const animalsCollection = database.get<AnimalModel>('animals');
      const animal = await animalsCollection.find(animalId);

      if (!animal) throw new Error('Animal no encontrado');

      await animal.update(am => {
        am.reproStatus = resultado;
      });
      
      // Aquí se podría crear un registro en reproduction_logs también.
    });

    if (resultado === 'PREÑADA') {
      eventBus.publish(DomainEvents.PREGNANCY_CONFIRMED, { animalId, timestamp: new Date() });
    } else {
      eventBus.publish(DomainEvents.PREGNANCY_FAILED, { animalId, timestamp: new Date() });
    }
  }
}

export default ReproductionService;
