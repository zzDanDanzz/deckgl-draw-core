import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        react(),
        dts({ 
            tsconfigPath: './tsconfig.app.json',
            include: ['src'], 
            exclude: ['src/demo'], 
            insertTypesEntry: true 
        })
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'DeckglDraw',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                '@deck.gl/core',
                '@deck.gl/layers',
                'immer'
            ],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    '@deck.gl/core': 'deck',
                    immer: 'immer'
                },
            },
        },
    },
});