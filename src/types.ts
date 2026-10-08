export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  content?: string; // Text content for text/md/json files
  data?: string;    // Base64 data for images
}

export type WeaveScope = 'selection' | 'paragraph' | 'document';

export interface InlineIterationRequest {
  selectedText: string;
  feedback: string;
  scope: WeaveScope;
  paragraphContext: string;
  fullDocument: string;
  documentTitle: string;
}

export interface InlineIterationResult {
  scope: WeaveScope;
  originalText: string;
  revisedText: string;
  explanation: string;
  alternativeVariations?: string[];
  notesOnBroaderWeave?: string;
}

export interface ProactiveSuggestion {
  id: string;
  category: string;
  targetSnippet: string;
  critique: string;
  suggestedReplacement: string;
  rationale: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface DocumentSnapshot {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  note: string;
}

export interface DocumentState {
  id: string;
  title: string;
  content: string;
  summary?: string;
  editorialNotes?: string;
  updatedAt: number;
}
