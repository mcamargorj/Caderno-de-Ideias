
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
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'active' | 'trash'>('active');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Rest of state variables ...
  const [language, setLanguage] = useState<Language>(Language.PT);
  const [user, setUser] = useState<User | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGlobalDark, setIsGlobalDark] = useState(false);
  
  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      if (!note.deletedAt) {
        const matches = note.content.match(/#[\wÀ-ÿ]+/g);
        if (matches) matches.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [notes]);
  const notifiedNotesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(() => {
    try {
      const data = localStorage.getItem('notes_pinned_ids');
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  });

  const savePinnedLocal = (newSet: Set<string>) => {
    setPinnedNoteIds(newSet);
    localStorage.setItem('notes_pinned_ids', JSON.stringify(Array.from(newSet)));
  };

  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [touchActiveId, setTouchActiveId] = useState<string | null>(null);
  const isReorderingRef = useRef(false);

  const t = translations[language];

  // Helper para obter a data atual em formato YYYY-MM-DD local
  const getTodayISO = useCallback(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const triggerLogoSpin = () => {
    if (isLogoSpinning) return;
    setIsLogoSpinning(true);
    setTimeout(() => setIsLogoSpinning(false), 1000);
  };

  const loadNotes = useCallback(() => {
    if (user) {
      setIsSyncing(true);
      return storageService.syncWithCloud(user.uid, (cloudNotes) => {
        if (!isReorderingRef.current) {
          setNotes(cloudNotes);
        }
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
    
    const savedDark = localStorage.getItem('globalDarkMode') === 'true';
    setIsGlobalDark(savedDark);
    if (savedDark) document.documentElement.classList.add('dark');

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
      const nowDate = getTodayISO();
      const nowTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      notes.forEach(note => {
        if (note.date === nowDate && note.time === nowTime && !notifiedNotesRef.current.has(note.id)) {
          if (Notification.permission === 'granted') {
            new Notification(`Lembrete: ${note.title || 'Insight'}`, {
              body: note.content.substring(0, 100),
              icon: 'https://mathblox.mschelp.com.br/logo_mschelp.png'
            });
            notifiedNotesRef.current.add(note.id);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [notes, getTodayISO]);

  const toggleLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const storage = storageService.getStorage();
    storageService.saveStorage({ ...storage, language: newLang });
    geminiService.getDailyInsight(newLang).then(setDailyInsight);
  };

  const toggleDarkMode = () => {
    const newVal = !isGlobalDark;
    setIsGlobalDark(newVal);
    localStorage.setItem('globalDarkMode', String(newVal));
    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const notesWithPinned = useMemo(() => {
    return notes.map(note => ({
      ...note,
      pinned: pinnedNoteIds.has(note.id) || !!note.pinned
    }));
  }, [notes, pinnedNoteIds]);

  const filteredNotes = useMemo(() => {
    return notesWithPinned.filter(note => {
      if (currentView === 'trash') {
        if (!note.deletedAt) return false;
      } else {
        if (note.deletedAt) return false;
      }

      // Pinned notes are ALWAYS visible regardless of filters (except in trash)
      if (note.pinned && currentView === 'active' && !searchQuery && !filterColor && !selectedDate && !filterTag) return true;

      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesColor = !filterColor || note.color === filterColor;
      const matchesDate = !selectedDate || note.date === selectedDate;
      const matchesTag = !filterTag || (note.content.match(/#[\wÀ-ÿ]+/g) || ([] as string[])).includes(filterTag);

      return matchesSearch && matchesColor && matchesDate && matchesTag;
    });
  }, [notesWithPinned, searchQuery, filterColor, selectedDate, currentView, filterTag]);

  const handleSaveNote = async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...data, updatedAt: Date.now() } : n));
      await storageService.updateNote(editingNote.id, data, user?.uid);
    } else {
      const newNote = await storageService.createNote(data, user?.uid);
      setNotes(prev => [newNote, ...prev]);
      triggerLogoSpin();
    }
    setEditingNote(undefined);
    setIsFormOpen(false);
  };

  const handleUpdateNoteField = (id: string, updates: Partial<Note>) => {
    if ('pinned' in updates) {
      const newPinnedSet = new Set(pinnedNoteIds);
      if (updates.pinned) {
        newPinnedSet.add(id);
      } else {
        newPinnedSet.delete(id);
      }
      savePinnedLocal(newPinnedSet);
    }

    if ('deletedAt' in updates && updates.deletedAt === undefined) {
      setNotes(prev => prev.map(n => {
        if (n.id === id) {
          const { deletedAt, ...rest } = n;
          return { ...rest, ...updates, updatedAt: Date.now() } as Note;
        }
        return n;
      }));
      storageService.restoreNote(id, user?.uid);
      return;
    }

    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
    storageService.updateNote(id, updates, user?.uid);
  };

  // Reordenação por arraste confiável (Desktop e Mobile)
  const executeReorder = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      setDraggedNoteId(null);
      setDragOverNoteId(null);
      setTouchActiveId(null);
      return;
    }

    isReorderingRef.current = true;

    setNotes(prevNotes => {
      const sourceIndex = prevNotes.findIndex(n => n.id === sourceId);
      const targetIndex = prevNotes.findIndex(n => n.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prevNotes;

      const updated = [...prevNotes];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);

      // Timestamps estritamente decrescentes para que a ordenação 'updatedAt DESC' persista a ordem exata
      const baseTime = Date.now();
      const ordered = updated.map((note, index) => ({
        ...note,
        updatedAt: baseTime - index * 1000
      }));

      // Salva local e remotamente de forma atômica
      storageService.reorderNotes(ordered, user?.uid).finally(() => {
        setTimeout(() => {
          isReorderingRef.current = false;
        }, 1500);
      });

      return ordered;
    });

    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setTouchActiveId(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNoteId(id);
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, hoveredId: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedNoteId && draggedNoteId !== hoveredId && dragOverNoteId !== hoveredId) {
      setDragOverNoteId(hoveredId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverNoteId === id) {
      setDragOverNoteId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer?.getData('text/plain') || draggedNoteId;
    if (sourceId && targetId) {
      executeReorder(sourceId, targetId);
    } else {
      setDraggedNoteId(null);
      setDragOverNoteId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchActiveId(id);
    setDragOverNoteId(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchActiveId) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElement = element?.closest('.sticky-note');
    if (cardElement) {
      const hoveredId = cardElement.getAttribute('data-note-id');
      if (hoveredId && hoveredId !== touchActiveId) {
        setDragOverNoteId(hoveredId);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchActiveId && dragOverNoteId && touchActiveId !== dragOverNoteId) {
      executeReorder(touchActiveId, dragOverNoteId);
    } else {
      setTouchActiveId(null);
      setDragOverNoteId(null);
    }
  };

  const handleDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (note.deletedAt) {
      if (confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) {
        setNotes(prev => prev.filter(n => n.id !== id));
        storageService.hardDeleteNote(id, user?.uid);
      }
    } else {
      if (confirm(t.deleteConfirm)) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, deletedAt: Date.now() } : n));
        storageService.deleteNote(id, user?.uid);
      }
    }
  };

  const handleEmptyTrash = () => {
    if (confirm("Deseja esvaziar a lixeira permanentemente?")) {
      const trashedNotes = notes.filter(n => n.deletedAt);
      setNotes(prev => prev.filter(n => !n.deletedAt));
      trashedNotes.forEach(note => {
        storageService.hardDeleteNote(note.id, user?.uid);
      });
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
    const todayISO = getTodayISO();
    
    for (let i = -2; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      // Gerar ISO Local (YYYY-MM-DD)
      const ly = d.getFullYear();
      const lm = String(d.getMonth() + 1).padStart(2, '0');
      const ld = String(d.getDate()).padStart(2, '0');
      const localISO = `${ly}-${lm}-${ld}`;

      dates.push({
        full: localISO,
        day: d.toLocaleDateString(language, { day: '2-digit' }),
        weekday: d.toLocaleDateString(language, { weekday: 'short' }).replace('.', ''),
        isToday: localISO === todayISO
      });
    }
    return dates;
  }, [language, getTodayISO]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row pb-24 md:pb-0 transition-colors duration-300 ${isGlobalDark ? 'bg-slate-900 text-white' : 'bg-transparent text-gray-900'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex w-64 lg:w-72 border-r p-6 flex-col gap-6 z-20 ${isGlobalDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/60 backdrop-blur-xl'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 flex items-center justify-center cursor-pointer transition-transform active:scale-90" 
              onClick={triggerLogoSpin}
              onMouseEnter={triggerLogoSpin}
            >
              <img 
                src="https://mathblox.mschelp.com.br/logo_mschelp.png" 
                alt="Logo" 
                className={`w-14 h-14 object-contain transition-all drop-shadow-sm ${isLogoSpinning ? 'animate-spin-once' : ''}`} 
              />
            </div>
            <div>
              <h1 className={`text-sm font-black leading-tight uppercase ${isGlobalDark ? 'text-white' : 'text-gray-900'}`}>{t.appTitle}</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">{t.appSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all">
              <i className={`fas ${isGlobalDark ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all">
              <i className="fas fa-gear"></i>
            </button>
          </div>
        </div>

        {/* Perfil do Usuário */}
        <div className="px-1">
          {user ? (
            <div className={`flex items-center gap-3 p-3 border rounded-2xl shadow-sm ${isGlobalDark ? 'bg-slate-800 border-slate-700' : 'bg-white/50 border-indigo-100'}`}>
              <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black truncate uppercase leading-none ${isGlobalDark ? 'text-white' : 'text-gray-800'}`}>{user.displayName}</p>
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
          <button onClick={() => { setCurrentView('active'); setFilterColor(null); setSelectedDate(null); setFilterTag(null); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all font-black text-xs uppercase ${(currentView === 'active' && !filterColor && !selectedDate && !filterTag) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            <i className="fas fa-layer-group"></i> {t.allInsights}
          </button>
          <button onClick={() => { setCurrentView('active'); setSelectedDate(getTodayISO()); setFilterTag(null); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all font-black text-xs uppercase ${selectedDate === getTodayISO() ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            <i className="fas fa-calendar-day"></i> {t.planningToday}
          </button>
          <button onClick={() => { setCurrentView('trash'); setFilterColor(null); setSelectedDate(null); setFilterTag(null); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all font-black text-xs uppercase ${currentView === 'trash' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            <i className="fas fa-trash"></i> Lixeira
          </button>
        </nav>

        {/* Tags Section */}
        {allTags.length > 0 && currentView !== 'trash' && (
          <div className="mt-2">
            <div className="flex justify-between items-center px-3 mb-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags</p>
            </div>
            <div className="flex flex-wrap gap-2 px-3">
              {allTags.map(tag => (
                <button key={tag} onClick={() => { setCurrentView('active'); setFilterTag(filterTag === tag ? null : tag); }} className={`text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-lg transition-all ${filterTag === tag ? 'bg-indigo-600 text-white' : isGlobalDark ? 'bg-slate-800 text-gray-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

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
                {filterColor === color && <i className={`fas fa-check text-[10px] ${['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 'bg-purple-200', 'bg-orange-200', 'theme-zen', 'theme-paper', 'theme-coffee', 'theme-sunset', 'theme-hearts'].includes(color) ? 'text-indigo-600' : 'text-white'}`}></i>}
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
        <header className={`px-6 py-4 md:py-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${isGlobalDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/40 border-slate-200'}`}>
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <div 
              className="flex items-center gap-3 cursor-pointer active:scale-95" 
              onClick={triggerLogoSpin}
              onMouseEnter={triggerLogoSpin}
            >
              <img 
                src="https://mathblox.mschelp.com.br/logo_mschelp.png" 
                className={`w-11 h-11 object-contain transition-all ${isLogoSpinning ? 'animate-spin-once' : ''}`} 
                alt="Logo" 
              />
              <span className={`font-black text-sm tracking-tight uppercase ${isGlobalDark ? 'text-white' : 'text-gray-900'}`}>{t.appSubtitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="p-2 text-gray-500 hover:text-indigo-500">
                <i className={`fas ${isGlobalDark ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button onClick={() => setIsSearchActive(!isSearchActive)} className="p-2 text-gray-500">
                <i className={`fas ${isSearchActive ? 'fa-times' : 'fa-search'}`}></i>
              </button>
              {user && <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-indigo-200" onClick={() => setIsSettingsOpen(true)} />}
              {!user && <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500"><i className="fas fa-gear"></i></button>}
            </div>
          </div>

          <div className={`flex-1 max-w-3xl w-full relative group ${!isSearchActive && 'hidden md:block'}`}>
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-12 pr-6 py-4 border rounded-[1.5rem] shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-sm font-semibold ${isGlobalDark ? 'bg-slate-800 border-slate-600 text-white focus:ring-indigo-500/20 placeholder-gray-500' : 'bg-white border-slate-200 text-gray-900 focus:ring-indigo-50'}`} />
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
          {currentView === 'active' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t.timeline}</h2>
                <button onClick={() => setSelectedDate(null)} className={`text-[10px] font-black uppercase transition-colors ${!selectedDate ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {t.viewAll}
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-1 px-1">
                {timelineDates.map(date => (
                  <button key={date.full} onClick={() => setSelectedDate(selectedDate === date.full ? null : date.full)} className={`flex-shrink-0 w-16 h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-2 ${selectedDate === date.full ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-110' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 hover:border-indigo-200'}`}>
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">{date.weekday}</span>
                    <span className="text-lg font-black">{date.day}</span>
                    {date.isToday && <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === date.full ? 'bg-white' : 'bg-indigo-500'}`}></span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Lixeira</h2>
              <button onClick={handleEmptyTrash} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-black uppercase hover:bg-red-200 transition-colors">
                Esvaziar Lixeira
              </button>
            </div>
          )}

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
                  {filterColor === color && <i className={`fas fa-check text-[10px] ${['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 'bg-purple-200', 'bg-orange-200', 'theme-zen', 'theme-paper', 'theme-coffee', 'theme-sunset', 'theme-hearts'].includes(color) ? 'text-indigo-600' : 'text-white'}`}></i>}
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
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-8 md:gap-10 space-y-8 md:space-y-10 animate-in fade-in duration-1000">
              {filteredNotes.map(note => (
                <div key={note.id} className="break-inside-avoid">
                  <NoteCard 
                    note={note} 
                    language={language} 
                    onEdit={(n) => { setEditingNote(n); setIsFormOpen(true); }} 
                    onDelete={handleDeleteNote} 
                    onUpdate={handleUpdateNoteField}
                    isDragging={draggedNoteId === note.id || touchActiveId === note.id}
                    isDragOver={dragOverNoteId === note.id}
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragOver={(e) => handleDragOver(e, note.id)}
                    onDragLeave={(e) => handleDragLeave(e, note.id)}
                    onDrop={(e) => handleDrop(e, note.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, note.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[40vh] flex items-center justify-center">
              <div className="text-center max-w-sm animate-in fade-in zoom-in duration-500">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isGlobalDark ? 'bg-slate-800 text-gray-500' : 'bg-gray-50 text-gray-300'}`}>
                  <i className="fas fa-calendar-xmark text-3xl"></i>
                </div>
                <h3 className={`text-xl font-black mb-2 ${isGlobalDark ? 'text-white' : 'text-gray-800'}`}>{t.noNotes}</h3>
                <p className={`text-sm font-semibold ${isGlobalDark ? 'text-gray-400' : 'text-gray-400'}`}>{t.noNotesDesc}</p>
                <Button variant="ghost" className="mt-6 text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-slate-800" onClick={() => setIsFormOpen(true)}>
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
          <div className={`w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400 ${isGlobalDark ? 'bg-slate-900 border border-slate-700' : 'bg-white/95 glass-panel'}`}>
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 ${isGlobalDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                    <i className="fas fa-gear text-2xl"></i>
                  </div>
                  <h2 className={`text-3xl font-black tracking-tight ${isGlobalDark ? 'text-white' : 'text-gray-900'}`}>{t.settings}</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 transition-all">
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <div className="space-y-10">
                {/* Seção Cloud */}
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">Sincronização Cloud</label>
                  {!user ? (
                    <div className="space-y-3">
                      <Button variant="secondary" className={`w-full h-16 rounded-3xl text-sm font-black border-2 shadow-sm ${isGlobalDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-indigo-100 hover:border-indigo-300'}`} onClick={handleLogin} isLoading={isLoggingIn}>
                        <i className="fab fa-google mr-3 text-indigo-500 text-xl"></i> {t.connectGoogle}
                      </Button>
                      {loginError && <p className="text-[10px] text-red-500 font-bold uppercase text-center mt-3 p-3 bg-red-50 rounded-xl border border-red-100">{loginError}</p>}
                    </div>
                  ) : (
                    <div className={`p-5 rounded-3xl flex items-center justify-between border-2 ${isGlobalDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100'}`}>
                      <div className="flex items-center gap-4">
                        <img src={user.photoURL || ''} className="w-12 h-12 rounded-2xl border-2 border-indigo-500" />
                        <div>
                          <p className={`text-sm font-black uppercase leading-none ${isGlobalDark ? 'text-white' : 'text-slate-800'}`}>{user.displayName}</p>
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
                    <button onClick={() => toggleLanguage(Language.PT)} className={`flex items-center justify-center gap-4 py-5 rounded-3xl border-2 transition-all font-black text-sm uppercase ${language === Language.PT ? (isGlobalDark ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300 shadow-md' : 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md') : (isGlobalDark ? 'border-slate-700 text-gray-400 hover:border-indigo-500' : 'border-gray-100 text-gray-500 hover:border-indigo-200')}`}>
                      <img src="https://flagcdn.com/w40/br.png" className="w-7 h-5 object-cover rounded shadow-sm" alt="PT" /> Português
                    </button>
                    <button onClick={() => toggleLanguage(Language.EN)} className={`flex items-center justify-center gap-4 py-5 rounded-3xl border-2 transition-all font-black text-sm uppercase ${language === Language.EN ? (isGlobalDark ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300 shadow-md' : 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md') : (isGlobalDark ? 'border-slate-700 text-gray-400 hover:border-indigo-500' : 'border-gray-100 text-gray-500 hover:border-indigo-200')}`}>
                      <img src="https://flagcdn.com/w40/us.png" className="w-7 h-5 object-cover rounded shadow-sm" alt="EN" /> English
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">{t.security}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => storageService.exportBackup()} className={`flex items-center justify-between px-6 py-5 rounded-3xl transition-all group border-2 ${isGlobalDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-gray-50 hover:bg-indigo-50 border-transparent hover:border-indigo-100'}`}>
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-export text-indigo-600 text-lg"></i>
                        <span className={`font-black text-[10px] uppercase tracking-wider ${isGlobalDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.export}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                    <button onClick={handleImportClick} className={`flex items-center justify-between px-6 py-5 rounded-3xl transition-all group border-2 ${isGlobalDark ? 'bg-slate-800 border-slate-700 hover:border-emerald-500' : 'bg-gray-50 hover:bg-emerald-50 border-transparent hover:border-emerald-100'}`}>
                      <div className="flex items-center gap-4">
                        <i className="fas fa-file-import text-emerald-600 text-lg"></i>
                        <span className={`font-black text-[10px] uppercase tracking-wider ${isGlobalDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.import}</span>
                      </div>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-emerald-400 transition-colors"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-center">
                <Button variant="ghost" className={`font-black tracking-[0.2em] text-xs uppercase ${isGlobalDark ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-indigo-50'}`} onClick={() => setIsSettingsOpen(false)}>
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
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-8 py-4 flex items-center justify-around z-50 shadow-2xl transition-colors ${isGlobalDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-100'}`}>
        <button onClick={() => { setCurrentView('active'); setSelectedDate(null); setFilterColor(null); setFilterTag(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`flex flex-col items-center gap-1.5 ${(currentView === 'active' && !selectedDate && !filterColor && !filterTag) ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-home text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">{t.home}</span>
        </button>
        <button onClick={() => { setCurrentView('active'); setSelectedDate(getTodayISO()); setFilterTag(null); }} className={`flex flex-col items-center gap-1.5 ${(currentView === 'active' && selectedDate === getTodayISO()) ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-calendar-check text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">{t.today}</span>
        </button>
        <button onClick={() => { setCurrentView('trash'); setFilterColor(null); setSelectedDate(null); setFilterTag(null); }} className={`flex flex-col items-center gap-1.5 ${currentView === 'trash' ? 'text-red-500 scale-110' : 'text-gray-400'}`}>
          <i className="fas fa-trash text-xl"></i>
          <span className="text-[10px] font-black tracking-widest uppercase">Lixo</span>
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
