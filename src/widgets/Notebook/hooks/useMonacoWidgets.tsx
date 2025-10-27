// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useMonacoWidgets.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";
import { ManagedViewZoneWidget } from "../lib/ManagedViewZoneWidget";
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

const getWidgetHeight = (result: BlockResult | undefined): number => {
  if (!result) return 0;
  switch (result.status) {
    case "running":
      return 60;
    case "error":
      return 80;
    case "success":
      if (result.output.data_ref) return 100;
      if (result.output.inline_data) return 400; // Max height, content will scroll
      return 60;
    default:
      return 0;
  }
};

/**
 * A custom hook to manage all IViewZone widgets for Block Outputs.
 * The logic for rendering forms has been moved to useFoldingWidgets.
 */
export function useMonacoWidgets(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
): React.ReactPortal[] {
  const widgetRefs = useRef<Map<string, ManagedViewZoneWidget>>(new Map());
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    // Guard Clause: If editor isn't ready or no page, perform a full cleanup.
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

    // --- RENDER OUTPUT WIDGETS ---
    Object.entries(blockResults).forEach(([blockId, result]) => {
      if (
        result &&
        (result.status === "success" ||
          result.status === "error" ||
          result.status === "running")
      ) {
        const match = model.findNextMatch(
          `id: ${blockId}`,
          { lineNumber: 1, column: 1 },
          false,
          true,
          null,
          false
        );
        if (!match) return;

        const widgetId = `output-${blockId}`;
        activeWidgetIds.add(widgetId);
        const endLine = findBlockEndLine(model, match.range.startLineNumber);
        const height = getWidgetHeight(result);

        if (height > 0) {
          let widget = widgetRefs.current.get(widgetId);
          if (!widget) {
            widget = new ManagedViewZoneWidget(
              editor,
              widgetId,
              endLine,
              height,
              { dynamicHeight: true }
            );
            widget.attach();
            widgetRefs.current.set(widgetId, widget);
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
              widgetId
            )
          );
        }
      }
    });

    // --- Cleanup Stale Widgets ---
    widgetRefs.current.forEach((widget, widgetId) => {
      if (!activeWidgetIds.has(widgetId)) {
        widget.dispose();
        widgetRefs.current.delete(widgetId);
      }
    });

    setPortals(nextPortals);
  }, [editor, currentPage, blockResults]);

  return portals;
}
