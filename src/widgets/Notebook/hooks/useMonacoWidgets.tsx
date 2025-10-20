"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
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
 * This includes both block outputs and on-demand forms for parameters/config.
 */
export function useMonacoWidgets(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
): React.ReactPortal[] {
  const widgetRefs = useRef<Map<string, ManagedViewZoneWidget>>(new Map());
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);

  // CHANGE: Track the previous page to detect page changes
  const prevPageRef = useRef<string | null>(null);

  // Subscribe to the global state that controls form visibility.
  const { activeFormWidgetIds, closeAllFormWidgets } = useUIStateStore();

  // CHANGE: Separate effect to handle page changes and form cleanup
  // This prevents the infinite loop by not depending on activeFormWidgetIds
  useEffect(() => {
    const currentPageId = currentPage?.id || null;

    // Only close forms when the page actually changes (not on every render)
    if (prevPageRef.current !== null && prevPageRef.current !== currentPageId) {
      closeAllFormWidgets();
    }

    // Update the ref to track the current page
    prevPageRef.current = currentPageId;
  }, [currentPage?.id, closeAllFormWidgets]);

  // CHANGE: Main effect for widget management
  // This effect now only depends on the data it needs, not on closeAllFormWidgets
  useEffect(() => {
    // Guard Clause 1: If the editor isn't ready or there's no page, perform a full cleanup.
    if (!editor || !currentPage) {
      if (widgetRefs.current.size > 0) {
        widgetRefs.current.forEach((widget) => widget.dispose());
        widgetRefs.current.clear();
        setPortals([]);
      }
      // CHANGE: Removed closeAllFormWidgets() call from here to prevent infinite loop
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const nextPortals: React.ReactPortal[] = [];
    const activeWidgetIds = new Set<string>();
    const editorContentWidth =
      editor.getLayoutInfo().contentWidth -
      editor.getLayoutInfo().verticalScrollbarWidth;

    // --- RENDER ACTIVE FORM WIDGETS ---
    // Iterate over the set of form IDs that should be visible.
    activeFormWidgetIds.forEach((widgetId) => {
      let position: number | null = null;
      let component: React.ReactNode | null = null;
      let height = 150; // Default height for forms

      if (widgetId === "page-parameters") {
        position = findFrontmatterEndLine(model);
        component = <ParametersForm />;
        height = 150;
      } else if (widgetId.startsWith("config-")) {
        // TODO: Logic for block config forms will go here in the future.
        // const blockId = widgetId.replace('config-', '');
        // position = ... find block position ...
        // component = <BlockConfigForm blockId={blockId} />;
      }

      if (position && component) {
        activeWidgetIds.add(widgetId);
        let widget = widgetRefs.current.get(widgetId);
        if (!widget) {
          widget = new ManagedViewZoneWidget(
            editor,
            widgetId,
            position,
            height
          );
          widget.attach();
          widgetRefs.current.set(widgetId, widget);
        } else {
          widget.update(position, height);
        }
        const portalTarget = widget.getPortalTarget();
        portalTarget.style.width = `${editorContentWidth}px`;
        nextPortals.push(
          createPortal(
            <div className="output-view-zone with-scrolling">{component}</div>,
            portalTarget,
            widgetId
          )
        );
      }
    });

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

        // Use a unique ID for output widgets to avoid conflicts with form widgets
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
              height
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
    // Iterate over a copy of the keys to safely delete from the map while iterating.
    [...widgetRefs.current.keys()].forEach((widgetId) => {
      if (!activeWidgetIds.has(widgetId)) {
        widgetRefs.current.get(widgetId)?.dispose();
        widgetRefs.current.delete(widgetId);
      }
    });

    setPortals(nextPortals);

    // CHANGE: Removed closeAllFormWidgets from this dependency array
    // It's now handled in a separate effect above
  }, [editor, currentPage, blockResults, activeFormWidgetIds]);

  return portals;
}
