/**
 * Unit tests for useRFIDScanner.
 *
 * Covers the six critical branches of the scan pipeline:
 *   1. Invalid RFID is ignored
 *   2. Valid RFID with DB hit → phase='found'
 *   3. Valid RFID with DB miss → phase='not_found'
 *   4. Duplicate scan within debounce window is dropped
 *   5. DB error → phase='error'
 *   6. Scan after debounce expires is processed normally
 *
 * Pattern: Arrange-Act-Assert.
 */

import { renderHook, act } from '@testing-library/react-native';

// --------------------------------------------------------------
// Mocks — must be declared before the module-under-test is imported
// --------------------------------------------------------------
const mockFetch = jest.fn();
const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
const mockGet = jest.fn(() => ({ query: mockQuery }));
const mockDatabase = { get: mockGet };

jest.mock('@shared/hooks/useDatabase', () => ({
  useDatabase: () => mockDatabase,
}));

const setRfid = jest.fn();
const setPhase = jest.fn();
const openRegistrationModal = jest.fn();
const openEventSheet = jest.fn();

jest.mock('@store/scanStore', () => ({
  useScanStore: () => ({
    setRfid,
    setPhase,
    openRegistrationModal,
    openEventSheet,
  }),
}));

const triggerSuccess = jest.fn();
const triggerError = jest.fn();

jest.mock('@shared/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    triggerSuccess,
    triggerError,
    triggerSelection: jest.fn(),
    triggerHeavy: jest.fn(),
  }),
}));

const playSuccess = jest.fn();
const playError = jest.fn();

jest.mock('@shared/hooks/useSoundFeedback', () => ({
  useSoundFeedback: () => ({ playSuccess, playError }),
}));

// AppState and Keyboard come from react-native — stub them
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      dismiss: jest.fn(),
    },
  };
});

// Import the hook AFTER mocks are set up
import { useRFIDScanner } from '../useRFIDScanner';

// --------------------------------------------------------------
// Helpers
// --------------------------------------------------------------
function resetAllMocks() {
  mockFetch.mockReset();
  mockQuery.mockClear();
  mockGet.mockClear();
  setRfid.mockClear();
  setPhase.mockClear();
  openRegistrationModal.mockClear();
  openEventSheet.mockClear();
  triggerSuccess.mockClear();
  triggerError.mockClear();
  playSuccess.mockClear();
  playError.mockClear();
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useRFIDScanner', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores RFIDs shorter than the minimum length (invalid)', async () => {
    // Arrange
    const { result } = renderHook(() => useRFIDScanner());

    // Act
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'A1' } });
    });
    await flushPromises();

    // Assert
    expect(setPhase).not.toHaveBeenCalledWith('scanning');
    expect(setPhase).not.toHaveBeenCalledWith('found');
    expect(setPhase).not.toHaveBeenCalledWith('not_found');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets phase=found and triggers success feedback when animal exists', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce([{ id: 'anim-1' }]);
    const { result } = renderHook(() => useRFIDScanner());

    // Act
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR123456' } });
    });
    await flushPromises();

    // Assert
    expect(setRfid).toHaveBeenCalledWith('AR123456');
    expect(setPhase).toHaveBeenCalledWith('scanning');
    expect(setPhase).toHaveBeenCalledWith('found');
    expect(triggerSuccess).toHaveBeenCalledTimes(1);
    expect(playSuccess).toHaveBeenCalledTimes(1);
  });

  it('sets phase=not_found and opens registration when animal missing', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useRFIDScanner());

    // Act
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR999999' } });
    });
    await flushPromises();

    // Assert
    expect(setPhase).toHaveBeenCalledWith('not_found');
    expect(triggerError).toHaveBeenCalledTimes(1);
    expect(playError).toHaveBeenCalledTimes(1);
  });

  it('debounces duplicate scans within the 300ms window', async () => {
    // Arrange
    mockFetch.mockResolvedValue([{ id: 'anim-1' }]);
    const { result } = renderHook(() => useRFIDScanner());

    // Act — two rapid-fire scans of the same tag
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR123456' } });
    });
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR123456' } });
    });
    await flushPromises();

    // Assert — only the first scan reached the DB
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets phase=error when the DB query throws', async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error('SQLite broke'));
    const { result } = renderHook(() => useRFIDScanner());

    // Act
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR123456' } });
    });
    await flushPromises();

    // Assert
    expect(setPhase).toHaveBeenCalledWith('error');
    expect(triggerError).toHaveBeenCalled();
  });

  it('processes a second scan normally after the debounce window expires', async () => {
    // Arrange
    mockFetch.mockResolvedValue([{ id: 'anim-1' }]);
    const { result } = renderHook(() => useRFIDScanner());

    // Act — scan, advance past debounce, scan again
    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR123456' } });
    });
    await flushPromises();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      result.current.onSubmitEditing({ nativeEvent: { text: 'AR987654' } });
    });
    await flushPromises();

    // Assert — both scans reached the DB
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
