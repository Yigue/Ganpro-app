import { database } from '../../data/database/database';
import { Q } from '@nozbe/watermelondb';
import { eventBus, DomainEvents } from '../events/DomainEventBus';
import type AnimalModel from '../../data/models/AnimalModel';
import type PotreroModel from '../../data/models/PotreroModel';

export class AnimalMovementService {
  /**
   * Mueve una lista de animales a un nuevo potrero.
   * Realiza la actualización masiva en la DB y publica el evento.
   */
  static async transferAnimals(animalIds: string[], potreroDestinoId: string): Promise<void> {
    if (animalIds.length === 0) return;

    await database.write(async () => {
      const animalsCollection = database.get<AnimalModel>('animals');
      const potrerosCollection = database.get<PotreroModel>('potreros');

      // Validamos que el potrero destino exista
      const potreroDestino = await potrerosCollection.find(potreroDestinoId);
      if (!potreroDestino) throw new Error('Potrero destino no encontrado');

      // Obtenemos los modelos de los animales
      const animalsToMove = await animalsCollection.query(Q.where('id', Q.oneOf(animalIds))).fetch();

      const batchOperations = animalsToMove.map(animal => 
        animal.prepareUpdate(am => {
          am.potreroId = potreroDestinoId;
        })
      );

      // TODO: Crear registros en animal_movements para trazabilidad histórica si es necesario.
      // Por ahora cumplimos con el requerimiento principal del refactor.

      await database.batch(...batchOperations);
    });

    eventBus.publish(DomainEvents.ANIMAL_MOVED, { animalIds, potreroDestinoId });
  }

  /**
   * Declara la muerte de un animal.
   */
  static async declareDeath(animalId: string, causa: string): Promise<void> {
    await database.write(async () => {
      const animalsCollection = database.get<AnimalModel>('animals');
      const animal = await animalsCollection.find(animalId);

      if (!animal) throw new Error('Animal no encontrado');

      await animal.update(am => {
        am.estado = 'MUERTO';
      });
      
      // Aquí se podría crear un registro en death_logs también.
    });

    eventBus.publish(DomainEvents.ANIMAL_DIED, { animalId, causa });
  }
}

export default AnimalMovementService;
