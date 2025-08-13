import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import proxyOptions from './proxyOptions';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		port: 8080,
		proxy: proxyOptions,
		hmr: {
			overlay: false,
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	build: {
		outDir: '../afterz/public/frontend',
		emptyOutDir: true,
		target: 'es2015',
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/main.tsx'),
				whatworkz: path.resolve(__dirname, 'src/main-whatworkz.jsx')
			},
			output: {
				entryFileNames: (chunkInfo) => {
					return chunkInfo.name === 'main' ? 'index.js' : '[name].js'
				},
				chunkFileNames: '[name].js',
				assetFileNames: 'index.[ext]'
			}
		}
	},
});
