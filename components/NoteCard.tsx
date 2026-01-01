
import React, { useState, useRef } from 'react';
import { Note, Language, NoteColor } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/geminiService';
import html2canvas from 'html2canvas';

interface NoteCardProps {
  note: Note;
  language: Language;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, language, onEdit, onDelete, onUpdate, onDragStart, onDragEnd }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDarkTheme = [NoteColor.CELEBRATION, NoteColor.TECH, NoteColor.GALAXY].includes(note.color);
  
  const textColor = isDarkTheme ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkTheme ? 'text-gray-300' : 'text-slate-700';
  const metaTextColor = isDarkTheme ? 'text-gray-400' : 'text-gray-500';
  const iconColor = isDarkTheme ? 'text-gray-300' : 'text-gray-600';

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEnhancing) return;
    setIsEnhancing(true);
    setError(null);
    try {
      const improved = await geminiService.enhanceNote(note.content, language);
      onUpdate(note.id, { content: improved });
    } catch (err: any) {
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

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedDate = note.date ? new Date(note.date + 'T00:00:00').toLocaleDateString(language) : '';
    const fullText = `[${note.title.toUpperCase()}]\n${formattedDate} ${note.time || ''}\n---\n${note.content}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {}
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (cardRef.current) {
        const tempId = `share-target-${note.id}`;
        cardRef.current.setAttribute('data-share-id', tempId);
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
          scale: 3, 
          useCORS: true,
          onclone: (clonedDoc) => {
            const clonedCard = clonedDoc.querySelector(`[data-share-id="${tempId}"]`) as HTMLElement;
            if (clonedCard) {
              const elementsToHide = clonedCard.querySelectorAll('.action-icons-container, .ai-button-container, .share-exclude, .drag-handle');
              elementsToHide.forEach(el => { (el as HTMLElement).style.display = 'none'; });
              const footer = clonedCard.querySelector('.footer-metadata') as HTMLElement;
              if (footer) footer.style.border = 'none';
            }
          }
        });
        cardRef.current.removeAttribute('data-share-id');
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob && navigator.share) {
          const file = new File([blob], 'insight.png', { type: 'image/png' });
          await navigator.share({ files: [file], title: note.title });
        }
      }
    } catch (e) {
      console.error("Erro ao compartilhar", e);
    } finally {
      setIsSharing(false);
    }
  };

  const formattedUpdateDate = new Date(note.updatedAt).toLocaleDateString(language, { day: '2-digit', month: 'short' });
  const formattedTargetDate = note.date ? new Date(note.date + 'T00:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div 
      ref={cardRef}
      className={`sticky-note w-full min-h-[360px] h-auto ${note.color} p-7 shadow-lg relative flex flex-col cursor-pointer border border-black/5 rounded-sm overflow-hidden transition-all hover:shadow-2xl`}
      onClick={() => onEdit(note)}
    >
      {/* Alça de Arraste Unificada (Touch + Mouse) */}
      <div 
        className="drag-handle absolute top-0 left-0 right-0 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
        onPointerDown={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          onDragStart();
        }}
        onPointerUp={onDragEnd}
        style={{ touchAction: 'none' }}
      >
        <div className="w-12 h-1 bg-black/10 rounded-full md:block hidden"></div>
        <div className="md:hidden text-gray-400/30">
          <i className="fas fa-grip-lines"></i>
        </div>
      </div>

      {!isDarkTheme && note.color !== NoteColor.PAPER && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/30 rotate-1 pointer-events-none backdrop-blur-sm z-10"></div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 mt-4">
        <div className="flex flex-col gap-1 max-w-full">
          {note.date && (
            <div className={`flex items-center flex-wrap gap-1.5 px-2.5 py-1.5 ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-700'} rounded-lg text-[10px] font-black uppercase tracking-tighter`}>
              <i className="far fa-calendar-check text-xs"></i>
              <span>{formattedTargetDate}</span>
              {note.time && <span className="ml-1 border-l border-current pl-1.5 flex items-center gap-1"><i className="far fa-clock text-[10px]"></i> {note.time}</span>}
            </div>
          )}
        </div>

        <div className="action-icons-container flex flex-wrap justify-end gap-1 ml-auto">
          <button onClick={handleSpeak} title="Ouvir" className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isSpeaking ? 'bg-indigo-500 text-white' : `hover:bg-black/10 ${iconColor}`}`}>
            <i className={`fas ${isSpeaking ? 'fa-volume-up animate-pulse' : 'fa-volume-low'} text-sm`}></i>
          </button>
          <button onClick={handleCopy} title="Copiar" className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isCopied ? 'bg-green-500 text-white' : `hover:bg-black/10 ${iconColor}`}`}>
            <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} text-sm`}></i>
          </button>
          <button onClick={handleShare} title="Compartilhar" className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isSharing ? 'bg-indigo-500 text-white' : `hover:bg-black/10 ${iconColor}`}`}>
            <i className={`fas ${isSharing ? 'fa-spinner fa-spin' : 'fa-share-nodes'} text-sm`}></i>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500 hover:text-white ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'} transition-all`}>
            <i className="fas fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className={`text-2xl font-black ${textColor} leading-tight tracking-tight break-words`}>
          {note.title || (language === Language.PT ? 'Insight' : 'Insight')}
        </h3>
      </div>

      <p className={`${subTextColor} text-base flex-1 font-medium whitespace-pre-wrap leading-relaxed mb-6 line-clamp-[15]`}>
        {note.content}
      </p>

      <div className="mt-auto pt-4">
        <div className={`footer-metadata flex justify-between items-center text-[10px] ${metaTextColor} font-black border-t ${isDarkTheme ? 'border-white/10' : 'border-black/10'} pt-4 uppercase tracking-widest`}>
          <span className="truncate mr-4 share-exclude">{error || (language === Language.PT ? `Atu: ${formattedUpdateDate}` : `Upd: ${formattedUpdateDate}`)}</span>
          <div className="ai-button-container shrink-0">
             <Button variant="ghost" size="sm" className={`h-8 px-4 text-[10px] font-black rounded-xl transition-all active:scale-95 ${isEnhancing ? 'bg-indigo-600 text-white' : isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-800'}`} onClick={handleEnhance} isLoading={isEnhancing}>
                {isEnhancing ? '...' : <><i className="fas fa-wand-magic-sparkles mr-2"></i> IA</>}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
