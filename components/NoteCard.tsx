
import React, { useState } from 'react';
import { Note, Language } from '../types.ts';
import { Button } from './Button.tsx';
import { geminiService } from '../services/geminiService.ts';

interface NoteCardProps {
  note: Note;
  language: Language;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, language, onEdit, onDelete, onUpdate }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEnhancing) return;
    
    setIsEnhancing(true);
    setError(null);
    try {
      const improved = await geminiService.enhanceNote(note.content, language);
      onUpdate(note.id, { content: improved });
    } catch (err: any) {
      console.error("Erro na UI:", err);
      setError(language === Language.PT ? "Falha na IA." : "AI Failed.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) return;

    setIsSpeaking(true);
    try {
      await geminiService.speak(note.content, language);
    } catch (err) {
      console.error("Erro ao falar:", err);
    } finally {
      setTimeout(() => setIsSpeaking(false), 2000);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: note.title || 'Insight',
      text: note.content,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error("Erro share:", err);
      }
    } else {
      await navigator.clipboard.writeText(note.content);
      alert(language === Language.PT ? "Copiado para área de transferência." : "Copied to clipboard.");
    }
  };

  const formattedUpdateDate = new Date(note.updatedAt).toLocaleDateString(language, {
    day: '2-digit',
    month: 'short'
  });

  const formattedTargetDate = note.date ? new Date(note.date + 'T00:00:00').toLocaleDateString(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : null;

  return (
    <div 
      className={`sticky-note w-full aspect-square ${note.color} p-6 shadow-lg relative flex flex-col cursor-pointer border border-black/5 rounded-sm overflow-hidden`}
      onClick={() => onEdit(note)}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/30 rotate-1 pointer-events-none backdrop-blur-sm"></div>
      
      {note.date && (
        <div className="absolute top-4 left-6 flex items-center gap-1.5 px-2 py-0.5 bg-black/5 rounded text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
          <i className="far fa-calendar-check"></i>
          {formattedTargetDate}
        </div>
      )}

      <div className={`flex justify-between items-start mb-2 group/header ${note.date ? 'mt-6' : ''}`}>
        <h3 className="text-lg font-black text-gray-800 line-clamp-1 flex-1 leading-tight tracking-tight pr-2">
          {note.title || (language === Language.PT ? 'Insight' : 'Insight')}
        </h3>
        <div className="flex gap-1">
          <button onClick={handleSpeak} className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${isSpeaking ? 'bg-indigo-500 text-white' : 'hover:bg-black/10 text-gray-600'}`}>
            <i className={`fas ${isSpeaking ? 'fa-volume-up animate-pulse' : 'fa-volume-low'} text-xs`}></i>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500 hover:text-white text-gray-400 transition-all">
            <i className="fas fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>

      <p className="text-gray-700 overflow-hidden text-ellipsis line-clamp-6 text-sm flex-1 font-medium whitespace-pre-wrap leading-relaxed">
        {note.content}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold border-t border-black/10 pt-3 uppercase tracking-wider">
          <span className={error ? 'text-red-600 animate-pulse' : ''}>{error || (language === Language.PT ? `Atu: ${formattedUpdateDate}` : `Upd: ${formattedUpdateDate}`)}</span>
          <div className="flex gap-2">
             <button onClick={handleShare} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 text-gray-600">
               <i className="fas fa-share-nodes text-xs"></i>
             </button>
             <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 px-3 text-[10px] font-black rounded-lg transition-transform active:scale-95 ${isEnhancing ? 'bg-indigo-600 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-700'}`}
                onClick={handleEnhance}
                isLoading={isEnhancing}
              >
                {isEnhancing ? '...' : <><i className="fas fa-wand-magic-sparkles mr-1"></i> IA</>}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
