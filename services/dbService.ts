
import { Note, StorageState } from '../types.ts';

const STORAGE_KEY = 'notas_rapidas_storage';

/**
 * Serviço para gerenciar o salvamento das notas no navegador.
 */
export const storageService = {
  getStorage: (): StorageState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { notes: [], version: 1 };
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return { notes: [], version: 1 };
    }
  },

  saveStorage: (state: StorageState): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  getAllNotes: (): Note[] => {
    return storageService.getStorage().notes.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getNoteById: (id: string): Note | undefined => {
    return storageService.getStorage().notes.find(n => n.id === id);
  },

  createNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
    const storage = storageService.getStorage();
    const newNote: Note = {
      ...note,
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.notes.push(newNote);
    storageService.saveStorage(storage);
    return newNote;
  },

  updateNote: (id: string, updates: Partial<Note>): Note => {
    const storage = storageService.getStorage();
    const index = storage.notes.findIndex(n => n.id === id);
    if (index === -1) throw new Error("Nota não encontrada");

    const updatedNote = {
      ...storage.notes[index],
      ...updates,
      updatedAt: Date.now(),
    };
    storage.notes[index] = updatedNote;
    storageService.saveStorage(storage);
    return updatedNote;
  },

  deleteNote: (id: string): void => {
    const storage = storageService.getStorage();
    const filteredNotes = storage.notes.filter(n => n.id !== id);
    storageService.saveStorage({ ...storage, notes: filteredNotes });
  },

  searchNotes: (query: string): Note[] => {
    const notes = storageService.getAllNotes();
    if (!query) return notes;
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
  },

  // Novas funções de Backup
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
      
      // Validação básica
      if (Array.isArray(imported.notes)) {
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
