
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo_mschelp.png'],
          manifest: {
            name: 'Insights App',
            short_name: 'Insights',
            description: 'Seu caderno inteligente de insights',
            theme_color: '#4f46e5',
            icons: [
              {
                src: 'https://mathblox.mschelp.com.br/logo_mschelp.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://mathblox.mschelp.com.br/logo_mschelp.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
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
