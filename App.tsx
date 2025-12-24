
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

declare global {
  // Fix: Utilizando o tipo global AIStudio conforme exigido pelo compilador
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(true);

  const checkKey = useCallback(async () => {
    if (!process.env.API_KEY) {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(false);
      }
    } else {
      setHasApiKey(true);
    }
  }, []);

  const handleOpenSelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume que a chave foi selecionada conforme diretrizes para evitar race conditions
      setHasApiKey(true);
    } else {
      alert("Seletor de chaves não disponível.");
    }
  };

  const loadNotes = useCallback(() => {
    const fetched = storageService.searchNotes(searchQuery);
    setNotes(fetched);
    setIsLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    checkKey();
    loadNotes();
  }, [loadNotes, checkKey]);

  const handleSaveNote = (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      storageService.updateNote(editingNote.id, data);
    } else {
      storageService.createNote(data);
    }
    setEditingNote(undefined);
    setIsFormOpen(false);
    loadNotes();
  };

  const handleUpdateNoteField = (id: string, updates: Partial<Note>) => {
    storageService.updateNote(id, updates);
    loadNotes();
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Deseja excluir esta nota permanentemente?')) {
      storageService.deleteNote(id);
      loadNotes();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {!hasApiKey && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-3">
            <i className="fas fa-robot animate-bounce"></i>
            <span className="text-xs font-black uppercase tracking-widest">
              Configuração Necessária para IA funcionar
            </span>
          </div>
          <button 
            onClick={handleOpenSelector}
            className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black hover:scale-105 transition-transform"
          >
            VINCULAR CHAVE API
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl shadow-sm border-b px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => loadNotes()}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 transition-transform group-hover:scale-110">
              <i className="fas fa-feather-pointed text-white text-lg"></i>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Caderno de Ideias</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.3em] mt-1.5">Inteligência Gemini</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl w-full relative">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>

          <Button onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }} className="shadow-lg shadow-indigo-100">
            <i className="fas fa-plus mr-2"></i> Nova Nota
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
            <p>Carregando suas ideias...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
            <i className="fas fa-note-sticky text-6xl mb-6 opacity-20"></i>
            <p className="text-xl font-medium">Nenhuma nota encontrada</p>
            <p className="text-sm">Comece criando sua primeira ideia!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {notes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onEdit={(n) => { setEditingNote(n); setIsFormOpen(true); }}
                onDelete={handleDeleteNote}
                onUpdate={handleUpdateNoteField}
              />
            ))}
          </div>
        )}
      </main>

      {isFormOpen && (
        <NoteForm 
          note={editingNote}
          onSave={handleSaveNote}
          onCancel={() => { setIsFormOpen(false); setEditingNote(undefined); }}
        />
      )}
      
      <footer className="bg-white border-t py-8 px-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Caderno de Ideias. Desenvolvido com Gemini AI.</p>
      </footer>
    </div>
  );
};

// Fix: Adicionando exportação padrão para resolver erro no index.tsx
export default App;
