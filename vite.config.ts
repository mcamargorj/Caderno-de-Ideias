
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix for 'Cannot find name __dirname' in ESM environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Carrega todas as variáveis de ambiente sem filtro de prefixo
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Mapeia a chave da API do Gemini
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        
        // Mapeia a URL do Supabase tentando os prefixos que o Vercel ou a integração podem ter criado
        'process.env.SUPABASE_URL': JSON.stringify(
          env.NEXT_PUBLIC_SUPABASE_URL || 
          env.SUPABASE_URL || 
          env.STORAGE_URL || 
          ''
        ),
        
        // Mapeia a Chave Anon do Supabase tentando os diferentes nomes que o Vercel usa
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
          env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
          env.SUPABASE_ANON_KEY || 
          env.STORAGE_ANON_KEY || 
          ''
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
      }
    };
});
