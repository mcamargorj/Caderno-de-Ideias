
import React, { useState, useRef, useEffect } from 'react';
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
  // Drag and drop support
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  language, 
  onEdit, 
  onDelete, 
  onUpdate,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTitle(note.title);
    setEditContent(note.content);
  }, [note.title, note.content]);

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

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.date) return;

    const title = encodeURIComponent(note.title || 'Insight');
    const details = encodeURIComponent(note.content);
    const datePart = note.date.replace(/-/g, '');
    const timePart = (note.time || '09:00').replace(/:/g, '') + '00';
    const startDateTime = `${datePart}T${timePart}`;
    const endHour = parseInt((note.time || '09:00').split(':')[0]) + 1;
    const endDateTime = `${datePart}T${String(endHour).padStart(2, '0')}${timePart.substring(2)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}`;
    window.open(url, '_blank');
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
              // Oculta elementos que não devem aparecer na imagem compartilhada
              const elementsToHide = clonedCard.querySelectorAll('.action-icons-container, .ai-button-container, .share-exclude');
              elementsToHide.forEach(el => {
                (el as HTMLElement).style.display = 'none';
              });
              
              // Ajusta a borda inferior se necessário para ficar limpo
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

  const handleSaveInline = () => {
    onUpdate(note.id, { title: editTitle, content: editContent });
    setIsEditing(false);
  };

  const formattedUpdateDate = new Date(note.updatedAt).toLocaleDateString(language, { day: '2-digit', month: 'short' });
  const formattedTargetDate = note.date ? new Date(note.date + 'T00:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div 
      ref={cardRef}
      data-note-id={note.id}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`sticky-note w-full min-h-[360px] h-auto ${note.color} p-7 shadow-lg relative flex flex-col cursor-pointer border border-black/5 rounded-sm overflow-hidden transition-all hover:shadow-2xl ${isDragging ? 'opacity-40 border-dashed border-indigo-500 scale-95' : ''}`}
      onClick={() => { if (!isEditing) onEdit(note); }}
    >
      {!isDarkTheme && note.color !== NoteColor.PAPER && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/30 rotate-1 pointer-events-none backdrop-blur-sm z-10"></div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-1 max-w-full">
          {/* Drag Grip Handle */}
          <div 
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-500 cursor-grab active:cursor-grabbing transition-all mr-1 share-exclude touch-none select-none" 
            title={language === Language.PT ? "Arrastar para reordenar" : "Drag to reorder"}
          >
            <i className="fas fa-grip-vertical text-sm"></i>
          </div>

          {/* Star Pin Button */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { pinned: !note.pinned }); }} 
            title={note.pinned ? (language === Language.PT ? "Desafixar" : "Unpin") : (language === Language.PT ? "Fixar (Sempre Visível)" : "Pin (Always Visible)")} 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-black/10 share-exclude ${note.pinned ? 'text-amber-500 scale-110' : iconColor}`}
          >
            <i className={`${note.pinned ? 'fas' : 'far'} fa-star text-sm`}></i>
          </button>

          {note.date && (
            <div className={`flex items-center flex-wrap gap-1.5 px-2.5 py-1.5 ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-700'} rounded-lg text-[10px] font-black uppercase tracking-tighter`}>
              <i className="far fa-calendar-check text-xs"></i>
              <span>{formattedTargetDate}</span>
              {note.time && (
                <span className="ml-1 border-l border-current pl-1.5 flex items-center gap-1">
                  <i className="far fa-clock text-[10px]"></i> {note.time}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="action-icons-container flex flex-wrap justify-end gap-1 ml-auto">
          {/* Full-edit expand Modal Button */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(note); }} 
            title={language === Language.PT ? "Editar Detalhes" : "Edit Details"} 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-black/10 ${iconColor}`}
          >
            <i className="fas fa-expand text-sm"></i>
          </button>

          {note.date && (
            <button onClick={handleAddToCalendar} title="Lembrete / Calendário" className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-black/10 ${iconColor}`}>
              <i className="fas fa-bell text-sm"></i>
            </button>
          )}
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

      {isEditing ? (
        <div className="flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`text-2xl font-black ${textColor} leading-tight tracking-tight bg-transparent border-b ${isDarkTheme ? 'border-white/20' : 'border-black/10'} focus:border-indigo-500 focus:outline-none w-full mb-4 py-1`}
            placeholder={language === Language.PT ? "Título" : "Title"}
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full flex-1 bg-transparent border ${isDarkTheme ? 'border-white/20' : 'border-black/10'} rounded p-3 focus:border-indigo-500 focus:outline-none ${subTextColor} text-base font-medium whitespace-pre-wrap leading-relaxed mb-4 resize-none`}
            placeholder={language === Language.PT ? "Adicione seu insight..." : "Add your insight..."}
            rows={8}
          />
          <div className="flex gap-2 justify-end mb-4">
            <button
              type="button"
              onClick={handleSaveInline}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <i className="fas fa-check"></i> {language === Language.PT ? "Salvar" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(note.title);
                setEditContent(note.content);
                setIsEditing(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 ${isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-700'}`}
            >
              <i className="fas fa-xmark"></i> {language === Language.PT ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 text-left" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
            <h3 className={`text-2xl font-black ${textColor} leading-tight tracking-tight break-words hover:opacity-85 transition-opacity`}>
              {note.title || (language === Language.PT ? 'Insight' : 'Insight')}
            </h3>
          </div>

          <p className={`${subTextColor} text-base flex-1 font-medium whitespace-pre-wrap text-left leading-relaxed mb-6 line-clamp-[15] hover:opacity-85 transition-opacity`} onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
            {note.content}
          </p>
        </>
      )}

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
