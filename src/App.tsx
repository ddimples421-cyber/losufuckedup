import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentState, ProactiveSuggestion, WeaveScope, DocumentSnapshot } from './types';
import { SAMPLE_DOCUMENTS } from './sampleDocuments';
import { HeaderBar } from './components/HeaderBar';
import { EditorCanvas } from './components/EditorCanvas';
import { InlineCopilotBubble } from './components/InlineCopilotBubble';
import { ProactivePanel } from './components/ProactivePanel';
import { SparkDraftModal } from './components/SparkDraftModal';
import { SuggestionModal } from './components/SuggestionModal';
import { Check, Undo2, RotateCcw } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<DocumentState[]>(() => {
    const saved = localStorage.getItem('cadence_docs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return SAMPLE_DOCUMENTS;
  });

  const [currentDocId, setCurrentDocId] = useState<string>(SAMPLE_DOCUMENTS[0].id);

  const currentDocument = documents.find(d => d.id === currentDocId) || documents[0];

  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);

  // Proactive Sidebar
  const [proactiveOpen, setProactiveOpen] = useState(true);
  const [ambientMode, setAmbientMode] = useState(true);
  const [isScanningProactive, setIsScanningProactive] = useState(false);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [activeSnippetHighlight, setActiveSnippetHighlight] = useState<string | null>(null);

  // Modals & Popups
  const [isSparkModalOpen, setIsSparkModalOpen] = useState(false);
  const [activeSuggestionModal, setActiveSuggestionModal] = useState<ProactiveSuggestion | null>(null);

  // Inline Copilot Bubble
  const [inlineBubble, setInlineBubble] = useState<{
    isOpen: boolean;
    selectedText: string;
    paragraphContext: string;
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    selectedText: '',
    paragraphContext: '',
    position: null,
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist documents to localStorage
  useEffect(() => {
    localStorage.setItem('cadence_docs', JSON.stringify(documents));
  }, [documents]);

  const updateCurrentDoc = useCallback(
    (updater: Partial<DocumentState>) => {
      setDocuments(prev =>
        prev.map(doc => {
          if (doc.id === currentDocId) {
            return {
              ...doc,
              ...updater,
              updatedAt: Date.now(),
            };
          }
          return doc;
        })
      );
    },
    [currentDocId]
  );

  const createSnapshot = (note: string) => {
    const newSnapshot: DocumentSnapshot = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      title: currentDocument.title,
      content: currentDocument.content,
      note,
    };
    setSnapshots(prev => [newSnapshot, ...prev.slice(0, 15)]);
  };

  const handleRestoreSnapshot = () => {
    if (snapshots.length === 0) return;
    const latest = snapshots[0];
    updateCurrentDoc({
      title: latest.title,
      content: latest.content,
    });
    setSnapshots(prev => prev.slice(1));
    showToast(`Restored version: "${latest.note}"`);
  };

  // Proactive Scan Engine
  const runProactiveScan = useCallback(async () => {
    if (!currentDocument.content || currentDocument.content.trim().length < 50) return;

    setIsScanningProactive(true);
    try {
      const res = await fetch('/api/proactive-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: currentDocument.title,
          content: currentDocument.content,
        }),
      });

      const data = await res.json();
      if (data.suggestions) {
        setProactiveSuggestions(
          data.suggestions.map((s: any) => ({
            ...s,
            status: 'pending',
          }))
        );
      }
    } catch (err) {
      console.error('Proactive scan error:', err);
    } finally {
      setIsScanningProactive(false);
    }
  }, [currentDocument.title, currentDocument.content]);

  // Initial scan on load or doc change
  useEffect(() => {
    const timer = setTimeout(() => {
      runProactiveScan();
    }, 1200);
    return () => clearTimeout(timer);
  }, [currentDocId]);

  // Ambient debounce when editing pauses
  const ambientTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleContentChange = (newContent: string) => {
    updateCurrentDoc({ content: newContent });

    if (ambientMode) {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = setTimeout(() => {
        runProactiveScan();
      }, 4500); // Trigger ambient review after 4.5 seconds of writing stillness
    }
  };

  const handleApplyInlineChange = (replacement: string, scope: WeaveScope) => {
    createSnapshot(`Inline change (${scope})`);

    if (scope === 'document') {
      updateCurrentDoc({ content: replacement });
      showToast('Wove revision throughout entire document');
    } else if (scope === 'paragraph') {
      const targetPara = inlineBubble.paragraphContext;
      if (currentDocument.content.includes(targetPara)) {
        const updated = currentDocument.content.replace(targetPara, replacement);
        updateCurrentDoc({ content: updated });
        showToast('Wove revision smoothly into paragraph');
      } else {
        // Fallback to substring replace
        const updated = currentDocument.content.replace(inlineBubble.selectedText, replacement);
        updateCurrentDoc({ content: updated });
        showToast('Applied inline replacement');
      }
    } else {
      // Selection only
      const updated = currentDocument.content.replace(inlineBubble.selectedText, replacement);
      updateCurrentDoc({ content: updated });
      showToast('Applied inline replacement');
    }

    setInlineBubble(prev => ({ ...prev, isOpen: false }));
  };

  const handleApplyProactiveSuggestion = (suggestion: ProactiveSuggestion) => {
    createSnapshot(`Applied suggestion: ${suggestion.category}`);

    if (currentDocument.content.includes(suggestion.targetSnippet)) {
      const updated = currentDocument.content.replace(
        suggestion.targetSnippet,
        suggestion.suggestedReplacement
      );
      updateCurrentDoc({ content: updated });

      // Mark suggestion as applied
      setProactiveSuggestions(prev =>
        prev.map(s => (s.id === suggestion.id ? { ...s, status: 'applied' } : s))
      );
      showToast(`Applied ${suggestion.category} improvement inline`);
    } else {
      showToast('Could not locate original snippet; text may have changed.');
    }
  };

  const handleDismissProactiveSuggestion = (id: string) => {
    setProactiveSuggestions(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'dismissed' } : s))
    );
  };

  const handleDraftCreated = (draft: {
    title: string;
    content: string;
    summary?: string;
    editorialNotes?: string;
  }) => {
    const newDoc: DocumentState = {
      id: Math.random().toString(36).substring(2, 9),
      title: draft.title,
      content: draft.content,
      summary: draft.summary,
      editorialNotes: draft.editorialNotes,
      updatedAt: Date.now(),
    };

    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);
    setProactiveSuggestions([]);
    showToast('Synthesized new draft with thought partner');
  };

  const handleNewBlankDoc = () => {
    const blankDoc: DocumentState = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'Untitled Draft',
      content: 'Start writing your opening thesis here...',
      updatedAt: Date.now(),
    };
    setDocuments(prev => [blankDoc, ...prev]);
    setCurrentDocId(blankDoc.id);
    setProactiveSuggestions([]);
  };

  const pendingCount = proactiveSuggestions.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans-ui selection:bg-amber-200 selection:text-stone-900">
      {/* Top Header Navigation */}
      <HeaderBar
        document={currentDocument}
        allDocuments={documents}
        onSelectDocument={doc => {
          setCurrentDocId(doc.id);
          setProactiveSuggestions([]);
        }}
        onNewBlankDoc={handleNewBlankDoc}
        onOpenSparkModal={() => setIsSparkModalOpen(true)}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
        focusMode={focusMode}
        proactiveCount={pendingCount}
        onToggleProactive={() => setProactiveOpen(!proactiveOpen)}
        proactiveOpen={proactiveOpen}
        onRestoreSnapshot={handleRestoreSnapshot}
        historyCount={snapshots.length}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Undo Floating Pill if snapshots available */}
        {snapshots.length > 0 && (
          <div className="fixed bottom-5 left-6 z-30 animate-in fade-in duration-200">
            <button
              onClick={handleRestoreSnapshot}
              className="bg-stone-900/90 hover:bg-stone-900 text-stone-100 text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Undo: {snapshots[0].note}</span>
            </button>
          </div>
        )}

        {/* Editor Writing Area */}
        <main className="flex-1 overflow-y-auto relative">
          <EditorCanvas
            document={currentDocument}
            onChangeTitle={title => updateCurrentDoc({ title })}
            onChangeContent={handleContentChange}
            onOpenInlineBubble={({ selectedText, paragraphContext, position }) => {
              setInlineBubble({
                isOpen: true,
                selectedText,
                paragraphContext,
                position,
              });
            }}
            activeSnippetHighlight={activeSnippetHighlight}
            proactiveSuggestions={proactiveSuggestions}
            onSelectSuggestion={suggestion => setActiveSuggestionModal(suggestion)}
            focusMode={focusMode}
          />
        </main>

        {/* Proactive Co-Pilot Panel */}
        <ProactivePanel
          isOpen={proactiveOpen}
          onClose={() => setProactiveOpen(false)}
          suggestions={proactiveSuggestions}
          isScanning={isScanningProactive}
          ambientMode={ambientMode}
          onToggleAmbient={() => setAmbientMode(!ambientMode)}
          onScanNow={runProactiveScan}
          onApplySuggestion={handleApplyProactiveSuggestion}
          onDismissSuggestion={handleDismissProactiveSuggestion}
          onHighlightSnippet={snippet => setActiveSnippetHighlight(snippet)}
        />
      </div>

      {/* Floating Inline Copilot Bubble */}
      {inlineBubble.isOpen && (
        <InlineCopilotBubble
          selectedText={inlineBubble.selectedText}
          paragraphContext={inlineBubble.paragraphContext}
          fullDocument={currentDocument.content}
          documentTitle={currentDocument.title}
          position={inlineBubble.position}
          onApplyChange={handleApplyInlineChange}
          onClose={() => setInlineBubble(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Spark Draft with AI & Files Modal */}
      <SparkDraftModal
        isOpen={isSparkModalOpen}
        onClose={() => setIsSparkModalOpen(false)}
        onDraftCreated={handleDraftCreated}
      />

      {/* Suggestion Review Modal */}
      <SuggestionModal
        suggestion={activeSuggestionModal}
        onClose={() => setActiveSuggestionModal(null)}
        onApply={handleApplyProactiveSuggestion}
        onDismiss={handleDismissProactiveSuggestion}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-50 px-4 py-2 rounded-xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
