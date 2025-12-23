
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
    return JSON.parse(data);
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
      id: crypto.randomUUID(),
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
    storage.notes = storage.notes.filter(n => n.id !== id);
    storageService.saveStorage(storage);
  },

  searchNotes: (query: string): Note[] => {
    const notes = storageService.getAllNotes();
    if (!query) return notes;
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
  }
};
