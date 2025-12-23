
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
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 group">
            <img 
              src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain cursor-pointer transition-transform duration-700 ease-in-out hover:rotate-[360deg] active:scale-90"
              title="Desenvolvido por MSCHelp"
            />
            <div className="border-l pl-4 border-gray-200">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Caderno de Ideias</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em] mt-1">Simples. Rápido. Seu.</p>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar em suas notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
            />
          </div>

          <Button 
            variant="primary" 
            className="rounded-xl shadow-indigo-100 shadow-lg px-6"
            onClick={() => {
              setEditingNote(undefined);
              setIsFormOpen(true);
            }}
          >
            <i className="fas fa-plus mr-2 text-xs"></i> Nova Nota
          </Button>
        </div>
      </header>

      {/* Painel de Notas */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-200"></i>
            <p className="font-medium">Abrindo caderno...</p>
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
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-gray-200 shadow-sm">
              <i className="fas fa-feather-alt text-4xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-700">Seu caderno está em branco</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                {searchQuery ? 'Não encontramos notas com esse termo.' : 'Capture uma ideia, uma tarefa ou um insight agora mesmo.'}
              </p>
            </div>
            {!searchQuery && (
              <Button variant="secondary" className="rounded-xl" onClick={() => setIsFormOpen(true)}>
                Começar a escrever
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="bg-white/40 border-t py-6 px-6 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p>© 2025 Caderno de Ideias. Suas notas são armazenadas apenas localmente.</p>
            <p className="mt-1 text-gray-300">Desenvolvido com carinho por <span className="text-indigo-400/80 font-semibold uppercase tracking-tighter">MSCHelp</span></p>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              Modo Privado
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-magic text-amber-400"></i>
              Insights com IA
            </span>
          </div>
        </div>
      </footer>

      {/* Modal de Formulário */}
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
