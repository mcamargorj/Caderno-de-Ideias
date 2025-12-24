
import React, { useState } from 'react';
import { Note } from '../types.ts';
import { Button } from './Button.tsx';
import { geminiService } from '../services/geminiService.ts';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onKeyError?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onUpdate, onKeyError }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.content.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const improved = await geminiService.enhanceNote(note.content);
      if (improved && improved !== note.content) {
        onUpdate(note.id, { content: improved });
      }
    } catch (err: any) {
      console.error("Falha ao melhorar nota:", err);
      if (err.message === "API_KEY_INVALID" || err.message === "API_KEY_MISSING") {
        onKeyError?.();
      } else {
        alert(err.message || "Ocorreu um erro ao tentar usar a IA.");
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.content.trim() || isSpeaking) return;

    setIsSpeaking(true);
    try {
      await geminiService.speak(note.content);
    } catch (err: any) {
      console.error("Falha ao reproduzir áudio:", err);
      if (err.message === "API_KEY_INVALID" || err.message === "API_KEY_MISSING") {
        onKeyError?.();
      }
    } finally {
      setTimeout(() => setIsSpeaking(false), 1000);
    }
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
      className={`sticky-note w-full aspect-square ${note.color} p-6 shadow-lg relative flex flex-col cursor-default group/card border border-black/5`}
      onClick={() => onEdit(note)}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/40 rotate-1 pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-2 group">
        <h3 className="text-lg font-bold text-gray-800 line-clamp-1 flex-1 leading-tight pr-2">
          {note.title || 'Sem título'}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); handleSpeak(e); }}
            className={`p-1 transition-colors ${isSpeaking ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
            title="Ouvir Nota"
            disabled={isSpeaking}
          >
            <i className={`fas ${isSpeaking ? 'fa-volume-up animate-pulse' : 'fa-volume-low'} text-sm`}></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="text-red-600/70 hover:text-red-700 p-1"
            title="Excluir"
          >
            <i className="fas fa-trash-alt text-sm"></i>
          </button>
        </div>
      </div>

      <p className="text-gray-700 overflow-hidden text-ellipsis line-clamp-6 text-sm flex-1 note-font whitespace-pre-wrap leading-relaxed">
        {note.content}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium border-t border-black/5 pt-2">
          <span>{formattedDate}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-3 text-[10px] rounded-lg transition-all ${isEnhancing ? 'bg-indigo-100 text-indigo-600' : 'bg-black/5 hover:bg-black/10'}`}
            onClick={handleEnhance}
            isLoading={isEnhancing}
          >
            {isEnhancing ? 'Melhorando...' : <><i className="fas fa-magic mr-1.5"></i> IA</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
