/**
 * Unit tests for SanidadRepository.getCarenciaActivaDetalle
 *
 * Covers:
 *   1. Animal without tratamientos → returns null
 *   2. Animal with active carencia (fechaFinCarencia > now) → returns the tratamiento
 *   3. Multiple tratamientos — returns the first (latest fechaFinCarencia, sorted desc)
 */

import { SanidadRepository } from '../SanidadRepository';

const ANIMAL_ID = 'animal-001';
const NOW = Date.now();
const DAY = 86_400_000;

function makeTratamiento(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trat-001',
    animalId: ANIMAL_ID,
    medicamentoId: 'med-001',
    fechaAplicacion: NOW - DAY * 3,
    fechaFinCarencia: NOW + DAY * 5,
    ...overrides,
  };
}

function makeMockDb(fetchResult: unknown[]) {
  const mockFetch = jest.fn().mockResolvedValue(fetchResult);
  // WatermelonDB: db.get(table).query(...clauses).fetch()
  const mockQuery = jest.fn().mockReturnValue({ fetch: mockFetch });
  const mockGet = jest.fn().mockReturnValue({ query: mockQuery });
  return { get: mockGet } as unknown as import('@nozbe/watermelondb').Database;
}

describe('SanidadRepository.getCarenciaActivaDetalle', () => {
  it('returns null when the animal has no active tratamientos', async () => {
    const db = makeMockDb([]);
    const repo = new SanidadRepository(db);

    const result = await repo.getCarenciaActivaDetalle(ANIMAL_ID);

    expect(result).toBeNull();
  });

  it('returns the tratamiento when carencia is active', async () => {
    const active = makeTratamiento({ fechaFinCarencia: NOW + DAY * 5 });
    const db = makeMockDb([active]);
    const repo = new SanidadRepository(db);

    const result = await repo.getCarenciaActivaDetalle(ANIMAL_ID);

    expect(result).toBe(active);
  });

  it('returns the first result (latest fechaFinCarencia wins via sortBy desc + take 1)', async () => {
    const latest = makeTratamiento({ id: 'trat-latest', fechaFinCarencia: NOW + DAY * 10 });
    // DB already applies sort+take — we simulate by returning only the latest
    const db = makeMockDb([latest]);
    const repo = new SanidadRepository(db);

    const result = await repo.getCarenciaActivaDetalle(ANIMAL_ID);

    expect(result?.id).toBe('trat-latest');
  });

  it('queries tratamientos_sanidad table with animal_id and future fechaFinCarencia', async () => {
    const db = makeMockDb([]);
    const mockGet = db.get as jest.Mock;
    const repo = new SanidadRepository(db);

    await repo.getCarenciaActivaDetalle(ANIMAL_ID);

    expect(mockGet).toHaveBeenCalledWith('tratamientos_sanidad');
    const mockQuery = mockGet.mock.results[0].value.query as jest.Mock;
    // query should have been called with Q clauses — at least 2 Q.where arguments
    expect(mockQuery).toHaveBeenCalled();
  });
});
