import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createServiceWorkerSource } from './src/pwa/createServiceWorkerSource.js'

const offlineServiceWorker = () => ({
  name: 'myinventory-offline-service-worker',
  generateBundle(_, bundle) {
    const assetPaths = Object.values(bundle)
      .map((output) => `/${output.fileName}`)
      .filter((fileName) => fileName !== '/sw.js')

    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: createServiceWorkerSource(assetPaths),
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
})
