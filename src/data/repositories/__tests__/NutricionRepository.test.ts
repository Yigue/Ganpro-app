import { NutricionRepository } from '../NutricionRepository';

// Mock Date.now for predictable tests
const NOW = 1600000000000;
jest.spyOn(Date, 'now').mockReturnValue(NOW);

function makeMockDb(racion: any) {
  const mockCreate = jest.fn().mockImplementation((cb) => {
    const model = {} as any;
    cb(model);
    return model;
  });

  const mockFind = jest.fn().mockResolvedValue(racion);

  const mockGet = jest.fn().mockReturnValue({ 
    find: mockFind,
    create: mockCreate
  });

  const mockWrite = jest.fn().mockImplementation(async (cb) => {
    return await cb();
  });

  return { 
    get: mockGet,
    write: mockWrite
  } as unknown as import('@nozbe/watermelondb').Database;
}

describe('NutricionRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateGDPEstimado', () => {
    it('calculates GDP and Cost correctly when racion has zero cost', async () => {
      const db = makeMockDb({ costoEstimadoKg: 0 });
      const repo = new NutricionRepository(db);

      const result = await repo.calculateGDPEstimado('racion-1', 300);

      // GDP = 0.75 + 0 = 0.75
      // consumo = 300 * 0.03 = 9
      // costo = 0 * 9 / 0.75 = 0
      expect(result.gdp).toBe(0.75);
      expect(result.costoKgProducido).toBe(0);
    });

    it('calculates GDP and Cost correctly when racion has cost', async () => {
      const db = makeMockDb({ costoEstimadoKg: 100 });
      const repo = new NutricionRepository(db);

      const result = await repo.calculateGDPEstimado('racion-1', 400);

      // GDP = 0.75 + 0.25 = 1.0
      // consumo = 400 * 0.03 = 12
      // costo = 100 * 12 / 1.0 = 1200
      expect(result.gdp).toBe(1.0);
      expect(result.costoKgProducido).toBe(1200);
    });
  });

  describe('applyRacionToPotrero', () => {
    it('creates a feeding log with estimated cost in notes', async () => {
      const db = makeMockDb({ costoEstimadoKg: 50 });
      const repo = new NutricionRepository(db);
      
      const logFeedingSpy = jest.spyOn(repo, 'logFeeding').mockResolvedValue({} as any);

      await repo.applyRacionToPotrero('racion-1', 'potrero-1', 200);

      expect(logFeedingSpy).toHaveBeenCalledWith({
        potreroId: 'potrero-1',
        racionId: 'racion-1',
        cantidadKg: 200,
        fecha: NOW,
        notas: 'Costo total estimado: $10000.00'
      });
    });
  });
});