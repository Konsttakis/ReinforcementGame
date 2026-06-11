import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ReinforcementGame/',
  server: {
    watch: {
      ignored: ['**/*.crdownload', '**/*.~tmp', '**/*.tmp']
    }
  },
  test: {
    environment: 'jsdom'
  }
});
