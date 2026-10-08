import React from 'react';
import { Sparkles, Check, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { ProactiveSuggestion } from '../types';
import { computeWordDiff } from '../utils/textUtils';

interface SuggestionModalProps {
  suggestion: ProactiveSuggestion | null;
  onClose: () => void;
  onApply: (suggestion: ProactiveSuggestion) => void;
  onDismiss: (id: string) => void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({
  suggestion,
  onClose,
  onApply,
  onDismiss,
}) => {
  if (!suggestion) return null;

  const diffParts = computeWordDiff(
    suggestion.targetSnippet,
    suggestion.suggestedReplacement
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#FCFAF7] border border-stone-300 rounded-2xl shadow-2xl p-6 text-stone-900 font-sans-ui"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-amber-100 text-amber-800">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
              Editorial Thought: {suggestion.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Critique Note */}
        <div className="mb-4 p-3 bg-stone-100/80 border border-stone-200/80 rounded-xl text-xs text-stone-800 leading-relaxed font-medium">
          {suggestion.critique}
        </div>

        {/* Diff Review Box */}
        <div className="mb-4 p-3.5 bg-white border border-stone-200 rounded-xl font-serif-editor text-sm leading-relaxed max-h-48 overflow-y-auto">
          <div className="text-[10px] font-sans font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
            Proposed Inline Replacement
          </div>
          <div className="text-stone-800">
            {diffParts.map((part, index) => {
              if (part.type === 'removed') {
                return (
                  <span
                    key={index}
                    className="line-through text-red-700 bg-red-50 px-0.5 rounded mx-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.type === 'added') {
                return (
                  <span
                    key={index}
                    className="bg-emerald-100 text-emerald-900 font-medium px-0.5 rounded mx-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        </div>

        {/* Rationale */}
        <p className="text-[11px] text-stone-500 mb-5 italic">
          &ldquo;{suggestion.rationale}&rdquo;
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200/80">
          <button
            type="button"
            onClick={() => {
              onDismiss(suggestion.id);
              onClose();
            }}
            className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            Dismiss Thought
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(suggestion);
                onClose();
              }}
              className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply Replacement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
