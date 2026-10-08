import React from 'react';
import { Sparkles, Eye, Check, X, ArrowUpRight, RefreshCw, Wand2, ShieldAlert, BookOpen } from 'lucide-react';
import { ProactiveSuggestion } from '../types';

interface ProactivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ProactiveSuggestion[];
  isScanning: boolean;
  ambientMode: boolean;
  onToggleAmbient: () => void;
  onScanNow: () => void;
  onApplySuggestion: (suggestion: ProactiveSuggestion) => void;
  onDismissSuggestion: (id: string) => void;
  onHighlightSnippet: (snippet: string) => void;
}

export const ProactivePanel: React.FC<ProactivePanelProps> = ({
  isOpen,
  onClose,
  suggestions,
  isScanning,
  ambientMode,
  onToggleAmbient,
  onScanNow,
  onApplySuggestion,
  onDismissSuggestion,
  onHighlightSnippet,
}) => {
  if (!isOpen) return null;

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <aside className="w-80 border-l border-stone-200/80 bg-[#FCFAF7] flex flex-col h-full overflow-hidden shrink-0 z-20">
      {/* Top Bar */}
      <div className="p-4 border-b border-stone-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
            Proactive Co-Pilot
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Control Bar */}
      <div className="p-3.5 bg-stone-100/60 border-b border-stone-200/60 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-600 font-medium">Ambient Thought Mode</span>
          <button
            type="button"
            onClick={onToggleAmbient}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              ambientMode ? 'bg-stone-900' : 'bg-stone-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                ambientMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-[11px] text-stone-500 leading-normal">
          {ambientMode
            ? 'Cadence quietly reflects as you write, surfacing margin notes only when substantive improvements emerge.'
            : 'Manual review only. Cadence will remain quiet until you ask for feedback.'}
        </p>

        <button
          type="button"
          onClick={onScanNow}
          disabled={isScanning}
          className="w-full mt-1 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-200/90 rounded-lg shadow-2xs hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-600' : ''}`} />
          <span>{isScanning ? 'Reflecting on draft...' : 'Review Draft Now'}</span>
        </button>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {isScanning && pendingSuggestions.length === 0 ? (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-600" />
            <p className="text-xs">Reading your prose for flow, cadence, and arguments...</p>
          </div>
        ) : pendingSuggestions.length === 0 ? (
          <div className="py-12 text-center text-stone-400 space-y-2">
            <BookOpen className="w-6 h-6 mx-auto text-stone-300" />
            <p className="text-xs font-serif-editor text-stone-500 text-base">Your draft is in good harmony.</p>
            <p className="text-[11px] text-stone-400 max-w-[200px] mx-auto">
              No glaring blindspots found. Continue writing or trigger a fresh review when ready.
            </p>
          </div>
        ) : (
          pendingSuggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-xs hover:border-amber-400/80 transition-all text-xs group"
              onMouseEnter={() => onHighlightSnippet(suggestion.targetSnippet)}
            >
              {/* Category Pill */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  {suggestion.category}
                </span>
                <button
                  type="button"
                  onClick={() => onDismissSuggestion(suggestion.id)}
                  className="text-stone-300 hover:text-stone-600 p-0.5 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Dismiss suggestion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Critique */}
              <p className="text-stone-800 font-medium mb-2 leading-relaxed">
                {suggestion.critique}
              </p>

              {/* Target Snippet */}
              <div className="mb-2 px-2.5 py-1.5 bg-stone-50 rounded-lg border-l-2 border-stone-300 font-serif-editor text-stone-600 text-[11px] italic line-clamp-2">
                &ldquo;{suggestion.targetSnippet}&rdquo;
              </div>

              {/* Proposed Replacement */}
              <div className="mb-2.5 p-2 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-emerald-950 font-serif-editor text-[11px] leading-relaxed">
                <div className="text-[9px] font-sans font-semibold uppercase text-emerald-700 tracking-wider mb-0.5">
                  Proposed Drop-In:
                </div>
                {suggestion.suggestedReplacement}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                <span className="text-[10px] text-stone-400">
                  {suggestion.rationale}
                </span>
                <button
                  type="button"
                  onClick={() => onApplySuggestion(suggestion)}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Apply Inline</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-stone-200/60 text-center text-[11px] text-stone-400">
        Cadence proactively suggests; you retain total creative agency.
      </div>
    </aside>
  );
};
