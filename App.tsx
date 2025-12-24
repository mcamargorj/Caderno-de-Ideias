
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotes = useCallback(() => {
    const fetched = storageService.searchNotes(searchQuery);
    setNotes(fetched);
    setIsLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl shadow-sm border-b px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => loadNotes()}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 transition-transform group-hover:scale-110">
              <i className="fas fa-feather-pointed text-white text-lg"></i>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Caderno de Ideias</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.3em] mt-1.5">Inteligência MSCHelp</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl w-full relative">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar em suas notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-100 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>

          <Button 
            variant="primary" 
            className="rounded-2xl shadow-indigo-100 shadow-xl px-8 h-12 font-bold text-sm tracking-wide transition-all hover:-translate-y-0.5"
            onClick={() => {
              setEditingNote(undefined);
              setIsFormOpen(true);
            }}
          >
            <i className="fas fa-plus mr-2 text-[10px]"></i> Nova Nota
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-slate-300">
            <i className="fas fa-circle-notch fa-spin text-5xl mb-6"></i>
            <p className="font-bold tracking-widest text-xs uppercase">Sincronizando...</p>
          </div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
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
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
            <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-300 shadow-inner">
              <i className="fas fa-lightbulb text-5xl"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nenhuma ideia ainda</h3>
              <p className="text-sm text-slate-400 max-w-[240px] mx-auto font-medium">
                Sua próxima grande ideia começa com uma simples nota.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-8 px-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p>© 2025 Caderno de Ideias • MSCHelp Lab</p>
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2.5">
              <i className="fas fa-bolt text-amber-400"></i> Gemini 3 Flash (Free Tier)
            </span>
            <span className="flex items-center gap-2.5">
              <i className="fas fa-cloud-sun text-indigo-400"></i> Cloud Native
            </span>
          </div>
        </div>
      </footer>

      {isFormOpen && (
        <NoteForm 
          note={editingNote}
          onSave={handleSaveNote}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingNote(undefined);
          }}
        />
      )}
    </div>
  );
};

export default App;
