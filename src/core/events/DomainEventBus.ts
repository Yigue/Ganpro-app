import { EventEmitter } from 'events';

export enum DomainEvents {
  ANIMAL_MOVED = 'ANIMAL_MOVED',
  ANIMAL_DIED = 'ANIMAL_DIED',
  TREATMENT_APPLIED = 'TREATMENT_APPLIED',
  PREGNANCY_CONFIRMED = 'PREGNANCY_CONFIRMED',
  PREGNANCY_FAILED = 'PREGNANCY_FAILED',
}

/**
 * DomainEventBus
 * Singleton simple para orquestar la comunicación desacoplada entre contextos.
 */
class DomainEventBus {
  private static instance: DomainEventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    // Limitar los listeners si es necesario, pero para este bus local 50 es seguro.
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public publish<T = any>(eventName: DomainEvents, payload: T): void {
    console.log(`[DomainEventBus] Publishing event: ${eventName}`, payload);
    this.emitter.emit(eventName, payload);
  }

  public subscribe<T = any>(eventName: DomainEvents, callback: (payload: T) => void): () => void {
    this.emitter.on(eventName, callback);
    
    // Retornamos una función de unsubscribe para limpieza.
    return () => {
      this.emitter.off(eventName, callback);
    };
  }
}

export const eventBus = DomainEventBus.getInstance();
export default eventBus;
