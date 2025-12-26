
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Note, NoteColor, Language } from './types';
import { storageService } from './services/dbService';
import { NoteCard } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { Button } from './components/Button';
import { geminiService } from './services/geminiService';

// Map de Traduções
const translations = {
  [Language.PT]: {
    appTitle: "Caderno de",
    appSubtitle: "INSIGHTS",
    searchPlaceholder: "Pesquisar insights ou tarefas...",
    newNote: "NOVA NOTA",
    timeline: "Linha do Tempo",
    viewAll: "Ver Tudo",
    todayInsight: "Dica de hoje",
    noNotes: "Nada por aqui",
    noNotesDesc: "Sua galeria está vazia.",
    startWriting: "Começar a Escrever",
    settings: "Configurações",
    language: "Idioma",
    security: "Segurança e Dados",
    export: "EXPORTAR NOTAS",
    import: "RESTAURAR NOTAS",
    allInsights: "Todos os Insights",
    planningToday: "Planejamento Hoje",
    home: "Início",
    today: "Hoje",
    backup: "Backup",
    save: "SALVAR",
    cancel: "CANCELAR",
    close: "Fechar",
    loading: "Carregando...",
    deleteConfirm: "Deseja realmente excluir?",
    importSuccess: "Notas restauradas com sucesso!"
  },
  [Language.EN]: {
    appTitle: "Insight",
    appSubtitle: "NOTEBOOK",
    searchPlaceholder: "Search insights or tasks...",
    newNote: "NEW NOTE",
    timeline: "Timeline",
    viewAll: "View All",
    todayInsight: "Today's Insight",
    noNotes: "Nothing here",
    noNotesDesc: "Your gallery is empty.",
    startWriting: "Start Writing",
    settings: "Settings",
    language: "Language",
    security: "Security & Data",
    export: "EXPORT NOTES",
    import: "RESTORE NOTES",
    allInsights: "All Insights",
    planningToday: "Today's Planning",
    home: "Home",
    today: "Today",
    backup: "Backup",
    save: "SAVE",
    cancel: "CANCEL",
    close: "Close",
    loading: "Loading...",
    deleteConfirm: "Are you sure you want to delete?",
    importSuccess: "Notes restored successfully!"
  }
};

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyInsight, setDailyInsight] = useState("");
  const [filterColor, setFilterColor] = useState<NoteColor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(Language.PT);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

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
    // Carregar idioma salvo
    const storage = storageService.getStorage();
    if (storage.language) setLanguage(storage.language);
    
    loadNotes();
    geminiService.getDailyInsight(storage.language || Language.PT).then(setDailyInsight);
  }, [loadNotes]);

  const toggleLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const storage = storageService.getStorage();
    storageService.saveStorage({ ...storage, language: newLang });
    geminiService.getDailyInsight(newLang).then(setDailyInsight);
  };

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (filterColor) result = result.filter(n => n.color === filterColor);
    if (selectedDate) result = result.filter(n => n.date === selectedDate);
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
    if (confirm(t.deleteConfirm)) {
      storageService.deleteNote(id);
      loadNotes();
    }
  };

  const handleExport = () => storageService.exportBackup();
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await storageService.importBackup(file);
      if (success) {
        alert(t.importSuccess);
        loadNotes();
        setIsSettingsOpen(false);
      }
    }
    e.target.value = '';
  };

  const timelineDates = useMemo(() => {
    const dates = [];
    for (let i = -2; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        full: d.toISOString().split('T')[0],
        day: d.toLocaleDateString(language, { day: '2-digit' }),
        weekday: d.toLocaleDateString(language, { weekday: 'short' }).replace('.', ''),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      });
    }
    return dates;
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent pb-24 md:pb-0">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white/60 backdrop-blur-xl border-r p-6 flex-col gap-6 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center cursor-pointer transition-transform active:scale-95" onClick={triggerLogoSpin}>
              <img src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" alt="Logo" className={`w-10 h-10 object-contain ${isLogoSpinning ? 'animate-spin-once' : ''}`} />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight uppercase">{t.appTitle}</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">{t.appSubtitle}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all"
          >
            <i className="fas fa-gear"></i>
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          <button 
            onClick={() => { setFilterColor(null); setSelectedDate(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-semibold text-sm ${(!filterColor && !selectedDate) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <i className="fas fa-layer-group"></i> {t.allInsights}
          </button>
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-semibold text-sm ${selectedDate === new Date().toISOString().split('T')[0] ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <i className="fas fa-calendar-day"></i> {t.planningToday}
          </button>
        </nav>

        <div>
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-3">Filter by Color</p>
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

        <div className="mt-auto p-4 bg-indigo-600 rounded-2xl text-white shadow-xl">
           <p className="text-[10px] font-bold opacity-80 uppercase mb-2">Insight AI</p>
           <p className="text-xs font-medium leading-relaxed italic">"{dailyInsight || t.loading}"</p>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 md:py-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b">
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <div className="flex items-center gap-2" onClick={triggerLogoSpin}>
              <img src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" className="w-8 h-8 object-contain" alt="Logo" />
              <span className="font-black text-gray-900 text-sm tracking-tight uppercase">{t.appSubtitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSearchActive(!isSearchActive)} className="p-2 text-gray-500">
                <i className={`fas ${isSearchActive ? 'fa-times' : 'fa-search'}`}></i>
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500">
                <i className="fas fa-gear"></i>
              </button>
            </div>
          </div>

          <div className={`flex-1 max-w-2xl w-full relative group ${!isSearchActive && 'hidden md:block'}`}>
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-indigo-500 transition-all outline-none text-sm font-medium"
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="primary" className="rounded-2xl shadow-xl px-8 font-black text-sm h-12 uppercase" onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }}>
              <i className="fas fa-plus mr-3 text-xs"></i> {t.newNote}
            </Button>
          </div>
        </header>

        <div className="px-6 md:px-10 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t.timeline}</h2>
            <button onClick={() => setSelectedDate(null)} className={`text-[10px] font-bold uppercase ${!selectedDate ? 'text-indigo-600' : 'text-gray-400'}`}>
              {t.viewAll}
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
          </div>
        </div>

        <div className="md:hidden px-6 mt-2">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{t.todayInsight}</p>
            <p className="text-xs text-indigo-900 leading-tight italic">"{dailyInsight || t.loading}"</p>
          </div>
        </div>

        <main className="flex-1 px-6 md:px-10 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
              <p className="font-bold uppercase tracking-widest">{t.loading}</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 animate-in fade-in duration-700">
              {filteredNotes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  language={language}
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
                <h3 className="text-lg font-black text-gray-800 mb-1">{t.noNotes}</h3>
                <p className="text-gray-400 text-xs font-medium">{t.noNotesDesc}</p>
                <Button variant="ghost" className="mt-4 text-xs font-bold text-indigo-600 uppercase" onClick={() => setIsFormOpen(true)}>
                  {t.startWriting}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white/90 glass-panel w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <i className="fas fa-gear text-lg"></i>
                  </div>
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">{t.settings}</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-8">
                {/* Language Section */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t.language}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => toggleLanguage(Language.PT)}
                      className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-bold ${language === Language.PT ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-indigo-200'}`}
                    >
                      <img src="https://flagcdn.com/w40/br.png" className="w-6 h-4 object-cover rounded-sm" alt="PT" />
                      Português
                    </button>
                    <button 
                      onClick={() => toggleLanguage(Language.EN)}
                      className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-bold ${language === Language.EN ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-indigo-200'}`}
                    >
                      <img src="https://flagcdn.com/w40/us.png" className="w-6 h-4 object-cover rounded-sm" alt="EN" />
                      English
                    </button>
                  </div>
                </div>

                {/* Security Section */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t.security}</label>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleExport}
                      className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-export text-indigo-600 text-lg"></i>
                        <span className="font-bold text-gray-700 text-sm">{t.export}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                    
                    <button 
                      onClick={handleImportClick}
                      className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-import text-indigo-600 text-lg"></i>
                        <span className="font-bold text-gray-700 text-sm">{t.import}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
                <Button variant="ghost" className="text-indigo-600 font-black tracking-widest text-xs uppercase" onClick={() => setIsSettingsOpen(false)}>
                  {t.close}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <NoteForm 
          note={editingNote} 
          language={language}
          onSave={handleSaveNote} 
          onCancel={() => { setIsFormOpen(false); setEditingNote(undefined); }} 
        />
      )}

      {/* Mobile Fab */}
      <button onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }} className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl z-40 flex items-center justify-center active:scale-90 transition-transform">
        <i className="fas fa-plus text-xl"></i>
      </button>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t px-6 py-3 flex items-center justify-around z-50">
        <button onClick={() => { setSelectedDate(null); setFilterColor(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`flex flex-col items-center gap-1 ${(!selectedDate && !filterColor) ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fas fa-home text-lg"></i>
          <span className="text-[10px] font-bold">{t.home}</span>
        </button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className={`flex flex-col items-center gap-1 ${selectedDate === new Date().toISOString().split('T')[0] ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fas fa-calendar-check text-lg"></i>
          <span className="text-[10px] font-bold">{t.today}</span>
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className={`flex flex-col items-center gap-1 ${isSettingsOpen ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fas fa-gear text-lg"></i>
          <span className="text-[10px] font-bold tracking-tight">{t.settings}</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
