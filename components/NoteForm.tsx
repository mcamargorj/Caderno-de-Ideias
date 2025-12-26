
import React, { useState, useEffect } from 'react';
import { Note, NoteColor, Language } from '../types.ts';
import { Button } from './Button.tsx';

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
    labelColor: "Personalizar Cor",
    placeholderTitle: "Ex: Ideia Brilhante",
    placeholderContent: "Digite sua nota aqui...",
    btnCancel: "CANCELAR",
    btnSave: "SALVAR NOTA"
  },
  [Language.EN]: {
    editTitle: "Edit Insight",
    newTitle: "New Insight",
    labelTitle: "Title",
    labelDate: "Date (Optional)",
    labelContent: "What's on your mind?",
    labelColor: "Customize Color",
    placeholderTitle: "Ex: Brilliant Idea",
    placeholderContent: "Type your note here...",
    btnCancel: "CANCEL",
    btnSave: "SAVE NOTE"
  }
};

export const NoteForm: React.FC<NoteFormProps> = ({ note, language, onSave, onCancel }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState<NoteColor>(note?.color || NoteColor.YELLOW);
  const [date, setDate] = useState(note?.date || '');

  const ft = formTranslations[language];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setDate(note.date || '');
    }
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({ title, content, color, date: date || undefined });
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
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{ft.labelDate}</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-semibold text-slate-900"
              />
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
              {Object.entries(NoteColor).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(val as NoteColor)}
                  className={`w-10 h-10 rounded-full border-4 transition-all shadow-sm ${val} ${color === val ? 'border-indigo-600 scale-125' : 'border-transparent hover:scale-110'}`}
                />
              ))}
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
