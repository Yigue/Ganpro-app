module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  env: {
    'react-native/react-native': false,
  },
  rules: {
    // §5.2 — Promesas flotantes: cualquier write() de WatermelonDB o llamada async
    // sin await o .catch() puede corromper la cola de sincronización silenciosamente.
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': ['error', {
      checksVoidReturn: { attributes: false }, // permite async en event handlers nativos de RN
    }],

    // §5.2 — Imports de tipos: permite a Babel tree-shake declaraciones de tipos
    // y previene dependencias circulares durante la inyección de contexto.
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false,
    }],

    // §5.2 — Prohíbe 'as any'; fuerza tipado estructural en repositorios.
    '@typescript-eslint/no-explicit-any': 'error',

    // Desactivar reglas demasiado ruidosas para el codebase actual
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',

    // Estilo
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  },
  overrides: [
    {
      // §5.1 — Sección de features y shared: prohíbe importar VALORES de modelos directamente.
      // Los modelos solo deben usarse como tipos (import type) para generics de TypeScript.
      // Todo acceso a datos va a través de src/data/repositories/.
      files: ['src/features/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['**/data/models/*', '../models/*', '../../models/*', '../../../models/*'],
              importNames: ['AnimalModel', 'LoteModel', 'EventoModel', 'SyncLogModel'],
              message:
                'Importar modelos de WatermelonDB como "import type" o acceder a datos a través de src/data/repositories/.',
            },
          ],
        }],
      },
    },
    {
      // Los archivos de test tienen sus propias reglas relajadas
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'babel.config.js', 'metro.config.js', 'jest.config.js', 'jest.setup.js'],
};
