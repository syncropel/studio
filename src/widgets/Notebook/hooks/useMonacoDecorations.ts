// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useMonacoDecorations.ts
"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";

/**
 * A custom hook to manage all gutter icon decorations for a Syncropel Notebook.
 * This hook is responsible for correctly placing status-aware icons for each block
 * by iterating through the editor's text model.
 *
 * CHANGED: Added proper cleanup and synchronization with editor content changes
 * to prevent decorations from appearing at wrong positions when switching documents.
 */
export function useMonacoDecorations(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
) {
  const decorationsCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // CHANGED: Track the current page ID to detect page changes
  // Note: Using string | null | undefined to match ContextualPage.id type
  const currentPageIdRef = useRef<string | null | undefined>(null);

  // Effect to create the decorations collection once when the editor is mounted.
  useEffect(() => {
    if (editor && !decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editor.createDecorationsCollection();
    }
  }, [editor]);

  // CHANGED: Clear decorations immediately when page changes to null
  useEffect(() => {
    if (!currentPage && decorationsCollectionRef.current) {
      decorationsCollectionRef.current.clear();
      currentPageIdRef.current = null;
    }
  }, [currentPage]);

  // Main effect to update decorations when the page or results change.
  useEffect(() => {
    const collection = decorationsCollectionRef.current;
    if (!collection || !editor || !currentPage) {
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    // CHANGED: Detect if we've switched to a different page
    const pageChanged = currentPageIdRef.current !== currentPage.id;
    if (pageChanged) {
      // Clear immediately when switching pages
      collection.clear();
      currentPageIdRef.current = currentPage.id;
    }

    // CHANGED: Use requestAnimationFrame to ensure Monaco's model is fully updated
    // This prevents decorations from being calculated on stale content
    const frameId = requestAnimationFrame(() => {
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      // --- Decoration 1: Page-level "Run All" Button on Line 1 ---
      newDecorations.push({
        range: new monaco.Range(1, 1, 1, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: "gutter-icon glyph-run-all",
          glyphMarginHoverMessage: { value: "Run All Blocks" },
        },
      });

      // --- Iterate through the text model line by line to find block start locations ---
      for (let i = 1; i <= model.getLineCount(); i++) {
        const lineText = model.getLineContent(i);

        // A block's visual start is its ` ```yaml ` fence that contains a `cx_block: true` flag.
        if (lineText.trim().startsWith("```yaml")) {
          let blockId: string | null = null;
          let isCxBlock = false;

          // Scan the next few lines within the YAML block to find the ID and confirm it's a cx_block.
          for (let j = i + 1; j < i + 10 && j <= model.getLineCount(); j++) {
            const innerLine = model.getLineContent(j);
            if (innerLine.trim().startsWith("```")) break; // Reached end of metadata

            if (innerLine.includes("cx_block: true")) {
              isCxBlock = true;
            }

            const idMatch = innerLine.match(/^\s*id:\s*(\S+)/);
            if (idMatch) {
              blockId = idMatch[1];
            }

            // Once we have both, we can stop scanning this metadata block.
            if (blockId && isCxBlock) break;
          }

          // If we found a valid cx_block with an ID, create its decoration.
          if (blockId && isCxBlock) {
            const startLine = i; // The decoration goes on the ` ```yaml ` line.
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
              range: new monaco.Range(startLine, 1, startLine, 1),
              options: {
                isWholeLine: true,
                glyphMarginClassName: `gutter-icon ${className}`,
                glyphMarginHoverMessage: { value: `Run Block: ${blockId}` },
              },
            });
          }
        }
      }

      // CHANGED: Set decorations only after we've calculated them all
      collection.set(newDecorations);
    });

    // CHANGED: Cleanup function to cancel pending animation frame
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [editor, currentPage, blockResults]);

  // CHANGED: Add cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      if (decorationsCollectionRef.current) {
        decorationsCollectionRef.current.clear();
        decorationsCollectionRef.current = null;
      }
    };
  }, []);
}
