
import React, { useState, useEffect } from 'react';
import { Note } from '../types.ts';
import { Button } from './Button.tsx';
import { geminiService } from '../services/geminiService.ts';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onUpdate }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpa o erro automaticamente para não poluir a nota
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleEnhance = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!note.content.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setError(null);

    // Pequeno atraso para garantir que a UI renderize o estado de "loading"
    // e resolva o problema de INP (Interaction to Next Paint)
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const improved = await geminiService.enhanceNote(note.content);
      if (improved && improved !== note.content) {
        onUpdate(note.id, { content: improved });
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSpeak = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!note.content.trim() || isSpeaking) return;

    setIsSpeaking(true);
    try {
      await geminiService.speak(note.content);
    } catch (err: any) {
      console.error("Erro ao falar:", err);
    } finally {
      setTimeout(() => setIsSpeaking(false), 2000);
    }
  };

  const formattedDate = new Date(note.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      className={`sticky-note w-full aspect-square ${note.color} p-6 shadow-lg relative flex flex-col cursor-pointer group/card border border-black/5 hover:shadow-2xl transition-all duration-300`}
      onClick={() => !isEnhancing && onEdit(note)}
    >
      {/* Detalhe de fita adesiva para estética */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/30 rotate-1 pointer-events-none backdrop-blur-sm"></div>
      
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-black text-slate-800 line-clamp-1 flex-1 tracking-tight pr-2">
          {note.title || 'Insight'}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={handleSpeak}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${isSpeaking ? 'bg-indigo-500 text-white' : 'hover:bg-black/10 text-slate-600'}`}
            title="Ouvir"
          >
            <i className={`fas ${isSpeaking ? 'fa-volume-up animate-pulse' : 'fa-volume-low'} text-[10px]`}></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500 hover:text-white text-slate-400 transition-all"
            title="Excluir"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>

      <p className="text-slate-700 overflow-hidden text-ellipsis line-clamp-5 text-sm flex-1 font-medium whitespace-pre-wrap leading-relaxed opacity-90">
        {note.content}
      </p>

      <div className="mt-4 pt-3 border-t border-black/10 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${error ? 'text-red-600' : 'text-slate-500'}`}>
            {error || formattedDate}
          </span>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-3 text-[10px] font-black rounded-lg transition-all transform active:scale-95 ${isEnhancing ? 'bg-indigo-600 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-700'}`}
            onClick={handleEnhance}
            isLoading={isEnhancing}
          >
            {isEnhancing ? 'PROCESSANDO...' : <><i className="fas fa-wand-magic-sparkles mr-1.5"></i> IA</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
