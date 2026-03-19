

export interface Content {
  role?: string;
  parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[];
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: any;
  thinkingConfig?: {
    includeThoughts?: boolean;
    thinkingBudget?: number;
    thinkingLevel?: string;
  };
}

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
