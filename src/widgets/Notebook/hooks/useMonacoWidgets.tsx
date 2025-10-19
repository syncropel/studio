// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useMonacoWidgets.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";
import { ManagedViewZoneWidget } from "../lib/ManagedViewZoneWidget";
import ParametersForm from "../ParametersForm";
import OutputViewer from "@/widgets/OutputViewer";

// --- Helper Functions ---

const findBlockEndLine = (
  model: monaco.editor.ITextModel,
  startLine: number
): number => {
  let fenceCount = 0;
  for (let i = startLine; i <= model.getLineCount(); i++) {
    if (model.getLineContent(i).startsWith("```")) {
      fenceCount++;
      if (fenceCount === 2) {
        // This is the end of the first code block (metadata), now find the second one
        for (let j = i + 1; j <= model.getLineCount(); j++) {
          if (model.getLineContent(j).startsWith("```")) {
            return j; // End of the actual code block
          }
        }
      }
    }
  }
  return startLine; // Fallback
};

const findFrontmatterEndLine = (model: monaco.editor.ITextModel): number => {
  if (!model.getLineContent(1).startsWith("---")) return 0;
  for (let i = 2; i <= model.getLineCount(); i++) {
    if (model.getLineContent(i).startsWith("---")) return i;
  }
  return 0;
};

/**
 * Determines a predictable, fixed height for a widget based on its content type.
 * This strategy prioritizes layout stability over pixel-perfect dynamic sizing.
 * @param result The BlockResult to analyze.
 * @returns A height in pixels.
 */
const getWidgetHeight = (result: BlockResult | undefined): number => {
  if (!result) return 0;

  switch (result.status) {
    case "running":
      return 60; // A small, fixed height for a loading spinner
    case "error":
      return 80; // A reasonable height for a typical error message
    case "success":
      if (result.output.data_ref) {
        // This is a "Claim Check" card, which has a consistent size.
        return 100;
      }
      if (result.output.inline_data) {
        // For any rendered content like tables or large JSON,
        // we provide a generous maximum height. The content inside will scroll.
        return 400;
      }
      return 60; // For a simple "Success (no output)" message
    default:
      return 0; // Don't render a zone for 'pending' or unknown statuses
  }
};

/**
 * A custom hook to manage all IViewZone widgets for a Syncropel Notebook.
 * This hook implements a stable, predictable-height strategy for rendering
 * interactive overlays.
 * @param editor The Monaco Editor instance, or null if not ready.
 * @param currentPage The currently loaded ContextualPage.
 * @param blockResults A record of the current results for each block.
 * @returns An array of React Portals to be rendered at the top level of the app.
 */
export function useMonacoWidgets(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
): React.ReactPortal[] {
  const widgetRefs = useRef<Map<string, ManagedViewZoneWidget>>(new Map());
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    // Guard Clause 1: If the editor isn't ready or there's no page, perform a full cleanup.
    if (!editor || !currentPage) {
      if (widgetRefs.current.size > 0) {
        widgetRefs.current.forEach((widget) => widget.dispose());
        widgetRefs.current.clear();
        setPortals([]);
      }
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const nextPortals: React.ReactPortal[] = [];
    const activeWidgetIds = new Set<string>();
    const editorContentWidth =
      editor.getLayoutInfo().contentWidth -
      editor.getLayoutInfo().verticalScrollbarWidth;

    // --- Widget for Page Parameters ---
    const frontmatterEndLine = findFrontmatterEndLine(model);
    if (
      currentPage.inputs &&
      Object.keys(currentPage.inputs).length > 0 &&
      frontmatterEndLine > 0
    ) {
      const widgetId = "page-parameters";
      activeWidgetIds.add(widgetId);
      const height = 150; // A generous fixed height for the parameters form

      let widget = widgetRefs.current.get(widgetId);
      if (!widget) {
        widget = new ManagedViewZoneWidget(
          editor,
          widgetId,
          frontmatterEndLine,
          height
        );
        widget.attach();
        widgetRefs.current.set(widgetId, widget);
      } else {
        widget.update(frontmatterEndLine, height);
      }

      const portalTarget = widget.getPortalTarget();
      portalTarget.style.width = `${editorContentWidth}px`;
      nextPortals.push(
        createPortal(
          <div className="output-view-zone with-scrolling">
            <ParametersForm />
          </div>,
          portalTarget,
          widgetId
        )
      );
    }

    // --- Widgets for Block Outputs ---
    currentPage.blocks.forEach((block) => {
      const blockId = block.id;
      const result = blockResults[blockId];

      if (result) {
        // Render a zone for any non-pending status
        const match = model.findNextMatch(
          `id: ${block.id}`,
          { lineNumber: 1, column: 1 },
          false,
          true,
          null,
          false
        );
        if (!match) return;

        activeWidgetIds.add(blockId);
        const endLine = findBlockEndLine(model, match.range.startLineNumber);
        const height = getWidgetHeight(result);

        if (height > 0) {
          let widget = widgetRefs.current.get(blockId);
          if (!widget) {
            widget = new ManagedViewZoneWidget(
              editor,
              blockId,
              endLine,
              height
            );
            widget.attach();
            widgetRefs.current.set(blockId, widget);
          } else {
            widget.update(endLine, height);
          }

          const portalTarget = widget.getPortalTarget();
          portalTarget.style.width = `${editorContentWidth}px`;
          nextPortals.push(
            createPortal(
              <div className="output-view-zone with-scrolling">
                <OutputViewer blockResult={result} />
              </div>,
              portalTarget,
              blockId
            )
          );
        }
      }
    });

    // --- Cleanup Stale Widgets ---
    [...widgetRefs.current.keys()].forEach((widgetId) => {
      if (!activeWidgetIds.has(widgetId)) {
        const widget = widgetRefs.current.get(widgetId);
        widget?.dispose();
        widgetRefs.current.delete(widgetId);
      }
    });

    setPortals(nextPortals);
  }, [editor, currentPage, blockResults]);

  return portals;
}
