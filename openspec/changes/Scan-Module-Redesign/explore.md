# Exploración: Rediseño del Módulo Scan y Mock de RFID

## Contexto
El usuario no tiene hardware (bastón RFID) para probar el flujo de lectura de caravanas. Se necesita un "Boton de test" para inyectar una lectura simulada en la UI. Además, se requiere un rediseño "moderno, profesional y minimalista" de toda la pantalla de lectura, asegurando que cubra el 100% de la funcionalidad actual pero con mejor arquitectura UX.

## Análisis del Código Actual
El archivo `src/features/scan/ScanScreen.tsx` centraliza la captura.
1. **Captura Física:** Se usa un `<TextInput style={styles.hiddenInput}>` oculto para atrapar eventos HID del lector como si fueran tipeados por teclado.
2. **Ciclo de Estado:** `useScanStore` maneja el estado de lectura (`phase`: idle, scanning, found, not_found, error).
3. **Modos:** Individual (muestra un animal y permite abrir action sheets) y Batch (acumula en un `queue`).

## Problemas de la UI actual
- La animación flash (`flashAnim`) es un parche, no es un diseño fluido real.- La información en modo batch es pobre: solo muestra un número gigante y un botón "Limpiar cola".- El chip de modo (Individual/Batch) está en la UI arriba y no parece fluido para uso a una mano en trabajo de manga.
- El radar (idle) es solo texto plano "📡 Acerque el lector". Faltan animaciones atractivas (pulse waves u ondas concéntricas).

## Solución Propuesta (Rediseño y Mock)

### 1. Inyección de Mock (Validación Lógica)
Para simular el escáner HID, basta con añadir un botón que ejecute la lógica que el `useRFIDScanner` normalmente dispara en su `onSubmitEditing`. En desarrollo (o activable vía botón), se disparará un texto hardcodeado (ej: `CARAVANA-TEST-123`) directo al mecanismo de validación.
Implementación sugerida:
- Botón "Simular Escaneo" visible en UI o un FAB en la esquina inferior.
- Un método en el Store o en el custom hook que reciba el mock string y haga bypass del `TextInput`. 

### 2. Arquitectura de UI Minimalista Profesional
Para seguir un diseño moderno como las features avanzadas de la Fase 2.4 (TrendBadge, Skeleton), el sector debe ser rediseñado:

1. **Estado "Idle" (Radar en Manga):**
   - Eliminar el ícono 📡.
   - En su lugar: ondas concéntricas animadas vía `react-native-reanimated` alrededor de un icono SVG de un animal o RFID. Esto comunica claramente "Esperando hardware".
2. **Modo Acción Múltiple (Bottom Sheet como Action Hub):**
   - En lugar de modales estándar y Alert, las acciones deben presentarse en contenedores (Cards/BottomSheets) bien demarcados.
   - El toggle Batch/Individual debe ser un elegante componente tipo Segmented Control (Switch) redondeado en la zona media alta.
3. **Listado de Batch Interactivo:**
   - En en modo batch, la cola en lugar de solo texto debe poder deslizarse en lista corta (usando `BottomSheet` inferior pre-asomando o `FlatList`).
4. **Respuesta Rápida:**
   - Sonidos/Voz (Haptic Feedback) si no se implementó aún, o reforzar el destello en modo de pantalla completa a card highlight.

## Pasos Siguientes Recomendados (Para SDD Propuesta)
- Integrar la UI del "Test Scan" usando `Button` ya existente en `src/shared/components/`.
- Reescribir la vista interna del `ScanScreen` para abstraer `BatchModeView` y `IndividualModeView` separando la monolítica UI actual.
- Añadir el componente visual `RadarAnimation` usando Reanimated.

**Riesgos:**
No alterar la auto-selección del `hiddenInput` (focus automático): el botón "Mock" debe evitar hacer que el foco del TextInput principal se pierda durante el uso normal del bastón.
