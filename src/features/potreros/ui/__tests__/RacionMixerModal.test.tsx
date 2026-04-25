import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RacionMixerModal } from '../RacionMixerModal';
import { Alert } from 'react-native';

// Mock the repository and database
jest.mock('@data/database/database', () => ({
  database: {}
}));
jest.mock('@data/repositories/NutricionRepository', () => {
  return {
    NutricionRepository: jest.fn().mockImplementation(() => ({
      createRacionConIngredientes: jest.fn().mockResolvedValue({})
    }))
  };
});

describe('RacionMixerModal', () => {
  const mockSuplementos = [
    { id: '1', nombre: 'Maiz', tipo: 'MAIZ', precioPorTonelada: 150000 },
    { id: '2', nombre: 'Silo', tipo: 'SILO', precioPorTonelada: 80000 }
  ] as any;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls onClose when close button is pressed', () => {
    const onCloseMock = jest.fn();
    const { getByText } = render(
      <RacionMixerModal visible={true} onClose={onCloseMock} suplementos={mockSuplementos} />
    );

    fireEvent.press(getByText('Cancelar'));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('shows an alert if the total percentage is not exactly 100', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(
      <RacionMixerModal visible={true} onClose={jest.fn()} suplementos={mockSuplementos} />
    );

    // Initial state is 0%, so it should fail
    fireEvent.press(getByText('Guardar Ración'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'La mezcla debe sumar 100%');
  });

  // Note: A more thorough test would find the inputs, change their values to sum to 100, 
  // and assert that createRacionConIngredientes is called, but we are just verifying the basic validation and closing.
});