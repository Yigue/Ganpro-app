# Technical Spec: Módulo Potreros y Nutrición 360°

## 1. Arquitectura de Datos (WatermelonDB)
Modelos implicados y sus validaciones:
- `PotreroModel`: Requerido nombre, hectareas, recursoForrajero.
- `SuplementoModel` (Componentes): Requerido nombre, tipo, precioPorTonelada.
- `RacionModel`: Requerido nombre, costoPorKg (derivado), ingredientes (JSON o tabla intermedia).
- `AlimentacionLogModel` (NUEVO o existente en logs): Para registrar "Aplicar Ración a Lote" -> Fecha, RacionId, PotreroId, CantidadKg, CostoTotal.
- `CondicionCorporalModel`: Fecha, score, potreroId/animalId.

## 2. Flujos de UI y Navegación

### Potreros Tab (`PotrerosScreen.tsx` - Tab 'potreros')
- **Cambio Estructural:** El contenedor principal debe ser el `FlatList` de potreros. Los botones de Tabs serán el `ListHeaderComponent`.
- **Botón Flotante (FAB):** Agregar "+" abajo a la derecha. Abre `PotreroFormModal`.
- **PotreroDetailsInner:** Actualizar el botón "Editar" para que abra `PotreroFormModal` con los datos cargados. Actualizar el botón "Suplementar este Potrero" para que abra `AplicarRacionModal`.

### Nutrición Tab (`PotrerosScreen.tsx` - Tab 'nutricion')
- **Sección Componentes (NUEVA):** 
  - Lista horizontal o acordeón de `SuplementoModel`.
  - Botón "Nuevo Componente" -> Lanza `SuplementoFormModal`.
- **Sección Raciones:**
  - `RacionMixerModal`: Agregar Header con botón "Cerrar" (soluciona UX bug). Lógica de suma a 100% y costo calculado leyendo las relaciones.
- **Sección Calculadoras:**
  - Botón "Simulador de Ganancia (GDP)" -> Abre `SimuladorGDPModal`. (Input: Racion, Peso Lote -> Output: Estimación de GDP y Costo de kg ganado).

### C.C. Tab (`PotrerosScreen.tsx` - Tab 'cc')
- **Gráfico Dinámico:** Reemplazar `[320, 335...]` por `ccs.map(c => c.score)`.
- **Botón Flotante (FAB):** Agregar "+" para "Nueva Auditoría".
- **Auditoría Modal:** Selector de fecha, slider de 1 a 5, selector de Potrero/Lote. Al guardar, hace un `database.get('condicion_corporal').create(...)`.

## 3. Servicios de Negocio (Application Layer)
Para evitar saturar la UI con lógica espagueti, encapsularemos en `src/data/repositories/NutricionRepository.ts` (o Service):

```typescript
// NutricionRepository.ts
async applyRacionToPotrero(racionId: string, potreroId: string, kilos: number): Promise<void> {
  // 1. Busca la ración y obtiene su costoPorKg
  // 2. Crea un registro de Consumo/Alimentación
  // 3. (Opcional) Afecta caja financiera si se parametriza así.
}

calculateGDPEstimado(racionId: string, pesoPromedio: number): { gdp: number, costoKgProducido: number } {
  // Fórmulas agronómicas de estimación básica
}
```

## 4. Plan de Ejecución (Siguientes Fases)
1. **Refactor UX (Fix Errores React Native):** Eliminar la advertencia `setLayoutAnimationEnabledExperimental` global, limpiar los `ScrollView` anidados en la screen principal.
2. **Capa de Datos:** Crear ABM de `PotreroModel` y `SuplementoModel`.
3. **Logística Nutricional:** Interfaz del Formulador (`RacionMixerModal`) y modal de `AplicarRacionModal`.
4. **Calculadoras y C.C.:** Implementar simuladores matemáticos y graficar la historia de C.C. dinámicamente.
