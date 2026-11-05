/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pages publica em https://<usuario>.github.io/studyos/ -> base precisa ser '/studyos/'.
// Use HashRouter no app: recarregar a página em qualquer rota não gera 404 no Pages.
export default defineConfig({
  base: '/studyos/',
  plugins: [react()],
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts?(x)'] },
})
