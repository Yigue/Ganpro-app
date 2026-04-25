export enum DomainEvents {
  ANIMAL_MOVED = 'ANIMAL_MOVED',
  ANIMAL_DIED = 'ANIMAL_DIED',
  TREATMENT_APPLIED = 'TREATMENT_APPLIED',
  PREGNANCY_CONFIRMED = 'PREGNANCY_CONFIRMED',
  PREGNANCY_FAILED = 'PREGNANCY_FAILED',
}

/**
 * TinyEmitter
 * Implementación minimalista de un emisor de eventos para evitar dependencia de Node.js 'events'
 */
class TinyEmitter {
  private listeners: Record<string, Function[]> = {};

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(...args));
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
}

/**
 * DomainEventBus
 * Singleton simple para orquestar la comunicación desacoplada entre contextos.
 */
class DomainEventBus {
  private static instance: DomainEventBus;
  private emitter: TinyEmitter;

  private constructor() {
    this.emitter = new TinyEmitter();
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
