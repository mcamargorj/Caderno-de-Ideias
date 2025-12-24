
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

// @google/genai guidelines: Use any to avoid conflict with existing global declarations of AIStudio.
declare global {
  interface Window {
    aistudio: any;
  }
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);

  // @google/genai guidelines: Reset key selection state if needed by setting needsKey to true.
  const handleKeyError = useCallback(() => {
    setNeedsKey(true);
  }, []);

  // Verifica se a chave de API está disponível (seja por process.env ou via seleção)
  useEffect(() => {
    const checkApiKey = async () => {
      // 1. Se já existir no process.env (injetado pelo ambiente), estamos prontos.
      if (process.env.API_KEY) {
        setNeedsKey(false);
        return;
      }

      // 2. Se estivermos no ambiente que suporta seleção de chave (AI Studio / Vercel Wrapper)
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setNeedsKey(true);
        }
      } else {
        // 3. Caso não haja chave nem interface de seleção, avisamos o usuário.
        setNeedsKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // @google/genai guidelines: Conforme as diretrizes, assumimos sucesso após abrir o diálogo para evitar race conditions.
        setNeedsKey(false);
      } catch (err) {
        console.error("Erro ao selecionar chave:", err);
      }
    } else {
      alert("Para usar a IA no Vercel, você deve usar o ambiente de preview do AI Studio ou configurar um Build Step que injete as variáveis.");
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

  // Tela de Inicialização/Configuração de Chave
  if (needsKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-700">
          <div className="relative inline-block">
             <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
             <div className="relative bg-white rounded-full p-6 shadow-xl border border-indigo-50">
                <i className="fas fa-magic text-4xl text-indigo-600"></i>
             </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Ative a Inteligência</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              O seu Caderno de Ideias utiliza o modelo <strong>Gemini 3 Flash</strong> para organizar seus pensamentos. Para começar, vincule sua chave de API.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-100" 
              onClick={handleSelectKey}
            >
              Vincular Chave de API
            </Button>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              Requer chave de um projeto GCP pago ou quota disponível
            </p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="block text-xs text-indigo-500 hover:underline"
            >
              Saiba mais sobre faturamento e limites <i className="fas fa-external-link-alt ml-1"></i>
            </a>
          </div>
        </div>
      </div>
    );
  }

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
            />
            <div className="border-l pl-4 border-gray-200 text-left">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Caderno de Ideias</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em] mt-1">Simples. Rápido. Seu.</p>
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
            <p className="font-medium tracking-tight">Abrindo caderno...</p>
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
              <h3 className="text-xl font-bold text-gray-700">Caderno em branco</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                {searchQuery ? 'Não encontramos nada com esse termo.' : 'Capture uma ideia, uma tarefa ou um insight agora mesmo.'}
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
      <footer className="bg-white/40 border-t py-6 px-6 text-gray-400 text-[10px] md:text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p>© 2025 Caderno de Ideias. Armazenamento Local Seguro.</p>
            <p className="mt-1 text-gray-300">Desenvolvido por <span className="text-indigo-400/80 font-bold tracking-tighter uppercase">MSCHelp</span></p>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              Modo Privado
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-magic text-amber-400"></i>
              Insights Gemini 3
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
