
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

// @google/genai guidelines: Declare the AIStudio interface to match the environment's expectation.
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

declare global {
  interface Window {
    // @google/genai guidelines: Use the AIStudio type instead of any to fix property mismatch and modifier errors.
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);

  const handleKeyError = useCallback(() => {
    setNeedsKey(true);
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      // @google/genai guidelines: Use window.aistudio.hasSelectedApiKey() to check key availability as priority.
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setNeedsKey(!hasKey);
        } catch (e) {
          // Fallback to process.env if interface check fails
          setNeedsKey(!process.env.API_KEY);
        }
      } else if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        setNeedsKey(false);
      } else {
        setNeedsKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // @google/genai guidelines: Assume success after openSelectKey() to avoid race conditions.
        setNeedsKey(false);
      } catch (err) {
        console.error("Erro ao selecionar chave:", err);
      }
    } else {
      alert("Ambiente de seleção de chave não detectado. Se você configurou no Vercel, certifique-se de que o Build Step está injetando a variável corretamente ou use o ambiente do AI Studio.");
    }
  };

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

  if (needsKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 border border-gray-100">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-indigo-50/50">
            <i className="fas fa-key text-3xl text-indigo-600"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Configuração de Chave</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Para usar as funções de IA, você precisa vincular sua <strong>API Key</strong> do Google Gemini. Sua chave do <strong>Nível Gratuito</strong> funcionará perfeitamente aqui.
            </p>
          </div>
          <div className="space-y-4">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-100" 
              onClick={handleSelectKey}
            >
              Vincular Minha Chave
            </Button>
            <div className="pt-2">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              >
                Documentação de faturamento do Gemini <i className="fas fa-external-link-alt ml-1"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 group">
            <img 
              src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain cursor-pointer transition-transform duration-700 ease-in-out hover:rotate-[360deg]"
            />
            <div className="border-l pl-4 border-gray-200">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Caderno de Ideias</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em] mt-1">Inteligência MSCHelp</p>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar em suas notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
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
                onKeyError={handleKeyError}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-gray-200 shadow-sm border border-gray-100">
              <i className="fas fa-feather-alt text-4xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-700">O caderno está vazio</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                Capture sua primeira ideia clicando no botão acima.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white/40 border-t py-6 px-6 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2025 Caderno de Ideias. Desenvolvido por <span className="text-indigo-500 font-bold uppercase tracking-tighter">MSCHelp</span></p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <i className="fas fa-shield-alt"></i> Armazenamento Local
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-magic text-amber-400"></i> Gemini 3 AI
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
