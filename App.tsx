
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';

// @google/genai guidelines: Extend the Window interface correctly within declare global.
// We define AIStudio and extend Window without conflicting modifiers to match the environment.
declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }
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
  const [needsKey, setNeedsKey] = useState(false);
  
  // Ref para rastrear se o usuário já tentou selecionar uma chave nesta sessão
  const hasAttemptedSelection = useRef(false);

  const checkApiKey = useCallback(async () => {
    // 1. Verifica se já forçamos a entrada nesta sessão
    if (hasAttemptedSelection.current) {
      setNeedsKey(false);
      return;
    }

    // 2. Verifica se a chave está presente no ambiente de forma direta
    const envKey = process.env.API_KEY;
    if (envKey && envKey !== 'undefined' && envKey.length > 5) {
      setNeedsKey(false);
      return;
    }

    // 3. Verifica através da ferramenta do AI Studio se disponível
    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        // Se a ferramenta diz que tem, ou se o process.env já tem algo, liberamos
        if (hasKey) {
          setNeedsKey(false);
          return;
        }
      } catch (e) {
        console.warn("Aviso: Falha ao checar chave via AI Studio, aguardando interação.");
      }
    }

    // Se chegamos aqui e não temos chave detectada, mostramos a tela de setup
    setNeedsKey(true);
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleKeyError = useCallback(() => {
    // Se um erro de chave ocorrer durante o uso, voltamos para a tela de setup
    hasAttemptedSelection.current = false;
    setNeedsKey(true);
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // @google/genai guidelines: Assume sucesso imediato após disparar o seletor
        // para evitar condições de corrida onde a chave demora a ser injetada.
        hasAttemptedSelection.current = true;
        setNeedsKey(false);
      } catch (err) {
        console.error("Erro ao abrir seletor de chave:", err);
      }
    } else {
      // Fallback para ambientes onde o aistudio provider não está presente
      alert("Ambiente de configuração não detectado. Se você já configurou a variável API_KEY, tente recarregar a página.");
      setNeedsKey(false);
      hasAttemptedSelection.current = true;
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
    if (confirm('Deseja excluir esta nota permanentemente?')) {
      storageService.deleteNote(id);
      loadNotes();
    }
  };

  if (needsKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 border border-gray-100">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-indigo-50/50">
            <i className="fas fa-key text-3xl text-indigo-600"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Configurar Acesso</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Para usar as funções de Inteligência Artificial (melhorar texto e leitura), 
              é necessário vincular sua <strong>API Key</strong> do Google Gemini.
            </p>
            <p className="text-xs text-indigo-600 font-semibold bg-indigo-50 py-2 rounded-lg mt-4">
              <i className="fas fa-info-circle mr-1"></i> Dica: O Nível Gratuito é suportado!
            </p>
          </div>
          <div className="space-y-4">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95" 
              onClick={handleSelectKey}
            >
              Configurar Chave Agora
            </Button>
            <div className="pt-2">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-gray-400 hover:text-indigo-500 transition-colors uppercase font-bold tracking-widest"
              >
                Documentação de Faturamento <i className="fas fa-external-link-alt ml-1 text-[8px]"></i>
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
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => loadNotes()}>
            <img 
              src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain transition-transform duration-500 hover:rotate-12"
            />
            <div className="border-l pl-4 border-gray-200 text-left">
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
                onEdit={(n) => { setEditingNote(n); setIsFormOpen(true); }} 
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
                Suas ideias brilham mais quando registradas. Clique em "Nova Nota" para começar.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white/40 border-t py-6 px-6 text-gray-400 text-[10px] font-medium uppercase tracking-widest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2025 Caderno de Ideias • MSCHelp Engineering</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <i className="fas fa-microchip"></i> Gemini 3 Flash
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-shield-halved"></i> Armazenamento Local
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
