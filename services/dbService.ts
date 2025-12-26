
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Note, StorageState, User } from '../types';

const STORAGE_KEY = 'notas_rapidas_storage';

// Variáveis de ambiente injetadas via Vite/Vercel
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error("Erro ao inicializar cliente Supabase:", err);
  }
} else {
  console.warn("Supabase: Variáveis de ambiente ausentes. Operando em modo LocalStorage.");
}

export const storageService = {
  getStorage: (): StorageState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { notes: [], version: 1 };
    try {
      return JSON.parse(data);
    } catch (e) {
      return { notes: [], version: 1 };
    }
  },

  saveStorage: (state: StorageState): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  // Auth
  signInWithGoogle: async (): Promise<{error: any}> => {
    if (!supabase) {
      return { error: new Error("Configuração do Supabase incompleta.") };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    return { error };
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!supabase) {
      callback(null);
      return () => {};
    }
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata.full_name || session.user.email,
          photoURL: session.user.user_metadata.avatar_url || null
        });
      } else {
        callback(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata.full_name || session.user.email,
          photoURL: session.user.user_metadata.avatar_url || null
        });
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  },

  // Database Sync
  syncWithCloud: (userId: string, callback: (notes: Note[]) => void) => {
    if (!supabase) return () => {};

    // Initial fetch
    supabase
      .from('notes')
      .select('*')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) callback(data as Note[]);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`user-notes-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `userId=eq.${userId}` },
        () => {
          supabase!
            .from('notes')
            .select('*')
            .eq('userId', userId)
            .order('updatedAt', { ascending: false })
            .then(({ data }) => {
              if (data) callback(data as Note[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  },

  createNote: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<Note> => {
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2));
    const newNote: Note = {
      ...note,
      id,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (userId && supabase) {
      const { error } = await supabase.from('notes').insert([newNote]);
      if (error) console.error("Erro ao salvar no Supabase:", error);
    } else {
      const storage = storageService.getStorage();
      storage.notes.push(newNote);
      storageService.saveStorage(storage);
    }
    return newNote;
  },

  updateNote: async (id: string, updates: Partial<Note>, userId?: string): Promise<void> => {
    const updatedAt = Date.now();
    if (userId && supabase) {
      const { error } = await supabase
        .from('notes')
        .update({ ...updates, updatedAt })
        .eq('id', id);
      if (error) console.error("Erro ao atualizar no Supabase:", error);
    } else {
      const storage = storageService.getStorage();
      const index = storage.notes.findIndex(n => n.id === id);
      if (index !== -1) {
        storage.notes[index] = { ...storage.notes[index], ...updates, updatedAt };
        storageService.saveStorage(storage);
      }
    }
  },

  deleteNote: async (id: string, userId?: string): Promise<void> => {
    if (userId && supabase) {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) console.error("Erro ao deletar no Supabase:", error);
    } else {
      const storage = storageService.getStorage();
      const filteredNotes = storage.notes.filter(n => n.id !== id);
      storageService.saveStorage({ ...storage, notes: filteredNotes });
    }
  },

  migrateToCloud: async (userId: string) => {
    if (!supabase) return;
    const storage = storageService.getStorage();
    if (storage.notes.length === 0) return;

    const notesToMigrate = storage.notes.map(n => ({ ...n, userId }));
    const { error } = await supabase.from('notes').insert(notesToMigrate);

    if (!error) {
      storageService.saveStorage({ ...storage, notes: [] });
    } else {
      console.error("Erro na migração Supabase:", error);
    }
  },

  searchNotes: (allNotes: Note[], query: string): Note[] => {
    if (!query) return allNotes;
    const lowerQuery = query.toLowerCase();
    return allNotes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
  },

  exportBackup: () => {
    const storage = storageService.getStorage();
    const blob = new Blob([JSON.stringify(storage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-insights-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as StorageState;
      if (imported && Array.isArray(imported.notes)) {
        storageService.saveStorage(imported);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Erro ao importar backup:", e);
      return false;
    }
  }
};
