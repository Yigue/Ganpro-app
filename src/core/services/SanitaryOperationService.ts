import { database } from '../../data/database/database';
import { eventBus, DomainEvents } from '../events/DomainEventBus';
import type OperationLogModel from '../../data/models/OperationLogModel';
import type OperationCatalogModel from '../../data/models/OperationCatalogModel';

export class SanitaryOperationService {
  /**
   * Aplica un tratamiento masivo a un grupo de animales.
   */
  static async applyTreatment(
    animalIds: string[], 
    operationId: string, 
    dosis: number,
    responsable?: string
  ): Promise<void> {
    if (animalIds.length === 0) return;

    await database.write(async () => {
      const catalogCollection = database.get<OperationCatalogModel>('operations_catalog');
      const logsCollection = database.get<OperationLogModel>('operation_logs');

      const operation = await catalogCollection.find(operationId);
      if (!operation) throw new Error('Operación no encontrada en el catálogo');

      const now = new Date();
      let fechaFinCarencia: Date | null = null;

      if (operation.diasCarencia > 0) {
        fechaFinCarencia = new Date(now.getTime() + operation.diasCarencia * 24 * 60 * 60 * 1000);
      }

      const batchOperations = animalIds.map(animalId => 
        logsCollection.prepareCreate(log => {
          log.animalId = animalId;
          log.operationId = operationId;
          log.tipoOperacion = operation.tipo;
          log.fechaAplicacion = now;
          log.fechaFinCarencia = fechaFinCarencia;
          log.dosisAplicada = dosis;
          log.costoAplicado = operation.costoUnitario * dosis;
        })
      );

      await database.batch(...batchOperations);
    });

    eventBus.publish(DomainEvents.TREATMENT_APPLIED, { 
      animalIds, 
      operationId, 
      dosis,
      timestamp: new Date() 
    });
  }
}

export default SanitaryOperationService;
