import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, CornerDownLeft, X, Layers, FileText, Check, RotateCcw, Loader2 } from 'lucide-react';
import { WeaveScope, InlineIterationResult } from '../types';
import { computeWordDiff } from '../utils/textUtils';

interface InlineCopilotBubbleProps {
  selectedText: string;
  paragraphContext: string;
  fullDocument: string;
  documentTitle: string;
  position: { top: number; left: number } | null;
  onApplyChange: (replacement: string, scope: WeaveScope) => void;
  onClose: () => void;
}

export const InlineCopilotBubble: React.FC<InlineCopilotBubbleProps> = ({
  selectedText,
  paragraphContext,
  fullDocument,
  documentTitle,
  position,
  onApplyChange,
  onClose,
}) => {
  const [feedback, setFeedback] = useState('');
  const [scope, setScope] = useState<WeaveScope>('paragraph');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InlineIterationResult | null>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on appear
    inputRef.current?.focus();
  }, [position]);

  if (!position) return null;

  const handleIterate = async (feedbackText?: string) => {
    const finalFeedback = feedbackText || feedback;
    if (!finalFeedback.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/iterate-inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          feedback: finalFeedback,
          scope,
          paragraphContext,
          fullDocument,
          documentTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to iterate');

      setResult(data);
      setSelectedVariationIndex(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with thought partner.');
    } finally {
      setLoading(false);
    }
  };

  const currentReplacementText = () => {
    if (!result) return '';
    if (selectedVariationIndex === 0) return result.revisedText;
    if (result.alternativeVariations && result.alternativeVariations[selectedVariationIndex - 1]) {
      return result.alternativeVariations[selectedVariationIndex - 1];
    }
    return result.revisedText;
  };

  const handleApply = () => {
    const replacement = currentReplacementText();
    if (replacement) {
      onApplyChange(replacement, result?.scope || scope);
      onClose();
    }
  };

  // Quick feedback prompts
  const quickActions = [
    { label: 'Sharpen cadence', prompt: 'Make this sharper, more memorable, and eliminate weak phrasing' },
    { label: 'Add concrete metaphor', prompt: 'Ground this idea with a vivid, tactile real-world metaphor' },
    { label: 'More conversational', prompt: 'Make this sound candid, natural, and directly spoken over coffee' },
    { label: 'Steelman counterpoint', prompt: 'Anticipate the smartest objection to this thought and address it' },
    { label: 'Ruthlessly cut fluff', prompt: 'Strip out all unnecessary adjectives and simplify to its core essence' },
  ];

  const diffParts = result
    ? computeWordDiff(
        result.scope === 'paragraph' ? paragraphContext : selectedText,
        currentReplacementText()
      )
    : [];

  return (
    <div
      className="fixed z-50 transition-all animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${Math.max(12, Math.min(window.innerHeight - 340, position.top))}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 620, position.left))}px`,
        width: 'min(580px, calc(100vw - 32px))',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-[#FCFAF7] border border-stone-300/80 rounded-2xl shadow-xl p-4 text-stone-900 font-sans-ui overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-200/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="text-xs font-medium text-stone-700">Inline Co-Author</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {/* Scope Toggle */}
            <div className="flex items-center bg-stone-200/60 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setScope('selection')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  scope === 'selection' ? 'bg-white font-medium text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Only modify the highlighted words"
              >
                Selection only
              </button>
              <button
                type="button"
                onClick={() => setScope('paragraph')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  scope === 'paragraph' ? 'bg-white font-medium text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Rewrite surrounding paragraph to weave changes organically"
              >
                Flow into paragraph
              </button>
              <button
                type="button"
                onClick={() => setScope('document')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  scope === 'document' ? 'bg-white font-medium text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Weave across entire document"
              >
                Whole piece
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Quote preview */}
        <div className="mb-2.5 px-3 py-1.5 bg-stone-100/70 border-l-2 border-amber-600 rounded-r-lg text-xs text-stone-600 font-serif-editor italic line-clamp-2">
          &ldquo;{selectedText}&rdquo;
        </div>

        {!result ? (
          /* Input stage */
          <div>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleIterate();
              }}
              className="relative flex items-center"
            >
              <input
                ref={inputRef}
                type="text"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="How should Cadence rewrite this? e.g. 'Make it punchier', 'Add a concrete metaphor'..."
                disabled={loading}
                className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-stone-900 placeholder:text-stone-400 shadow-xs"
              />
              <button
                type="submit"
                disabled={loading || !feedback.trim()}
                className="absolute right-1.5 px-2.5 py-1.5 bg-stone-900 text-stone-50 text-[11px] font-medium rounded-lg hover:bg-stone-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>Iterate</span>
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick action chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setFeedback(qa.prompt);
                    handleIterate(qa.prompt);
                  }}
                  disabled={loading}
                  className="text-[11px] px-2 py-1 bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded-md border border-stone-200/60 transition-colors cursor-pointer"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Result & Diff stage */
          <div className="space-y-3">
            {/* Thought partner rationale */}
            <div className="text-xs text-stone-600 bg-amber-50/60 border border-amber-200/50 p-2.5 rounded-xl">
              <span className="font-semibold text-stone-800">Editorial Rationale: </span>
              {result.explanation}
              {result.notesOnBroaderWeave && (
                <p className="mt-1 text-[11px] text-stone-500">
                  <span className="font-medium text-stone-700">Broader weave: </span>
                  {result.notesOnBroaderWeave}
                </p>
              )}
            </div>

            {/* Diff Preview */}
            <div className="p-3 bg-white border border-stone-200 rounded-xl text-xs font-serif-editor leading-relaxed max-h-44 overflow-y-auto">
              <div className="text-[10px] font-sans text-stone-400 uppercase tracking-wider mb-1 font-medium">
                Proposed Revision ({scope === 'paragraph' ? 'Paragraph flow' : scope === 'document' ? 'Whole document' : 'Selection'})
              </div>
              <div className="text-stone-800 text-[13px]">
                {diffParts.map((part, index) => {
                  if (part.type === 'removed') {
                    return (
                      <span key={index} className="line-through text-red-700 bg-red-50 px-0.5 rounded mx-0.5">
                        {part.value}
                      </span>
                    );
                  }
                  if (part.type === 'added') {
                    return (
                      <span key={index} className="bg-emerald-100 text-emerald-900 font-medium px-0.5 rounded mx-0.5">
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={index}>{part.value}</span>;
                })}
              </div>
            </div>

            {/* Variations Picker if any */}
            {result.alternativeVariations && result.alternativeVariations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-stone-400 font-medium">Variations:</span>
                <button
                  type="button"
                  onClick={() => setSelectedVariationIndex(0)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    selectedVariationIndex === 0 ? 'bg-stone-900 text-stone-50 font-medium' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Balanced
                </button>
                {result.alternativeVariations.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedVariationIndex(i + 1)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      selectedVariationIndex === i + 1 ? 'bg-stone-900 text-stone-50 font-medium' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Alternative {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 p-1 hover:bg-stone-100 rounded"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Try different feedback</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3.5 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Change</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
