import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '../schema/schema';
import { migrations } from '../schema/migrations';
import {
  AnimalModel,
  LoteModel,
  EventoModel,
  SyncLogModel,
  ProtocoloIATFModel,
  EtapaProtocoloModel,
  CondicionCorporalModel,
  SuplementoModel,
  RacionModel,
  MovimientoFinancieroModel,
  PrecioMercadoModel,
  AgregadoFinancieroModel,
} from '../models';
import { OperationCatalogModel } from '../models/OperationCatalogModel';
import { OperationLogModel } from '../models/OperationLogModel';
import { ScheduledOperationModel } from '../models/ScheduledOperationModel';
import { AnimalMovementModel } from '../models/AnimalMovementModel';
import { MangaActionQueueModel } from '../models/MangaActionQueueModel';
import PotreroModel from '../models/PotreroModel';
import { PotreroFeedingLogModel } from '../models/PotreroFeedingLogModel';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // jsi: true — enable for production JSI performance; disable for simulator
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    AnimalModel,
    LoteModel,
    EventoModel,
    SyncLogModel,
    ProtocoloIATFModel,
    EtapaProtocoloModel,
    CondicionCorporalModel,
    SuplementoModel,
    RacionModel,
    MovimientoFinancieroModel,
    PrecioMercadoModel,
    AgregadoFinancieroModel,
    // V3 models
    OperationCatalogModel,
    OperationLogModel,
    ScheduledOperationModel,
    AnimalMovementModel,
    MangaActionQueueModel,
    PotreroModel,
    PotreroFeedingLogModel,
  ],
});

