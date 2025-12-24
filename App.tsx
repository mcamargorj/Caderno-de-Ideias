
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

// O objeto global aistudio é injetado pelo ambiente. 
// Usaremos uma asserção de tipo local para evitar conflitos de declaração global que causam erros de compilador.

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);

  // Helper para acessar o objeto aistudio injetado com segurança
  const getAiStudio = () => (window as any).aistudio;

  const checkApiKeyStatus = useCallback(async () => {
    const aiStudio = getAiStudio();
    if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
      const hasKey = await aiStudio.hasSelectedApiKey();
      setNeedsKey(!hasKey);
    }
  }, []);

  const handleOpenKeySelector = async () => {
    const aiStudio = getAiStudio();
    if (aiStudio && typeof aiStudio.openSelectKey === 'function') {
      await aiStudio.openSelectKey();
      // Assume sucesso para evitar race condition conforme as diretrizes da API
      setNeedsKey(false);
    }
  };

  const loadNotes = useCallback(() => {
    const fetched = storageService.searchNotes(searchQuery);
    setNotes(fetched);
    setIsLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    checkApiKeyStatus();
    loadNotes();
  }, [loadNotes, checkApiKeyStatus]);

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
    if (confirm('Deseja realmente excluir esta nota?')) {
      storageService.deleteNote(id);
      loadNotes();
    }
  };

  const openEditForm = (note: Note) => {
    setEditingNote(note);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {needsKey && (
        <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <i className="fas fa-key"></i>
            <span>A IA precisa de uma chave configurada para funcionar fora do ambiente de teste.</span>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="bg-white text-amber-600 px-3 py-1 rounded hover:bg-amber-50 transition-colors"
          >
            CONFIGURAR AGORA
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => loadNotes()}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 transition-all duration-500 group-hover:bg-indigo-700">
              <i className="fas fa-robot text-white text-2xl transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]"></i>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Caderno de Anotações</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.3em] mt-1.5">Inteligência Artificial</p>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
            />
          </div>

          <Button 
            variant="primary" 
            className="rounded-xl shadow-indigo-100 shadow-lg px-6 font-bold"
            onClick={() => {
              setEditingNote(undefined);
              setIsFormOpen(true);
            }}
          >
            <i className="fas fa-plus mr-2 text-xs"></i> Nova Nota
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-200"></i>
            <p className="font-medium">Carregando...</p>
          </div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {notes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onEdit={openEditForm} 
                onDelete={handleDeleteNote}
                onUpdate={handleUpdateNoteField}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-gray-200 shadow-sm border border-slate-100">
              <i className="fas fa-lightbulb text-4xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-700">Seu caderno está vazio</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                Capture um pensamento rápido ou deixe a IA ajudar você a organizar suas ideias.
              </p>
            </div>
            {!searchQuery && (
              <Button variant="secondary" className="rounded-xl" onClick={() => setIsFormOpen(true)}>
                Escrever agora
              </Button>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white/40 border-t py-8 px-6 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p>© 2025 Caderno de Anotações. Armazenamento local 100% privado.</p>
            <p className="mt-1">Desenvolvido com <i className="fas fa-heart text-red-400 mx-1"></i> por <span className="font-black text-indigo-600 tracking-tight">MSCHelp</span></p>
          </div>
          <div className="flex items-center gap-4 justify-center">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-indigo-500 transition-colors">Documentação de Faturamento</a>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span className="font-bold">Powered by Gemini 3</span>
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
