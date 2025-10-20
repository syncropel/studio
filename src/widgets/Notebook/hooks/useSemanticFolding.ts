// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useSemanticFolding.ts
"use client";

import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[SemanticFolding] ${message}`, ...args);

// A flag to ensure we only register the provider once per application lifecycle.
// This prevents issues with React Strict Mode or fast refreshes.
let isProviderRegistered = false;

/**
 * Registers a custom, semantic folding range provider for the 'markdown' language in Monaco.
 * This function should be called ONCE, ideally from within the editor's onMount callback.
 * It overrides the default folding logic to be aware of our "Block Pair" structure.
 *
 * @param monacoInstance The top-level `monaco` object provided by `@monaco-editor/react`.
 */
export function registerSemanticFolding(monacoInstance: typeof monaco) {
  if (isProviderRegistered) {
    log("Provider already registered. Skipping.");
    return;
  }

  log("Registering semantic folding provider...");

  monacoInstance.languages.registerFoldingRangeProvider("markdown", {
    provideFoldingRanges: (model, context, token) => {
      log("`provideFoldingRanges` called by Monaco.");

      const ranges: monaco.languages.FoldingRange[] = [];
      const lineCount = model.getLineCount();

      // --- 1. Find and add the frontmatter folding range ---
      if (lineCount > 1 && model.getLineContent(1).trim() === "---") {
        for (let i = 2; i <= lineCount; i++) {
          if (model.getLineContent(i).trim() === "---") {
            ranges.push({
              start: 1,
              end: i,
              kind: monaco.languages.FoldingRangeKind.Region,
            });
            break;
          }
        }
      }

      // --- 2. Find and add all fenced code block ranges ---
      let i = 1;
      while (i <= lineCount) {
        // Check if the current line starts a fenced block and is not inside the frontmatter
        // (This check is implicitly handled by the loop structure, but good to be aware of)
        if (model.getLineContent(i).startsWith("```")) {
          const startLine = i;
          let endLine = -1;
          for (let j = startLine + 1; j <= lineCount; j++) {
            if (model.getLineContent(j).startsWith("```")) {
              endLine = j;
              break;
            }
          }
          if (endLine !== -1) {
            ranges.push({
              start: startLine,
              end: endLine,
              kind: monaco.languages.FoldingRangeKind.Region,
            });
            i = endLine + 1; // Jump the loop past this entire block
          } else {
            i++; // Malformed block, move on
          }
        } else {
          i++; // Not a fence line, move on
        }
      }

      log(`Returning ${ranges.length} semantic folding ranges.`);
      return ranges;
    },
  });

  isProviderRegistered = true;
  log("Provider registration complete.");
}
