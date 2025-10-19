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

  // This is the main effect for calculating and applying all decorations.
  // It re-runs whenever the page or any block result changes.
  useEffect(() => {
    const collection = decorationsCollectionRef.current;

    // Guard Clause 1: If the collection isn't ready, do nothing.
    if (!collection) {
      return;
    }

    // Guard Clause 2: If there's no page or editor, clear any old decorations and exit.
    if (!editor || !currentPage) {
      collection.clear();
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    // Start with a fresh array for the new set of decorations.
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // --- Decoration 1: Page-level "Run All" Button ---
    newDecorations.push({
      range: {
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        glyphMarginClassName: "gutter-icon glyph-run-all",
        glyphMarginHoverMessage: { value: "Run All Blocks" },
      },
    });

    // --- Decoration 2: Block-level Status Icons ---
    currentPage.blocks.forEach((block) => {
      // Find the precise line number for each block's ID in the text.
      const match = model.findNextMatch(
        `id: ${block.id}`,
        { lineNumber: 1, column: 1 },
        false,
        true,
        null,
        false
      );

      if (match) {
        const startLine = match.range.startLineNumber;
        const result = blockResults[block.id];
        let className = "glyph-run"; // Default "play" icon

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
            glyphMarginHoverMessage: { value: `Run Block: ${block.id}` },
          },
        });
      }
    });

    // Atomically update the editor with the new set of decorations.
    // The collection handles diffing and removing old ones automatically.
    collection.set(newDecorations);
  }, [editor, currentPage, blockResults]);
}
