# 🐂 GanPro: Reglas de Codeo y Buenas Prácticas (AI Manifest)

Este manifiesto es la **Constitución Técnica** del proyecto. Es de lectura y cumplimiento ESTRICTO y OBLIGATORIO para todo sub-agente y desarrollador que opere en el código fuente de GanPro.

## 1. Strict Type-Driven Development
Siempre definir interfaces/tipos TypeScript y schemas (Zod) **ANTES** de implementar la lógica o el componente. 
*   **Regla de Oro**: Cero tolerancia al uso de `any`. Si no sabés el tipo, usá `unknown` y validá.

## 2. WatermelonDB Best Practices
Uso exclusivo de los decoradores de `@nozbe/watermelondb` (`@field`, `@relation`, `@children`, `@date`, etc.).
*   Toda lectura de datos en componentes React DEBE estar envuelta en HOCs (`@withObservables`) o Hooks reactivos provistos por el ecosistema.
*   **Prohibido**: NUNCA hacer llamadas síncronas o `await` a queries de la BD directamente en el método render del componente.

## 3. Feature-Sliced Design (FSD)
Mantener una estructura clara y escalable de carpetas (`entities`, `features`, `widgets`, `pages`, `shared`).
*   **Prohibido**: Acoplar lógica de negocio (consultas a BD, mutaciones) dentro de los componentes visuales genéricos (`shared/ui`).

## 4. Container-Presentational Pattern
Separación tajante entre lógica y vista.
*   El componente que renderiza la UI (Presentational / Dumb Component) **no debe saber que existe WatermelonDB**. Solo recibe `props` crudas.
*   El Container (Smart Component / Observer) es el responsable de hacer la query, observar los cambios de WatermelonDB y mapearlos a las `props` del componente tonto.

## 5. Small & Pure Functions
Modularidad extrema.
*   Si un componente o archivo supera las **150 líneas**, DEBE ser refactorizado en subcomponentes lógicos más pequeños.
*   Las funciones auxiliares matemáticas o de formato deben ser puras (sin side-effects) y fácilmente testeables.

## 6. Manejo de Errores Silenciosos (Offline-First)
En la manga no hay tiempo para lidiar con popups de error genéricos.
*   Todas las transacciones de BD (`db.write(...)`) deben estar envueltas en bloques `try/catch`.
*   Los errores deben generar logs internos (Crashlytics o Sentry local) evitando crasheos fatales (White screen of death) que interrumpan el flujo de trabajo del peón.

## 7. Auto-Documentación en Código (JSDoc)
El código debe explicar la lógica de negocio subyacente.
*   Uso obligatorio de JSDoc para funciones críticas de negocio (ej. cálculos de EV/ha, días de carencia, algoritmos de IATF).
*   Se debe explicar brevemente **POR QUÉ** se hace ese cálculo (la regla de negocio ganadera), no solo **QUÉ** hace el código.
