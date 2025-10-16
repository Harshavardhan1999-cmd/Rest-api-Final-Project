// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // ✅ Correct combined config
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: '0.0.0.0',           // allow access from other devices
//     proxy: {
//       '/api': 'http://192.168.64.15:5000'   // forward API calls to backend
//     }
//   }
// })
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': env.VITE_API_BASE_URL || 'http://localhost:5000'
      }
    }
  }
})
