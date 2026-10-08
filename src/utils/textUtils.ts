export function calculateReadingStats(text: string) {
  const clean = text.trim();
  if (!clean) {
    return { words: 0, characters: 0, readingTimeMinutes: 0 };
  }
  const words = clean.split(/\s+/).filter(Boolean).length;
  const characters = clean.length;
  const readingTimeMinutes = Math.max(1, Math.round(words / 225));
  return { words, characters, readingTimeMinutes };
}

export interface WordDiffPart {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

// Simple word-level diff generator for visually reviewing inline rewrites
export function computeWordDiff(oldText: string, newText: string): WordDiffPart[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Fast common-subsequence comparison for clean editorial diffs
  const diff: WordDiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < oldWords.length && j < newWords.length) {
    if (oldWords[i] === newWords[j]) {
      diff.push({ type: 'unchanged', value: oldWords[i] });
      i++;
      j++;
    } else {
      // Look ahead for matching anchor
      const nextMatchInNew = newWords.indexOf(oldWords[i], j);
      const nextMatchInOld = oldWords.indexOf(newWords[j], i);

      if (nextMatchInNew !== -1 && (nextMatchInOld === -1 || nextMatchInNew - j <= nextMatchInOld - i)) {
        while (j < nextMatchInNew) {
          diff.push({ type: 'added', value: newWords[j] });
          j++;
        }
      } else if (nextMatchInOld !== -1) {
        while (i < nextMatchInOld) {
          diff.push({ type: 'removed', value: oldWords[i] });
          i++;
        }
      } else {
        diff.push({ type: 'removed', value: oldWords[i] });
        diff.push({ type: 'added', value: newWords[j] });
        i++;
        j++;
      }
    }
  }

  while (i < oldWords.length) {
    diff.push({ type: 'removed', value: oldWords[i] });
    i++;
  }

  while (j < newWords.length) {
    diff.push({ type: 'added', value: newWords[j] });
    j++;
  }

  return diff;
}

export function readFileAsAttachment(file: File): Promise<{
  name: string;
  size: number;
  mimeType: string;
  content?: string;
  data?: string;
}> {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          size: file.size,
          mimeType: file.type,
          data: reader.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'text/plain',
          content: reader.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}
