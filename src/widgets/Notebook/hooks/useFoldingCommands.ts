// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useFoldingCommands.ts
"use client";

import { useCallback } from "react";
import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[useFoldingCommands] ${message}`, ...args);

/**
 * A hook that provides stable functions to programmatically control folding
 * within a Monaco editor instance, respecting custom folding ranges.
 * @param editor The Monaco Editor instance.
 * @returns An object with folding command functions.
 */
export function useFoldingCommands(
  editor: monaco.editor.IStandaloneCodeEditor | null
) {
  /**
   * Helper function to get the internal FoldingController and its current ranges.
   * This uses an internal API but is a well-known pattern for this functionality.
   */
  const getFoldingModel = () => {
    if (!editor) return null;
    const controller = (editor as any).getContribution(
      "editor.contrib.folding"
    );
    return controller?.getFoldingModel();
  };

  /**
   * Collapses all regions provided by our custom FoldingRangeProvider.
   */
  const collapseAll = useCallback(() => {
    if (!editor) return;
    log("Executing: collapseAll");
    const foldingModel = getFoldingModel();
    if (foldingModel) {
      const regionCount = foldingModel.regions.length;
      editor.setSelections([]); // Clear selections to avoid weird behavior
      foldingModel.toggleCollapseState(0, regionCount); // This is an efficient way to collapse all
    }
  }, [editor]);

  /**
   * Expands all regions provided by our custom FoldingRangeProvider.
   */
  const expandAll = useCallback(() => {
    if (!editor) return;
    log("Executing: expandAll");
    const foldingModel = getFoldingModel();
    if (foldingModel) {
      const regionCount = foldingModel.regions.length;
      const lineNumbersToExpand = [];
      for (let i = 0; i < regionCount; i++) {
        if (foldingModel.regions.isCollapsed(i)) {
          lineNumbersToExpand.push(foldingModel.regions.getStartLineNumber(i));
        }
      }
      if (lineNumbersToExpand.length > 0) {
        editor.setSelections([]);
        editor
          .getAction("editor.unfold")
          ?.run({ selectionLines: lineNumbersToExpand });
      }
    }
  }, [editor]);

  return { collapseAll, expandAll };
}
