import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CornerDownLeft, Loader2, ArrowRight, Wand2, Plus } from 'lucide-react';
import { DocumentState, WeaveScope, ProactiveSuggestion } from '../types';

interface EditorCanvasProps {
  document: DocumentState;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: string) => void;
  onOpenInlineBubble: (params: {
    selectedText: string;
    paragraphContext: string;
    position: { top: number; left: number };
  }) => void;
  activeSnippetHighlight: string | null;
  proactiveSuggestions: ProactiveSuggestion[];
  onSelectSuggestion: (suggestion: ProactiveSuggestion) => void;
  focusMode: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  document,
  onChangeTitle,
  onChangeContent,
  onOpenInlineBubble,
  activeSnippetHighlight,
  proactiveSuggestions,
  onSelectSuggestion,
  focusMode,
}) => {
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [hoveredParagraphIndex, setHoveredParagraphIndex] = useState<number | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [continueInstruction, setContinueInstruction] = useState('');
  const [showContinueInput, setShowContinueInput] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Split content into paragraphs for clean typography and paragraph-level interaction
  const paragraphs = document.content.split('\n\n');

  // Handle selection detection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) return; // avoid accidental clicks

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Determine which paragraph context this belongs to
    let paragraphContext = selectedText;
    const commonAncestor = range.commonAncestorContainer;
    let node: Node | null = commonAncestor;
    while (node && node !== containerRef.current) {
      if (node instanceof HTMLElement && node.dataset.paragraphIndex !== undefined) {
        const pIndex = parseInt(node.dataset.paragraphIndex, 10);
        if (!isNaN(pIndex) && paragraphs[pIndex]) {
          paragraphContext = paragraphs[pIndex];
        }
        break;
      }
      node = node.parentNode;
    }

    onOpenInlineBubble({
      selectedText,
      paragraphContext,
      position: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      },
    });
  };

  const handleParagraphChange = (index: number, newText: string) => {
    const updated = [...paragraphs];
    updated[index] = newText;
    onChangeContent(updated.join('\n\n'));
  };

  const handleParagraphKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const updated = [...paragraphs];
      updated.splice(index + 1, 0, '');
      onChangeContent(updated.join('\n\n'));
      setTimeout(() => {
        const nextElem = containerRef.current?.querySelector(
          `[data-paragraph-index="${index + 1}"] textarea`
        ) as HTMLTextAreaElement | null;
        nextElem?.focus();
      }, 20);
    } else if (e.key === 'Backspace' && e.currentTarget.value === '' && paragraphs.length > 1) {
      e.preventDefault();
      const updated = [...paragraphs];
      updated.splice(index, 1);
      onChangeContent(updated.join('\n\n'));
      setTimeout(() => {
        const prevElem = containerRef.current?.querySelector(
          `[data-paragraph-index="${Math.max(0, index - 1)}"] textarea`
        ) as HTMLTextAreaElement | null;
        prevElem?.focus();
      }, 20);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      // Cmd+J quick ghostwrite
      e.preventDefault();
      triggerContinueWriting();
    }
  };

  const triggerContinueWriting = async (customPrompt?: string) => {
    if (continuing) return;
    setContinuing(true);

    try {
      const res = await fetch('/api/continue-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          content: document.content,
          instruction: customPrompt || continueInstruction,
        }),
      });

      const data = await res.json();
      if (data.continuation) {
        const newContent = document.content.trim() + '\n\n' + data.continuation;
        onChangeContent(newContent);
        setContinueInstruction('');
        setShowContinueInput(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContinuing(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="max-w-3xl mx-auto px-6 sm:px-12 py-12 md:py-16 transition-all"
    >
      {/* Editorial Notes Banner if provided */}
      {document.editorialNotes && (
        <div className="mb-8 p-3.5 bg-stone-100/70 border-l-2 border-amber-600 rounded-r-xl text-xs text-stone-600 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-stone-800">Collaborator Note: </span>
            {document.editorialNotes}
          </div>
        </div>
      )}

      {/* Document Headline */}
      <div className="mb-8">
        <input
          ref={titleInputRef}
          type="text"
          value={document.title}
          onChange={e => onChangeTitle(e.target.value)}
          placeholder="Untitled Essay..."
          className="w-full font-serif-editor text-3xl sm:text-4xl text-stone-900 font-normal focus:outline-none bg-transparent placeholder:text-stone-300 tracking-tight leading-tight"
        />
      </div>

      {/* Body Paragraphs */}
      <div className="space-y-6">
        {paragraphs.map((p, index) => {
          const isFocused = activeParagraphIndex === index;
          const isDimmed = focusMode && !isFocused && activeParagraphIndex !== null;

          // Check if any proactive suggestion targets this paragraph
          const matchedSuggestion = proactiveSuggestions.find(
            s => s.status === 'pending' && p.includes(s.targetSnippet)
          );

          const isHighlightedFromPanel =
            activeSnippetHighlight && p.includes(activeSnippetHighlight);

          return (
            <div
              key={index}
              data-paragraph-index={index}
              onMouseEnter={() => setHoveredParagraphIndex(index)}
              onMouseLeave={() => setHoveredParagraphIndex(null)}
              className={`relative group transition-opacity duration-300 ${
                isDimmed ? 'opacity-20 hover:opacity-75' : 'opacity-100'
              }`}
            >
              {/* Left Paragraph Action Handle */}
              <div
                className={`absolute -left-10 sm:-left-12 top-1 flex items-center gap-1 transition-opacity duration-150 ${
                  hoveredParagraphIndex === index || matchedSuggestion
                    ? 'opacity-100'
                    : 'opacity-0'
                }`}
              >
                {matchedSuggestion ? (
                  <button
                    type="button"
                    onClick={() => onSelectSuggestion(matchedSuggestion)}
                    title={`Editorial Note: ${matchedSuggestion.critique}`}
                    className="p-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors shadow-2xs cursor-pointer animate-pulse"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={e => {
                      const elem = e.currentTarget.closest('[data-paragraph-index]');
                      const rect = elem?.getBoundingClientRect();
                      if (rect) {
                        onOpenInlineBubble({
                          selectedText: p,
                          paragraphContext: p,
                          position: {
                            top: rect.bottom + window.scrollY + 4,
                            left: rect.left + window.scrollX,
                          },
                        });
                      }
                    }}
                    title="Iterate on this paragraph with AI"
                    className="p-1 text-stone-300 hover:text-amber-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Editable Text Area for Paragraph */}
              <textarea
                value={p}
                onFocus={() => setActiveParagraphIndex(index)}
                onBlur={() => setActiveParagraphIndex(null)}
                onChange={e => handleParagraphChange(index, e.target.value)}
                onKeyDown={e => handleParagraphKeyDown(e, index)}
                rows={Math.max(2, Math.ceil(p.length / 75))}
                placeholder={index === 0 ? "Begin your thoughts here..." : "Continue writing..."}
                className={`w-full font-serif-editor text-lg sm:text-[1.18rem] text-stone-800 bg-transparent resize-none focus:outline-none leading-[1.8] tracking-normal selection:bg-amber-200 selection:text-stone-900 transition-all ${
                  isHighlightedFromPanel
                    ? 'bg-amber-50/80 rounded-lg px-2 -mx-2 shadow-2xs'
                    : ''
                }`}
              />

              {/* Proactive Inline Suggestion Badge in context */}
              {matchedSuggestion && (
                <div 
                  onClick={() => onSelectSuggestion(matchedSuggestion)}
                  className="mt-1 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2.5 py-1 w-fit cursor-pointer hover:bg-amber-100/80 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="font-medium">Cadence Margin Note:</span>
                  <span className="truncate max-w-[340px] text-stone-600 font-sans-ui">{matchedSuggestion.critique}</span>
                  <span className="text-[10px] text-amber-700 font-semibold underline ml-1">Review</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ghostwrite / Continue Writing Bar at bottom */}
      <div className="mt-12 pt-8 border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => triggerContinueWriting()}
            disabled={continuing}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {continuing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Cadence is writing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Continue writing (Ghostwrite)</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-mono">
                  ⌘J
                </kbd>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowContinueInput(!showContinueInput)}
            className="px-3 py-2 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            {showContinueInput ? 'Cancel direction' : 'Give specific direction...'}
          </button>
        </div>

        <div className="text-[11px] text-stone-400 font-sans-ui">
          Tip: Highlight any sentence to iterate inline without copying to a chat box
        </div>
      </div>

      {/* Custom direction prompt input */}
      {showContinueInput && (
        <div className="mt-3 p-3 bg-stone-100/70 border border-stone-200/80 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={continueInstruction}
            onChange={e => setContinueInstruction(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') triggerContinueWriting();
            }}
            placeholder="e.g. Introduce a counter-argument examining the founder's dilemma..."
            className="w-full text-xs px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
          <button
            type="button"
            onClick={() => triggerContinueWriting()}
            disabled={continuing || !continueInstruction.trim()}
            className="px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            Co-write
          </button>
        </div>
      )}
    </div>
  );
};
