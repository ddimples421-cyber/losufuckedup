import React, { useState } from 'react';
import { Sparkles, Focus, FileDown, History, Copy, Check, Plus, BookOpen, Layers } from 'lucide-react';
import { DocumentState, ProactiveSuggestion } from '../types';
import { calculateReadingStats } from '../utils/textUtils';

interface HeaderBarProps {
  document: DocumentState;
  allDocuments: DocumentState[];
  onSelectDocument: (doc: DocumentState) => void;
  onNewBlankDoc: () => void;
  onOpenSparkModal: () => void;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  proactiveCount: number;
  onToggleProactive: () => void;
  proactiveOpen: boolean;
  onRestoreSnapshot?: () => void;
  historyCount: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  document,
  allDocuments,
  onSelectDocument,
  onNewBlankDoc,
  onOpenSparkModal,
  onToggleFocusMode,
  focusMode,
  proactiveCount,
  onToggleProactive,
  proactiveOpen,
  onRestoreSnapshot,
  historyCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);

  const stats = calculateReadingStats(document.content);

  const handleCopyMarkdown = () => {
    const fullText = `# ${document.title}\n\n${document.content}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportText = () => {
    const blob = new Blob([`# ${document.title}\n\n${document.content}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'draft'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-14 border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
      {/* Left: Brand & Doc Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display-title text-xl tracking-tight text-stone-900 font-normal">
            Cadence
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-wider text-stone-400">
            / Thought Partner
          </span>
        </div>

        {/* Document Switcher Dropdown */}
        <div className="relative ml-2">
          <button
            onClick={() => setDocDropdownOpen(!docDropdownOpen)}
            className="flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-950 font-medium px-2 py-1 rounded-md hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">{document.title || 'Untitled'}</span>
          </button>

          {docDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5 z-50 text-xs"
              onClick={() => setDocDropdownOpen(false)}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider text-stone-400 px-2 py-1">
                Your Drafts & Essays
              </div>
              {allDocuments.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate block ${
                    doc.id === document.id ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {doc.title}
                </button>
              ))}
              <div className="border-t border-stone-100 my-1 pt-1">
                <button
                  onClick={onNewBlankDoc}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-stone-600 hover:bg-stone-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-400" />
                  <span>New Blank Draft</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Reading Stats */}
      <div className="hidden md:flex items-center gap-2 text-xs text-stone-400">
        <span>{stats.words} words</span>
        <span aria-hidden="true">·</span>
        <span>{stats.readingTimeMinutes} min read</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Focus Mode */}
        <button
          onClick={onToggleFocusMode}
          title={focusMode ? 'Exit Focus Mode' : 'Focus Mode (dims other paragraphs)'}
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            focusMode
              ? 'bg-amber-100 text-amber-900'
              : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
          }`}
        >
          <Focus className="w-4 h-4" />
        </button>

        {/* Proactive Co-Pilot Margin Toggle */}
        <button
          onClick={onToggleProactive}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            proactiveOpen
              ? 'bg-stone-900 text-stone-50'
              : 'text-stone-700 hover:bg-stone-100 border border-stone-200/80 bg-white shadow-2xs'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${proactiveOpen ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="hidden sm:inline">Margin Notes</span>
          {proactiveCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                proactiveOpen ? 'bg-amber-400 text-stone-900' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {proactiveCount}
            </span>
          )}
        </button>

        {/* Copy / Export */}
        <button
          onClick={handleCopyMarkdown}
          title="Copy Markdown"
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          onClick={handleExportText}
          title="Download as .md file"
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
        </button>

        {/* Primary CTA: Spark Draft with AI & Files */}
        <button
          onClick={onOpenSparkModal}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ml-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Draft with AI & Files</span>
          <span className="sm:hidden">Draft</span>
        </button>
      </div>
    </header>
  );
};
