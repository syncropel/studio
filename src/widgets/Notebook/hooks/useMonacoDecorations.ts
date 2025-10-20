// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useMonacoDecorations.ts
"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";

/**
 * A custom hook to manage all gutter icon decorations for a Syncropel Notebook.
 * This hook is responsible for:
 * 1. Creating and managing a single, persistent decorations collection.
 * 2. Displaying a "Run All" icon at the top of the notebook.
 * 3. Displaying status-aware icons (run, running, success, error) for each block.
 * 4. Reactively updating these icons whenever block results change.
 *
 * @param editor The Monaco Editor instance, or null if not yet ready.
 * @param currentPage The currently loaded ContextualPage object.
 * @param blockResults A record of the current results for each block, used to determine icon state.
 */
export function useMonacoDecorations(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
) {
  const decorationsCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // This effect's only job is to create the decorations collection when the editor is mounted.
  useEffect(() => {
    if (editor && !decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editor.createDecorationsCollection();
    }
  }, [editor]);

  useEffect(() => {
    const collection = decorationsCollectionRef.current;
    if (!collection) return;

    if (!editor || !currentPage) {
      collection.clear();
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // --- Decoration 1: Page-level "Run All" Button on Line 1 ---
    newDecorations.push({
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        glyphMarginClassName: "gutter-icon glyph-run-all",
        glyphMarginHoverMessage: { value: "Run All Blocks" },
      },
    });

    // --- START: DEFINITIVE FIX FOR BLOCK DECORATION PLACEMENT ---
    // We iterate through the text model to find the correct line for each block's decoration.
    for (let i = 1; i <= model.getLineCount(); i++) {
      const lineText = model.getLineContent(i);

      // A block's visual start is its ` ```yaml ` fence.
      if (lineText.startsWith("```yaml")) {
        let blockId: string | null = null;
        // Look ahead a few lines to find the block's ID to confirm it's a cx_block.
        for (let j = i + 1; j < i + 10 && j <= model.getLineCount(); j++) {
          const innerLine = model.getLineContent(j);
          if (innerLine.startsWith("```")) break; // Reached end of metadata
          const match = innerLine.match(/^\s*id:\s*(\S+)/);
          if (match) {
            blockId = match[1];
            break;
          }
        }

        if (blockId) {
          // We found a valid cx_block. Place the decoration on the ` ```yaml ` line (line `i`).
          const startLine = i;
          const result = blockResults[blockId];
          let className = "glyph-run";
          if (result) {
            switch (result.status) {
              case "running":
                className = "glyph-running";
                break;
              case "success":
                className = "glyph-success";
                break;
              case "error":
                className = "glyph-error";
                break;
            }
          }
          newDecorations.push({
            range: {
              startLineNumber: startLine,
              startColumn: 1,
              endLineNumber: startLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              glyphMarginClassName: `gutter-icon ${className}`,
              glyphMarginHoverMessage: { value: `Run Block: ${blockId}` },
            },
          });
        }
      }
    }
    // --- END: DEFINITIVE FIX ---

    collection.set(newDecorations);
  }, [editor, currentPage, blockResults]);
}
