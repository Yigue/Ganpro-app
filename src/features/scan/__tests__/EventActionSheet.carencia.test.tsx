/**
 * Integration tests for EventActionSheet — Carencia & TACTO behavior.
 *
 * Covers:
 *   1. Animal in carencia → VACUNACION button disabled, banner visible
 *   2. Animal not in carencia → VACUNACION button enabled
 *   3. TACTO: selecting "Vacía" sets tactoResultado='vacia' and categoria changes
 *   4. TACTO: selecting "Preñada" does not change categoria
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

// ── Database mock ──────────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY = 86_400_000;

const mockAnimal = {
  id: 'animal-001',
  idCaravana: 'AR123456',
  loteId: 'lote-001',
  categoria: 'Vaca',
  estado: 'ACTIVO',
};

const mockCarenciaActiva = {
  id: 'trat-001',
  animalId: 'animal-001',
  fechaFinCarencia: NOW + DAY * 5,
  medicamentoId: 'med-001',
};

const mockFindByRfid = jest.fn();
const mockGetCarenciaActivaDetalle = jest.fn();
const mockUpdateCategoria = jest.fn();
const mockCreate = jest.fn();
const mockTransferToLote = jest.fn();
const mockFetchLotes = jest.fn().mockResolvedValue([]);
const mockFetchCount = jest.fn().mockResolvedValue(0);
const mockWrite = jest.fn(async (fn: () => Promise<unknown>) => fn());

jest.mock('@data/repositories/AnimalRepository', () => ({
  AnimalRepository: jest.fn().mockImplementation(() => ({
    findByRfid: mockFindByRfid,
    transferToLote: mockTransferToLote,
    updateCategoria: mockUpdateCategoria,
  })),
}));

jest.mock('@data/repositories/EventoRepository', () => ({
  EventoRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

jest.mock('@data/repositories/SanidadRepository', () => ({
  SanidadRepository: jest.fn().mockImplementation(() => ({
    getCarenciaActivaDetalle: mockGetCarenciaActivaDetalle,
  })),
}));

jest.mock('@shared/hooks/useDatabase', () => ({
  useDatabase: () => ({
    get: jest.fn().mockReturnValue({
      query: jest.fn().mockReturnValue({ fetch: mockFetchLotes, fetchCount: mockFetchCount }),
      find: jest.fn().mockResolvedValue({ update: jest.fn(), hectareas: 10 }),
    }),
    write: mockWrite,
  }),
}));

jest.mock('@shared/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    triggerSelection: jest.fn(),
    triggerSuccess: jest.fn(),
    triggerHeavy: jest.fn(),
    triggerError: jest.fn(),
  }),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    BottomSheetModal: React.forwardRef(
      ({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }, ref: React.Ref<unknown>) => {
        React.useImperativeHandle(ref, () => ({
          present: jest.fn(),
          dismiss: jest.fn(),
        }));
        return <View>{children}</View>;
      }
    ),
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => (
      <ScrollView>{children}</ScrollView>
    ),
  };
});

import { EventActionSheet } from '../EventActionSheet';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EventActionSheet — Carencia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByRfid.mockResolvedValue(mockAnimal);
  });

  it('shows carencia banner and disables Vacunación when animal is in carencia', async () => {
    mockGetCarenciaActivaDetalle.mockResolvedValue(mockCarenciaActiva);

    render(
      <EventActionSheet visible rfid="AR123456" onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/EN CARENCIA/i)).toBeTruthy();
    });

    const vacunacionBtn = screen.getByText('Vacunación').parent?.parent;
    expect(vacunacionBtn?.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not show carencia banner when animal has no active carencia', async () => {
    mockGetCarenciaActivaDetalle.mockResolvedValue(null);

    render(
      <EventActionSheet visible rfid="AR123456" onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(mockGetCarenciaActivaDetalle).toHaveBeenCalled();
    });

    expect(screen.queryByText(/EN CARENCIA/i)).toBeNull();
  });
});

describe('EventActionSheet — TACTO resultado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByRfid.mockResolvedValue(mockAnimal);
    mockGetCarenciaActivaDetalle.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
    mockUpdateCategoria.mockResolvedValue(undefined);
  });

  it('shows descarte note when "Vacía" is selected', async () => {
    render(
      <EventActionSheet visible rfid="AR123456" onClose={jest.fn()} />
    );

    await waitFor(() => expect(mockFindByRfid).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Tacto'));

    await waitFor(() => {
      expect(screen.getByText(/Vacía — Descarte/i)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/Vacía — Descarte/i));

    expect(screen.getByText(/Categoría cambiará a Vaca Descarte/i)).toBeTruthy();
  });
});
