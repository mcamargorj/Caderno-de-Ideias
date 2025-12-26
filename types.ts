
export enum NoteColor {
  YELLOW = 'bg-yellow-200',
  BLUE = 'bg-blue-200',
  GREEN = 'bg-green-200',
  PINK = 'bg-pink-200',
  PURPLE = 'bg-purple-200',
  ORANGE = 'bg-orange-200',
  HEARTS = 'theme-hearts',
  CELEBRATION = 'theme-celebration',
  ZEN = 'theme-zen',
  TECH = 'theme-tech',
  GALAXY = 'theme-galaxy',
  PAPER = 'theme-paper'
}

export enum Language {
  PT = 'pt-BR',
  EN = 'en-US'
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  date?: string; // Formato YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface StorageState {
  notes: Note[];
  version: number;
  language?: Language;
}
