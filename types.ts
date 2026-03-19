

import { GenerationConfig, Content } from '@google/genai';

export interface ChatMessage {
  id: string;
  author: 'user' | 'model';
  text: string;
  imageUrl?: string;
}

export type AppState = 'initial' | 'chatting' | 'study-planner' | 'flashcards';

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number; // timestamp
  modelName: string;
  config: Partial<GenerationConfig>;
  history: Content[]; // Store history for re-creating the session
  status: 'active' | 'archived';
  isVisibleInHistory?: boolean;
  isStudyPlan?: boolean;
}

export interface Flashcard {
  front: string;
  back: string;
}
