
import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteColor, Language } from '../types';
import { Button } from './Button';

interface NoteFormProps {
  note?: Note;
  language: Language;
  onSave: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const formTranslations = {
  [Language.PT]: {
    editTitle: "Editar Insight",
    newTitle: "Novo Insight",
    labelTitle: "Título",
    labelDate: "Data (Opcional)",
    labelContent: "O que está pensando?",
    labelColor: "Estilo do Card",
    placeholderTitle: "Ex: Ideia Brilhante",
    placeholderContent: "Digite sua nota aqui...",
    btnCancel: "CANCELAR",
    btnSave: "SALVAR NOTA",
    clear: "Limpar",
    today: "Hoje"
  },
  [Language.EN]: {
    editTitle: "Edit Insight",
    newTitle: "New Insight",
    labelTitle: "Title",
    labelDate: "Date (Optional)",
    labelContent: "What's on your mind?",
    labelColor: "Card Style",
    placeholderTitle: "Ex: Brilliant Idea",
    placeholderContent: "Type your note here...",
    btnCancel: "CANCEL",
    btnSave: "SAVE NOTE",
    clear: "Clear",
    today: "Today"
  }
};

export const NoteForm: React.FC<NoteFormProps> = ({ note, language, onSave, onCancel }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState<NoteColor>(note?.color || NoteColor.YELLOW);
  const [date, setDate] = useState(note?.date || '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const ft = formTranslations[language];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setDate(note.date || '');
      if (note.date) setViewDate(new Date(note.date + 'T12:00:00'));
    }
  }, [note]);

  // Fechar calendário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({ title, content, color, date: date || undefined });
  };

  // Lógica do Calendário
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const selectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setIsDatePickerOpen(false);
  };

  const clearDate = () => {
    setDate('');
    setIsDatePickerOpen(false);
  };

  const setToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setIsDatePickerOpen(false);
  };

  const renderCalendar = () => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const days = [];

    // Células vazias para o início do mês
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
    }

    // Dias do mês
    for (let d = 1; d <= totalDays; d++) {
      const isSelected = date === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => selectDate(d)}
          className={`h-9 w-9 rounded-full text-xs font-bold transition-all flex items-center justify-center
            ${isSelected ? 'bg-indigo-600 text-white shadow-md scale-110' : 'hover:bg-indigo-50 text-gray-700'}
            ${isToday && !isSelected ? 'border border-indigo-200 text-indigo-600' : ''}
          `}
        >
          {d}
        </button>
      );
    }

    const weekDays = language === Language.PT 
      ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] 
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="p-4 select-none">
        <div className="flex justify-between items-center mb-4">
          <button type="button" onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <span className="text-sm font-black text-gray-800 uppercase tracking-tight">
            {viewDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((wd, i) => (
            <div key={i} className="h-9 w-9 flex items-center justify-center text-[10px] font-black text-gray-300">
              {wd}
            </div>
          ))}
          {days}
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
          <button type="button" onClick={clearDate} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest px-2 py-1">
            {ft.clear}
          </button>
          <button type="button" onClick={setToday} className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest px-2 py-1">
            {ft.today}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300 max-h-[95vh]">
        <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">
            {note ? ft.editTitle : ft.newTitle}
          </h2>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{ft.labelTitle}</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ft.placeholderTitle}
                className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400"
              />
            </div>
            
            <div className="relative" ref={datePickerRef}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{ft.labelDate}</label>
              <button 
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className={`w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl text-left transition-all font-semibold flex justify-between items-center ${isDatePickerOpen ? 'bg-white border-indigo-500 ring-4 ring-indigo-500/5' : 'hover:bg-gray-100'}`}
              >
                <span className={date ? 'text-slate-900' : 'text-slate-400'}>
                  {date ? new Date(date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : 'dd/mm/aaaa'}
                </span>
                <i className={`fas fa-calendar-alt ${date ? 'text-indigo-500' : 'text-gray-300'}`}></i>
              </button>

              {/* Date Picker Popover */}
              {isDatePickerOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-[70] animate-in zoom-in-95 fade-in duration-200 origin-top">
                  {renderCalendar()}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{ft.labelContent}</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={ft.placeholderContent}
              rows={6}
              className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none font-medium leading-relaxed text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{ft.labelColor}</label>
            <div className="flex flex-wrap gap-4 px-1">
              {Object.entries(NoteColor).map(([key, val]) => {
                const isActive = color === val;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(val as NoteColor)}
                    className={`w-10 h-10 rounded-full border-4 transition-all shadow-sm flex items-center justify-center ${val} ${isActive ? 'border-indigo-600 scale-125 ring-4 ring-indigo-50' : 'border-transparent hover:scale-110'}`}
                  >
                    {val === NoteColor.HEARTS && <i className={`fas fa-heart text-[10px] ${isActive ? 'text-pink-500' : 'text-pink-400 opacity-50'}`}></i>}
                    {val === NoteColor.CELEBRATION && <i className={`fas fa-sparkles text-[10px] ${isActive ? 'text-amber-400' : 'text-amber-300 opacity-50'}`}></i>}
                    {val === NoteColor.ZEN && <i className={`fas fa-leaf text-[10px] ${isActive ? 'text-emerald-500' : 'text-emerald-400 opacity-50'}`}></i>}
                    {val === NoteColor.TECH && <i className={`fas fa-microchip text-[10px] ${isActive ? 'text-sky-400' : 'text-sky-300 opacity-50'}`}></i>}
                    {val === NoteColor.GALAXY && <i className={`fas fa-user-astronaut text-[10px] ${isActive ? 'text-white' : 'text-white/40'}`}></i>}
                    {val === NoteColor.PAPER && <i className={`fas fa-pen-nib text-[10px] ${isActive ? 'text-red-500' : 'text-red-400 opacity-50'}`}></i>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-3 pb-4">
            <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-wider" onClick={onCancel}>
              {ft.btnCancel}
            </Button>
            <Button variant="primary" type="submit" className="flex-[2] rounded-2xl h-14 font-black shadow-xl shadow-indigo-100 uppercase tracking-wider">
              {ft.btnSave}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
