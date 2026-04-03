import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/lib/retell/**', 'src/store/**'],
            exclude: ['**/*.d.ts', '**/__tests__/**'],
            thresholds: {
                // Umbrales por fichero crítico — no jugamos con la media global
                'src/lib/retell/toolMapper.ts': {
                    lines: 95,
                    functions: 100,
                    branches: 75,
                },
                'src/lib/retell/webhookAuth.ts': {
                    lines: 100,
                    functions: 100,
                    branches: 100,
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
