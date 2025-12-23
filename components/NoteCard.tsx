
import React, { useState } from 'react';
import { Note } from '../types.ts';
import { Button } from './Button.tsx';
import { enhanceNote } from '../services/geminiService.ts';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onUpdate }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEnhancing(true);
    const improved = await enhanceNote(note.content);
    onUpdate(note.id, { content: improved });
    setIsEnhancing(false);
  };

  const formattedDate = new Date(note.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      className={`sticky-note w-full aspect-square ${note.color} p-6 shadow-lg relative flex flex-col cursor-default`}
      onClick={() => onEdit(note)}
    >
      {/* Decorative Tape */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/40 rotate-1 pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-2 group">
        <h3 className="text-lg font-bold text-gray-800 line-clamp-1 flex-1 leading-tight">
          {note.title || 'Sem título'}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="text-red-500 hover:text-red-700 p-1"
            title="Excluir"
          >
            <i className="fas fa-trash-alt text-sm"></i>
          </button>
        </div>
      </div>

      <p className="text-gray-700 overflow-hidden text-ellipsis line-clamp-6 text-sm flex-1 note-font whitespace-pre-wrap">
        {note.content}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium border-t border-black/5 pt-2">
          <span>{formattedDate}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-[10px] bg-black/5 hover:bg-black/10"
            onClick={handleEnhance}
            isLoading={isEnhancing}
          >
            <i className="fas fa-magic mr-1"></i> IA
          </Button>
        </div>
      </div>
    </div>
  );
};
