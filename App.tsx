
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    let result = notes;
    if (filterColor) {
      result = result.filter(n => n.color === filterColor);
    }
    if (selectedDate) {
      result = result.filter(n => n.date === selectedDate);
    }
    return result;
  }, [notes, filterColor, selectedDate]);

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

  const handleExport = () => {
    storageService.exportBackup();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await storageService.importBackup(file);
      if (success) {
        alert("Notas restauradas com sucesso!");
        loadNotes();
      } else {
        alert("Falha ao importar arquivo.");
      }
    }
    e.target.value = '';
  };

  // Gerador de datas para a Timeline (7 dias a partir de hoje)
  const timelineDates = useMemo(() => {
    const dates = [];
    for (let i = -2; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        full: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('pt-BR', { day: '2-digit' }),
        weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      });
    }
    return dates;
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent pb-24 md:pb-0">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white/60 backdrop-blur-xl border-r p-6 flex-col gap-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center cursor-pointer transition-transform active:scale-95" onClick={triggerLogoSpin}>
            <img src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" alt="Logo" className={`w-10 h-10 object-contain ${isLogoSpinning ? 'animate-spin-once' : ''}`} />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 leading-tight uppercase">Caderno de</h1>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">INSIGHTS</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-3">Modos de Visualização</p>
          <button 
            onClick={() => { setFilterColor(null); setSelectedDate(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-semibold text-sm ${(!filterColor && !selectedDate) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <i className="fas fa-layer-group"></i> Todos os Insights
          </button>
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-semibold text-sm ${selectedDate === new Date().toISOString().split('T')[0] ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <i className="fas fa-calendar-day"></i> Planejamento Hoje
          </button>
        </nav>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-3">Filtrar por Cor</p>
          <div className="grid grid-cols-4 gap-2 px-3">
            {Object.values(NoteColor).map(color => (
              <button
                key={color}
                onClick={() => setFilterColor(filterColor === color ? null : color)}
                className={`w-7 h-7 rounded-full shadow-sm transition-transform active:scale-90 border-2 ${color} ${filterColor === color ? 'border-indigo-600 scale-110 shadow-indigo-100' : 'border-transparent hover:scale-110'}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-3">Backup</p>
          <div className="flex flex-col gap-2 px-1">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-download text-indigo-500"></i> EXPORTAR
            </button>
            <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-upload text-indigo-500"></i> RESTAURAR
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          </div>
        </div>

        <div className="mt-auto p-4 bg-indigo-600 rounded-2xl text-white shadow-xl">
           <p className="text-[10px] font-bold opacity-80 uppercase mb-2">Insight da IA</p>
           <p className="text-xs font-medium leading-relaxed italic">"{dailyInsight}"</p>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 md:py-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b">
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <div className="flex items-center gap-2" onClick={triggerLogoSpin}>
              <img src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" className="w-8 h-8 object-contain" alt="Logo" />
              <span className="font-black text-gray-900 text-sm tracking-tight uppercase">Insights</span>
            </div>
            <button onClick={() => setIsSearchActive(!isSearchActive)} className="p-2 text-gray-500">
              <i className={`fas ${isSearchActive ? 'fa-times' : 'fa-search'}`}></i>
            </button>
          </div>

          <div className={`flex-1 max-w-2xl w-full relative group ${!isSearchActive && 'hidden md:block'}`}>
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar insights ou tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-indigo-500 transition-all outline-none text-sm font-medium"
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="primary" className="rounded-2xl shadow-xl px-8 font-black text-sm h-12" onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }}>
              <i className="fas fa-plus mr-3 text-xs"></i> NOVA NOTA
            </Button>
          </div>
        </header>

        {/* Timeline Horizontal - Componente de Calendário Moderno */}
        <div className="px-6 md:px-10 pt-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Linha do Tempo</h2>
            <button 
              onClick={() => setSelectedDate(null)}
              className={`text-[10px] font-bold uppercase ${!selectedDate ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}
            >
              Ver Tudo
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
            {timelineDates.map(date => (
              <button
                key={date.full}
                onClick={() => setSelectedDate(selectedDate === date.full ? null : date.full)}
                className={`flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
                  selectedDate === date.full 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">{date.weekday}</span>
                <span className="text-lg font-black">{date.day}</span>
                {date.isToday && <span className={`w-1 h-1 rounded-full ${selectedDate === date.full ? 'bg-white' : 'bg-indigo-500'}`}></span>}
              </button>
            ))}
            <div className="flex-shrink-0 w-14 h-20 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center text-gray-300">
               <i className="fas fa-ellipsis-h"></i>
            </div>
          </div>
        </div>

        {/* IA Insight Mobile */}
        <div className="md:hidden px-6 mt-2">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Dica de hoje</p>
            <p className="text-xs text-indigo-900 leading-tight italic">"{dailyInsight}"</p>
          </div>
        </div>

        <main className="flex-1 px-6 md:px-10 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
              <p className="font-bold uppercase">Carregando...</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 animate-in fade-in duration-700">
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
            <div className="h-[40vh] flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                  <i className="fas fa-calendar-xmark text-2xl"></i>
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-1">Nada por aqui</h3>
                <p className="text-gray-400 text-xs font-medium">
                  {selectedDate ? `Nenhum insight para o dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}.` : 'Sua galeria está vazia.'}
                </p>
                <Button variant="ghost" className="mt-4 text-xs font-bold text-indigo-600" onClick={() => setIsFormOpen(true)}>
                  Começar a Escrever
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <button onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }} className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl z-40 flex items-center justify-center active:scale-90 transition-transform">
        <i className="fas fa-plus text-xl"></i>
      </button>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t px-6 py-3 flex items-center justify-around z-50">
        <button onClick={() => { setSelectedDate(null); setFilterColor(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`flex flex-col items-center gap-1 ${(!selectedDate && !filterColor) ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fas fa-home text-lg"></i>
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className={`flex flex-col items-center gap-1 ${selectedDate === new Date().toISOString().split('T')[0] ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fas fa-calendar-check text-lg"></i>
          <span className="text-[10px] font-bold">Hoje</span>
        </button>
        <button onClick={handleExport} className="flex flex-col items-center gap-1 text-gray-400">
          <i className="fas fa-cloud-arrow-down text-lg"></i>
          <span className="text-[10px] font-bold">Backup</span>
        </button>
      </nav>

      {isFormOpen && (
        <NoteForm note={editingNote} onSave={handleSaveNote} onCancel={() => { setIsFormOpen(false); setEditingNote(undefined); }} />
      )}
    </div>
  );
};

export default App;
