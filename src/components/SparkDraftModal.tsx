import React, { useState, useRef } from 'react';
import { Sparkles, Paperclip, X, FileText, Image as ImageIcon, Loader2, ArrowRight } from 'lucide-react';
import { FileAttachment } from '../types';
import { readFileAsAttachment } from '../utils/textUtils';

interface SparkDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftCreated: (draft: { title: string; content: string; summary?: string; editorialNotes?: string }) => void;
}

const STARTER_PROMPTS = [
  "A provocative essay on why shipping faster often destroys product soul, and how ruthless subtraction creates true timeless software.",
  "A candid memo proposing that our team abandon back-to-back video meetings in favor of thoughtful, written asynchronous memos.",
  "A deeply personal reflection on the lost tactile quality of tools in the modern touchscreen era.",
  "A counter-intuitive analysis of why early-stage startups die from indigestion, not starvation."
];

export const SparkDraftModal: React.FC<SparkDraftModalProps> = ({ isOpen, onClose, onDraftCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('insightful');
  const [format, setFormat] = useState('essay');
  const [audience, setAudience] = useState('thoughtful readers');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    try {
      const readPromises = files.map(file => readFileAsAttachment(file));
      const results = await Promise.all(readPromises);

      const newAttachments: FileAttachment[] = results.map(res => ({
        id: Math.random().toString(36).substring(2, 9),
        name: res.name,
        size: res.size,
        mimeType: res.mimeType,
        content: res.content,
        data: res.data,
      }));

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err: any) {
      console.error(err);
      setError('Failed to read attached file. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && attachments.length === 0) {
      setError('Please provide a prompt or upload reference files to write from.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          attachments,
          tone,
          format,
          audience,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to craft draft');

      onDraftCreated({
        title: data.title || 'Untitled Draft',
        content: data.content || '',
        summary: data.summary,
        editorialNotes: data.editorialNotes,
      });
      onClose();
    } catch (err: any) {
      console.error('Draft generation error:', err);
      setError(err.message || 'Something went wrong while crafting your draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#FCFAF7] border border-stone-200/80 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-200/60">
          <div>
            <div className="flex items-center gap-2 text-stone-600 text-xs font-mono uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Thought Partner Co-Author</span>
            </div>
            <h2 className="text-2xl font-serif-editor text-stone-900 font-normal">
              Spark a New Draft
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Provide an angle, thesis, or reference notes. Cadence will synthesize them into an evocative starting draft.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Input */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              What do you want to explore or argue?
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Write a thought-provoking piece arguing that our modern tools interrupt our train of thought, and propose an analog-inspired digital workspace..."
              rows={4}
              className="w-full px-3.5 py-3 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 font-serif-editor placeholder:font-sans text-stone-800 placeholder:text-stone-400 leading-relaxed resize-none shadow-xs"
            />
          </div>

          {/* Prompt Starters */}
          <div>
            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block mb-1.5">
              Or start from a thesis spark
            </span>
            <div className="flex flex-col gap-1.5">
              {STARTER_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="text-left text-xs text-stone-600 hover:text-stone-950 p-2 rounded-lg hover:bg-stone-100/80 transition-colors border border-transparent hover:border-stone-200/60 line-clamp-1"
                >
                  &ldquo;{p}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-stone-500" />
                <span>Reference Attachments & Notes</span>
                <span className="text-stone-400 font-normal">(PDFs, text notes, screenshots)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                + Add files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.csv,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-2.5 bg-stone-100/70 border border-stone-200/60 rounded-xl">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-700 shadow-xs"
                  >
                    {att.mimeType.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                    )}
                    <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-stone-400 hover:text-stone-700 ml-1 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-stone-300 rounded-xl p-4 text-center cursor-pointer hover:bg-stone-50/80 transition-colors"
              >
                <p className="text-xs text-stone-500">
                  Drop reference notes, bullet points, or screenshots here to synthesize into the piece.
                </p>
              </div>
            )}
          </div>

          {/* Tone & Format Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
                Voice & Tone
              </label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="insightful and editorial">Insightful & Editorial</option>
                <option value="direct and punchy">Direct & Punchy (Paul Graham style)</option>
                <option value="thoughtful and philosophical">Philosophical & Reflective</option>
                <option value="analytical and rigorous">Analytical & Rigorous</option>
                <option value="warm and conversational">Conversational & Personal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="thought leadership essay">Essay / Longform</option>
                <option value="product manifesto">Product Manifesto</option>
                <option value="strategic memo">Strategic Memo</option>
                <option value="newsletter column">Newsletter Column</option>
                <option value="speech / address">Speech / Monologue</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
                Target Audience
              </label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="discerning readers and thinkers">Discerning Readers</option>
                <option value="engineers and builders">Engineers & Builders</option>
                <option value="executives and founders">Founders & Executives</option>
                <option value="general public">General Curious Audience</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-stone-200/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2 text-xs font-medium bg-stone-900 text-stone-50 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Weaving draft...</span>
              </>
            ) : (
              <>
                <span>Begin Writing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
