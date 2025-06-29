export type Role = 'user' | 'model';

export interface Citation {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string; // Used for text content
  image?: string; // Data URI for rendering image
  audio?: {
    data: string; // Data URI for rendering audio
    mimeType: string;
  };
  file?: { // For documents and videos
    data: string;
    mimeType: string;
    name: string;
  };
  citations?: Citation[];
  timestamp: number;
}

export const personalities = {
  amiga: 'Amiga Acolhedora',
  sincera: 'Sincera Direta',
  engracada: 'Comediante do Sertão',
  conselheira: 'Conselheira Sábia',
  inteligente: 'Gênia do Axé',
} as const;

export type Personality = keyof typeof personalities;

export type ActiveView = 'chat' | 'activities' | 'memory';

export interface Activity {
  title: string;
  description: string;
  image: string;
  systemInstruction: string;
}

export interface ActivityCategory {
  category: string;
  items: Activity[];
}

export interface Fact {
  id: string;
  text: string;
}