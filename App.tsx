
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Note, NoteColor } from './types.ts';
import { storageService } from './services/dbService.ts';
import { NoteCard } from './components/NoteCard.tsx';
import { NoteForm } from './components/NoteForm.tsx';
import { Button } from './components/Button.tsx';
import { geminiService } from './services/geminiService.ts';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyInsight, setDailyInsight] = useState("Sua produtividade começa aqui.");
  const [filterColor, setFilterColor] = useState<NoteColor | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);

  const triggerLogoSpin = () => {
    setIsLogoSpinning(true);
    setTimeout(() => setIsLogoSpinning(false), 1000);
  };

  const loadNotes = useCallback(() => {
    const fetched = storageService.searchNotes(searchQuery);
    setNotes(fetched);
    setIsLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    loadNotes();
    geminiService.getDailyInsight().then(setDailyInsight);
  }, [loadNotes]);

  const filteredNotes = useMemo(() => {
    if (!filterColor) return notes;
    return notes.filter(n => n.color === filterColor);
  }, [notes, filterColor]);

  const handleSaveNote = (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      storageService.updateNote(editingNote.id, data);
    } else {
      storageService.createNote(data);
      triggerLogoSpin();
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent pb-24 md:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white/60 backdrop-blur-xl border-r p-6 flex-col gap-8 z-20">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            onClick={triggerLogoSpin}
          >
            <img 
              src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
              alt="Logo" 
              className={`w-10 h-10 object-contain ${isLogoSpinning ? 'animate-spin-once' : ''}`}
            />
          </div>
          <div onClick={triggerLogoSpin} className="cursor-pointer select-none">
            <h1 className="text-sm font-black text-gray-900 leading-tight uppercase tracking-tight">Caderno de</h1>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">INSIGHTS</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 px-3">Navegação</p>
          <button 
            onClick={() => setFilterColor(null)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${!filterColor ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <i className="fas fa-layer-group"></i> Todas as Notas
            <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{notes.length}</span>
          </button>
        </nav>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-3">Filtrar por Cor</p>
          <div className="grid grid-cols-4 gap-3 px-3">
            {Object.values(NoteColor).map(color => (
              <button
                key={color}
                onClick={() => setFilterColor(filterColor === color ? null : color)}
                className={`w-8 h-8 rounded-full shadow-sm transition-transform active:scale-90 border-2 ${color} ${filterColor === color ? 'border-indigo-600 scale-110 shadow-indigo-100' : 'border-transparent hover:scale-110'}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
            <p className="text-[10px] font-bold opacity-80 uppercase mb-2">Insight da IA</p>
            <p className="text-xs font-medium leading-relaxed italic">"{dailyInsight}"</p>
          </div>
          
          <div className="px-3 py-2 bg-gray-100/50 rounded-xl border border-dashed border-gray-300">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <i className="fas fa-database text-[10px]"></i>
              <span className="text-[9px] font-bold uppercase tracking-wider">Armazenamento Local</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-tight">
              Suas notas são salvas apenas neste navegador. Limpar os dados do site apagará suas anotações.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 md:py-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b md:border-none">
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={triggerLogoSpin}>
              <img 
                src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
                className={`w-8 h-8 object-contain ${isLogoSpinning ? 'animate-spin-once' : ''}`} 
                alt="Logo" 
              />
              <span className="font-black text-gray-900 text-sm tracking-tight">Caderno de Insights</span>
            </div>
            <button onClick={() => setIsSearchActive(!isSearchActive)} className="p-2 text-gray-500">
              <i className={`fas ${isSearchActive ? 'fa-times' : 'fa-search'}`}></i>
            </button>
          </div>

          <div className={`flex-1 max-w-2xl w-full relative group ${!isSearchActive && 'hidden md:block'}`}>
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"></i>
            <input 
              type="text"
              placeholder="Pesquisar nos seus insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="primary" 
              className="rounded-2xl shadow-indigo-200 shadow-xl px-8 font-black text-sm h-12"
              onClick={() => {
                setEditingNote(undefined);
                setIsFormOpen(true);
              }}
            >
              <i className="fas fa-plus mr-3 text-xs"></i> NOVA NOTA
            </Button>
          </div>
        </header>

        <div className="md:hidden px-6 mt-2">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Dica de hoje</p>
            <p className="text-xs text-indigo-900 leading-tight italic">"{dailyInsight}"</p>
          </div>
        </div>

        <main className="flex-1 px-6 md:px-10 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-400"></i>
              <p className="font-bold tracking-tighter uppercase">Carregando Notas...</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {filteredNotes.map(note => (
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
            <div className="h-[60vh] flex items-center justify-center">
              <div className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] text-center max-w-sm shadow-2xl relative">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto mb-6">
                  <i className="fas fa-feather-pointed text-2xl md:text-4xl"></i>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-2 tracking-tight">O papel está em branco</h3>
                <p className="text-gray-500 text-xs md:text-sm font-medium leading-relaxed mb-6">
                  Suas ideias são privadas e armazenadas localmente no seu dispositivo.
                </p>
                <Button variant="primary" className="rounded-2xl px-8" onClick={() => setIsFormOpen(true)}>
                  Escrever Agora
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <button 
        onClick={() => {
          setEditingNote(undefined);
          setIsFormOpen(true);
        }}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 z-40 flex items-center justify-center active:scale-90 transition-transform"
      >
        <i className="fas fa-plus text-xl"></i>
      </button>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t px-6 py-3 flex items-center justify-around z-50">
        <button 
          onClick={() => { setFilterColor(null); window.scrollTo({top: 0, behavior: 'smooth'}); }}
          className={`flex flex-col items-center gap-1 ${!filterColor ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <i className="fas fa-home text-lg"></i>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        
        <div className="flex gap-4">
          {Object.values(NoteColor).slice(0, 4).map(color => (
            <button
              key={color}
              onClick={() => setFilterColor(filterColor === color ? null : color)}
              className={`w-6 h-6 rounded-full border-2 ${color} ${filterColor === color ? 'border-indigo-600' : 'border-transparent'}`}
            />
          ))}
        </div>

        <button 
          onClick={() => setIsSearchActive(!isSearchActive)}
          className={`flex flex-col items-center gap-1 ${isSearchActive ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <i className="fas fa-search text-lg"></i>
          <span className="text-[10px] font-bold">Busca</span>
        </button>
      </nav>

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
