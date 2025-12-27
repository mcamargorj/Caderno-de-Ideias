
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Note, NoteColor, Language, User } from './types';
import { storageService } from './services/dbService';
import { NoteCard } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { Button } from './components/Button';
import { geminiService } from './services/geminiService';

const translations = {
  [Language.PT]: {
    appTitle: "Caderno de",
    appSubtitle: "INSIGHTS",
    searchPlaceholder: "Pesquisar insights...",
    newNote: "NOVA NOTA",
    timeline: "Linha do Tempo",
    viewAll: "Ver Tudo",
    todayInsight: "Insight do Dia",
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
    importSuccess: "Notas restauradas com sucesso!",
    filterByColor: "Filtrar por Cor",
    clearFilter: "Limpar Filtro",
    connectGoogle: "CONECTAR COM GOOGLE",
    signOut: "Sair da Conta",
    syncStatus: "Sincronizado",
    migrating: "Sincronizando...",
    loginError: "Erro de autenticação"
  },
  [Language.EN]: {
    appTitle: "Insight",
    appSubtitle: "NOTEBOOK",
    searchPlaceholder: "Search insights...",
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
    importSuccess: "Notes restored successfully!",
    filterByColor: "Filter by Color",
    clearFilter: "Clear Filter",
    connectGoogle: "CONNECT WITH GOOGLE",
    signOut: "Sign Out",
    syncStatus: "Synced",
    migrating: "Syncing...",
    loginError: "Authentication error"
  }
};

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [dailyInsight, setDailyInsight] = useState("");
  const [filterColor, setFilterColor] = useState<NoteColor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(Language.PT);
  const [user, setUser] = useState<User | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const notifiedNotesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  const triggerLogoSpin = () => {
    if (isLogoSpinning) return;
    setIsLogoSpinning(true);
    setTimeout(() => setIsLogoSpinning(false), 1000);
  };

  const loadNotes = useCallback(() => {
    if (user) {
      setIsSyncing(true);
      return storageService.syncWithCloud(user.uid, (cloudNotes) => {
        setNotes(cloudNotes);
        setIsLoading(false);
        setIsSyncing(false);
      });
    } else {
      const fetched = storageService.getStorage().notes;
      setNotes(fetched);
      setIsLoading(false);
      return () => {};
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDescription = params.get('error_description');
      const errorCode = params.get('error');
      if (errorDescription || errorCode) {
        setLoginError(`${t.loginError}: ${errorDescription?.replace(/\+/g, ' ') || errorCode}`);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    const storage = storageService.getStorage();
    if (storage.language) setLanguage(storage.language);
    
    const unsubscribeAuth = storageService.onAuthStateChanged((loggedUser) => {
      setUser(loggedUser);
      setIsLoggingIn(false);
      if (loggedUser) {
        setLoginError(null);
        const localNotes = storageService.getStorage().notes;
        if (localNotes.length > 0) {
          setIsSyncing(true);
          storageService.migrateToCloud(loggedUser.uid).then(() => setIsSyncing(false));
        }
      }
    });

    geminiService.getDailyInsight(storage.language || Language.PT).then(setDailyInsight);
    
    return () => { if (unsubscribeAuth) unsubscribeAuth(); };
  }, [language, t.loginError]);

  useEffect(() => {
    const unsubscribe = loadNotes();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [loadNotes]);

  useEffect(() => {
    const checkReminders = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      
      const now = new Date();
      const nowDate = now.toISOString().split('T')[0];
      const nowTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      notes.forEach(note => {
        if (note.date === nowDate && note.time === nowTime && !notifiedNotesRef.current.has(note.id)) {
          if (Notification.permission === 'granted') {
            new Notification(`Lembrete: ${note.title || 'Insight'}`, {
              body: note.content.substring(0, 100),
              icon: 'https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png'
            });
            notifiedNotesRef.current.add(note.id);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [notes]);

  const toggleLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const storage = storageService.getStorage();
    storageService.saveStorage({ ...storage, language: newLang });
    geminiService.getDailyInsight(newLang).then(setDailyInsight);
  };

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    const { error } = await storageService.signInWithGoogle();
    if (error) {
      console.error("Erro no login:", error);
      setLoginError(`${t.loginError}: ${error.message || 'OAuth failure'}`);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await storageService.signOut();
    setUser(null);
  };

  const filteredNotes = useMemo(() => {
    let result = storageService.searchNotes(notes, searchQuery);
    if (filterColor) result = result.filter(n => n.color === filterColor);
    if (selectedDate) result = result.filter(n => n.date === selectedDate);
    return result;
  }, [notes, searchQuery, filterColor, selectedDate]);

  const handleSaveNote = async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      await storageService.updateNote(editingNote.id, data, user?.uid);
      if (!user) {
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...data, updatedAt: Date.now() } : n));
      }
    } else {
      const newNote = await storageService.createNote(data, user?.uid);
      if (!user) {
        setNotes(prev => [newNote, ...prev]);
      }
      triggerLogoSpin();
    }
    setEditingNote(undefined);
    setIsFormOpen(false);
  };

  const handleUpdateNoteField = (id: string, updates: Partial<Note>) => {
    storageService.updateNote(id, updates, user?.uid);
    if (!user) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
    }
  };

  const handleDeleteNote = (id: string) => {
    if (confirm(t.deleteConfirm)) {
      storageService.deleteNote(id, user?.uid);
      if (!user) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await storageService.importBackup(file);
      if (success) {
        alert(t.importSuccess);
        loadNotes();
      }
    }
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
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white/60 backdrop-blur-xl border-r p-6 flex-col gap-6 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 flex items-center justify-center cursor-pointer transition-transform active:scale-90" 
              onClick={triggerLogoSpin}
              onMouseEnter={triggerLogoSpin}
            >
              <img 
                src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
                alt="Logo" 
                className={`w-14 h-14 object-contain transition-all drop-shadow-sm ${isLogoSpinning ? 'animate-spin-once' : ''}`} 
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight uppercase">{t.appTitle}</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">{t.appSubtitle}</p>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all">
            <i className="fas fa-gear"></i>
          </button>
        </div>

        {/* Perfil do Usuário */}
        <div className="px-1">
          {user ? (
            <div className="flex items-center gap-3 p-3 bg-white/50 border border-indigo-100 rounded-2xl shadow-sm">
              <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-800 truncate uppercase leading-none">{user.displayName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <i className="fas fa-bolt text-indigo-500 text-[8px]"></i>
                  <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">{t.syncStatus}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="secondary" className="w-full h-12 rounded-2xl text-[10px] font-black shadow-sm" onClick={handleLogin} isLoading={isLoggingIn}>
                <i className="fab fa-google mr-2 text-indigo-500"></i> {t.connectGoogle}
              </Button>
              {loginError && <p className="text-[9px] text-red-500 font-bold uppercase text-center px-2 animate-pulse">{loginError}</p>}
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1.5">
          <button onClick={() => { setFilterColor(null); setSelectedDate(null); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all font-black text-xs uppercase ${(!filterColor && !selectedDate) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
            <i className="fas fa-layer-group"></i> {t.allInsights}
          </button>
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all font-black text-xs uppercase ${selectedDate === new Date().toISOString().split('T')[0] ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
            <i className="fas fa-calendar-day"></i> {t.planningToday}
          </button>
        </nav>

        <div className="mt-4">
           <div className="flex justify-between items-center px-3 mb-4">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.filterByColor}</p>
             {filterColor && (
               <button onClick={() => setFilterColor(null)} className="text-indigo-500 hover:text-indigo-700 transition-all">
                 <i className="fas fa-filter-circle-xmark text-sm"></i>
               </button>
             )}
           </div>
           <div className="grid grid-cols-4 gap-3 px-3">
            {Object.values(NoteColor).map(color => (
              <button key={color} onClick={() => setFilterColor(filterColor === color ? null : color)} className={`w-8 h-8 rounded-full shadow-sm transition-all active:scale-90 border-2 flex items-center justify-center ${color} ${filterColor === color ? 'border-indigo-600 scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}>
                {filterColor === color && <i className={`fas fa-check text-[10px] ${['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 'bg-purple-200', 'bg-orange-200', 'theme-zen', 'theme-paper'].includes(color) ? 'text-indigo-600' : 'text-white'}`}></i>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-indigo-100">
           <div className="flex items-center gap-2 mb-3">
             <i className="fas fa-sparkles text-indigo-200 text-xs"></i>
             <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Insight AI</p>
           </div>
           <p className="text-xs font-bold leading-relaxed italic">"{dailyInsight || t.loading}"</p>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 md:py-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b">
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <div 
              className="flex items-center gap-3 cursor-pointer active:scale-95" 
              onClick={triggerLogoSpin}
              onMouseEnter={triggerLogoSpin}
            >
              <img 
                src="https://portalmschelp.pythonanywhere.com/static/images/site/img/logo.png" 
                className={`w-11 h-11 object-contain transition-all ${isLogoSpinning ? 'animate-spin-once' : ''}`} 
                alt="Logo" 
              />
              <span className="font-black text-gray-900 text-sm tracking-tight uppercase">{t.appSubtitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSearchActive(!isSearchActive)} className="p-2 text-gray-500">
                <i className={`fas ${isSearchActive ? 'fa-times' : 'fa-search'}`}></i>
              </button>
              {user && <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-indigo-200" onClick={() => setIsSettingsOpen(true)} />}
              {!user && <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500"><i className="fas fa-gear"></i></button>}
            </div>
          </div>

          <div className={`flex-1 max-w-3xl w-full relative group ${!isSearchActive && 'hidden md:block'}`}>
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-sm font-semibold" />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="primary" className="rounded-[1.5rem] shadow-xl px-10 font-black text-sm h-14 uppercase tracking-wider" onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }}>
              <i className="fas fa-plus mr-3 text-xs"></i> {t.newNote}
            </Button>
          </div>
        </header>

        {/* STATUS DE SINCRONIZAÇÃO */}
        {isSyncing && (
          <div className="px-10 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase flex items-center gap-2 animate-pulse">
            <i className="fas fa-sync fa-spin"></i> {t.migrating}
          </div>
        )}

        {/* TIMELINE E FILTROS MOBILE */}
        <div className="px-6 md:px-10 pt-6 flex flex-col gap-6">
          <div className="md:hidden p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
             <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-sparkles text-[10px] text-indigo-200"></i>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{t.todayInsight}</p>
             </div>
             <p className="text-xs font-bold leading-relaxed italic">"{dailyInsight || t.loading}"</p>
          </div>

          {/* Timeline Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{t.timeline}</h2>
              <button onClick={() => setSelectedDate(null)} className={`text-[10px] font-black uppercase transition-colors ${!selectedDate ? 'text-indigo-600' : 'text-gray-400'}`}>
                {t.viewAll}
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-1 px-1">
              {timelineDates.map(date => (
                <button key={date.full} onClick={() => setSelectedDate(selectedDate === date.full ? null : date.full)} className={`flex-shrink-0 w-16 h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-2 ${selectedDate === date.full ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}>
                  <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">{date.weekday}</span>
                  <span className="text-lg font-black">{date.day}</span>
                  {date.isToday && <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === date.full ? 'bg-white' : 'bg-indigo-500'}`}></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter Section Mobile */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.filterByColor}</h2>
              {filterColor && (
                <button onClick={() => setFilterColor(null)} className="text-indigo-600 hover:text-indigo-800 transition-all p-1">
                   <i className="fas fa-filter-circle-xmark text-lg"></i>
                </button>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide no-scrollbar -mx-1 px-1">
              {Object.values(NoteColor).map(color => (
                <button 
                  key={color} 
                  onClick={() => setFilterColor(filterColor === color ? null : color)} 
                  className={`flex-shrink-0 w-10 h-10 rounded-full shadow-sm transition-all active:scale-90 border-2 flex items-center justify-center ${color} ${filterColor === color ? 'border-indigo-600 scale-110 shadow-lg' : 'border-transparent'}`}
                >
                  {filterColor === color && <i className={`fas fa-check text-[10px] ${['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 'bg-purple-200', 'bg-orange-200', 'theme-zen', 'theme-paper'].includes(color) ? 'text-indigo-600' : 'text-white'}`}></i>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1 px-6 md:px-10 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <i className="fas fa-circle-notch fa-spin text-5xl mb-6 text-indigo-400"></i>
              <p className="font-black uppercase tracking-widest text-xs">{t.loading}</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10 animate-in fade-in duration-1000">
              {filteredNotes.map(note => (
                <NoteCard key={note.id} note={note} language={language} onEdit={(n) => { setEditingNote(n); setIsFormOpen(true); }} onDelete={handleDeleteNote} onUpdate={handleUpdateNoteField} />
              ))}
            </div>
          ) : (
            <div className="h-[40vh] flex items-center justify-center">
              <div className="text-center max-w-sm animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-6">
                  <i className="fas fa-calendar-xmark text-3xl"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">{t.noNotes}</h3>
                <p className="text-gray-400 text-sm font-semibold">{t.noNotesDesc}</p>
                <Button variant="ghost" className="mt-6 text-sm font-black text-indigo-600 uppercase tracking-widest" onClick={() => setIsFormOpen(true)}>
                  {t.startWriting}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL CONFIGURAÇÕES */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 glass-panel w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <i className="fas fa-gear text-2xl"></i>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t.settings}</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <div className="space-y-10">
                {/* Seção Cloud */}
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">Sincronização Cloud</label>
                  {!user ? (
                    <div className="space-y-3">
                      <Button variant="secondary" className="w-full h-16 rounded-3xl text-sm font-black border-2 border-indigo-100 hover:border-indigo-300 shadow-sm" onClick={handleLogin} isLoading={isLoggingIn}>
                        <i className="fab fa-google mr-3 text-indigo-500 text-xl"></i> {t.connectGoogle}
                      </Button>
                      {loginError && <p className="text-[10px] text-red-500 font-bold uppercase text-center mt-3 p-3 bg-red-50 rounded-xl border border-red-100">{loginError}</p>}
                    </div>
                  ) : (
                    <div className="p-5 bg-indigo-50/50 border-2 border-indigo-100 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={user.photoURL || ''} className="w-12 h-12 rounded-2xl border-2 border-indigo-500" />
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase leading-none">{user.displayName}</p>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">{t.syncStatus}</p>
                        </div>
                      </div>
                      <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-3 transition-colors">
                        <i className="fas fa-power-off"></i>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">{t.language}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => toggleLanguage(Language.PT)} className={`flex items-center justify-center gap-4 py-5 rounded-3xl border-2 transition-all font-black text-sm uppercase ${language === Language.PT ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-100 text-gray-500 hover:border-indigo-200'}`}>
                      <img src="https://flagcdn.com/w40/br.png" className="w-7 h-5 object-cover rounded shadow-sm" alt="PT" /> Português
                    </button>
                    <button onClick={() => toggleLanguage(Language.EN)} className={`flex items-center justify-center gap-4 py-5 rounded-3xl border-2 transition-all font-black text-sm uppercase ${language === Language.EN ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-100 text-gray-500 hover:border-indigo-200'}`}>
                      <img src="https://flagcdn.com/w40/us.png" className="w-7 h-5 object-cover rounded shadow-sm" alt="EN" /> English
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">{t.security}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => storageService.exportBackup()} className="flex items-center justify-between px-6 py-5 bg-gray-50 hover:bg-indigo-50 rounded-3xl transition-all group border-2 border-transparent hover:border-indigo-100">
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-export text-indigo-600 text-lg"></i>
                        <span className="font-black text-gray-700 text-[10px] uppercase tracking-wider">{t.export}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                    <button onClick={handleImportClick} className="flex items-center justify-between px-6 py-5 bg-gray-50 hover:bg-emerald-50 rounded-3xl transition-all group border-2 border-transparent hover:border-emerald-100">
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-import text-emerald-600 text-lg"></i>
                        <span className="font-black text-gray-700 text-[10px] uppercase tracking-wider">{t.import}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-emerald-400 transition-colors"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
                <Button variant="ghost" className="text-indigo-600 font-black tracking-[0.2em] text-xs uppercase hover:bg-indigo-50" onClick={() => setIsSettingsOpen(false)}>
                  {t.close}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE NOTA */}
      {isFormOpen && (
        <NoteForm note={editingNote} language={language} onSave={handleSaveNote} onCancel={() => { setIsFormOpen(false); setEditingNote(undefined); }} />
      )}

      {/* BOTÃO FLUTUANTE MOBILE */}
      <button onClick={() => { setEditingNote(undefined); setIsFormOpen(true); }} className="md:hidden fixed bottom-28 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl z-40 flex items-center justify-center active:scale-90 transition-transform">
        <i className="fas fa-plus text-2xl"></i>
      </button>

      {/* TAB BAR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t px-8 py-4 flex items-center justify-around z-50 shadow-2xl">
        <button onClick={() => { setSelectedDate(null); setFilterColor(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`flex flex-col items-center gap-1.5 ${(!selectedDate && !filterColor) ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-home text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">{t.home}</span>
        </button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className={`flex flex-col items-center gap-1.5 ${selectedDate === new Date().toISOString().split('T')[0] ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-calendar-check text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">{t.today}</span>
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className={`flex flex-col items-center gap-1.5 ${isSettingsOpen ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-gear text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">{t.settings}</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
