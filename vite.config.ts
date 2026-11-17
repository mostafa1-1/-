import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function copyUnbundledAssetsPlugin(): Plugin {
  return {
    // Copies unbundled asset directories into dist/ so root-relative URLs like
    // "/src/assets/images/..." (e.g. generate_image output) still resolve
    // in production builds. Do not remove.
    name: 'copy-unbundled-src-assets',
    apply: 'build',
    closeBundle(error?: Error): void {
      if (error) {
        return;
      }
      const distDir = path.resolve(import.meta.dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        return;
      }

      const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
      const distSrcAssets = path.resolve(distDir, 'src/assets');
      if (fs.existsSync(srcAssets)) {
        fs.cpSync(srcAssets, distSrcAssets, { recursive: true, force: true });
      }

      const rootAssets = path.resolve(import.meta.dirname, 'assets');
      const distAssets = path.resolve(distDir, 'assets');
      if (fs.existsSync(rootAssets)) {
        fs.cpSync(rootAssets, distAssets, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    publicDir: 'public',
    assetsInclude: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.webp',
      '**/*.gif',
      '**/*.svg',
      '**/*.avif',
      '**/*.ico',
    ],
    plugins: [react(), tailwindcss(), copyUnbundledAssetsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsDir: 'assets',
      assetsInlineLimit: 4096,
      copyPublicDir: true,
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      minify: 'oxc',
      sourcemap: false,
      reportCompressedSize: true,
      rolldownOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? '';
            if (/\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-firebase',
                test: /node_modules[\\/](firebase|@firebase)[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-ui',
                test: /node_modules[\\/](lucide-react|motion|framer-motion)[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    server: (() => {
      const isCloudProxy = Boolean(
        process.env.K_SERVICE ||
          process.env.CLOUD_RUN_EXECUTION ||
          (process.env.APP_URL && process.env.APP_URL.startsWith('https://'))
      );
      const hmrDisabled = process.env.DISABLE_HMR === 'true' || isCloudProxy;
      return {
        // HMR is disabled in AI Studio via DISABLE_HMR env var or behind the Cloud Run HTTPS proxy
        // to prevent unhandled WebSocket errors and flickering during agent edits.
        hmr: hmrDisabled ? false : { clientPort: 443 },
        // Disable file watching when HMR is disabled to save CPU during agent edits.
        watch: hmrDisabled ? null : {},
      };
    })(),
  };
});
