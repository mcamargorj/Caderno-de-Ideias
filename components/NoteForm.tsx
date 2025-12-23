
import React, { useState, useEffect } from 'react';
import { Note, NoteColor } from '../types.ts';
import { Button } from './Button.tsx';

interface NoteFormProps {
  note?: Note;
  onSave: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const NoteForm: React.FC<NoteFormProps> = ({ note, onSave, onCancel }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState<NoteColor>(note?.color || NoteColor.YELLOW);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
    }
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({ title, content, color });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {note ? 'Editar Nota' : 'Nova Nota'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dê um nome para sua nota..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você está pensando?"
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor da Sticky Note</label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(NoteColor).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(val as NoteColor)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${val} ${color === val ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Salvar Nota
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
