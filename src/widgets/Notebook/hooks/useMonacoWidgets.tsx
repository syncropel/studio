// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useMonacoWidgets.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { ContextualPage, BlockResult } from "@/shared/types/notebook";
import { ManagedViewZoneWidget } from "../lib/ManagedViewZoneWidget";
import ParametersForm from "../ParametersForm";
import OutputViewer from "@/widgets/OutputViewer";

const log = (message: string, ...args: any[]) =>
  console.log(`[useMonacoWidgets] ${message}`, ...args);

// --- Helper Functions ---

/**
 * Finds the end line of a code block in the notebook format.
 * Notebook blocks have two code fences: one for metadata, one for actual code.
 *
 * @param model - The Monaco editor text model
 * @param startLine - The line number where the block starts
 * @returns The line number where the code block ends
 */
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
  return startLine; // Fallback to start line if structure is malformed
};

/**
 * Finds the end line of YAML frontmatter in the notebook.
 * Frontmatter is delimited by --- markers.
 *
 * @param model - The Monaco editor text model
 * @returns The line number where frontmatter ends, or 0 if no frontmatter exists
 */
const findFrontmatterEndLine = (model: monaco.editor.ITextModel): number => {
  // Check if the first line starts with frontmatter delimiter
  if (!model.getLineContent(1).startsWith("---")) return 0;

  // Find the closing delimiter
  for (let i = 2; i <= model.getLineCount(); i++) {
    if (model.getLineContent(i).startsWith("---")) return i;
  }

  return 0; // No closing delimiter found
};

/**
 * Determines the initial height for a widget before ResizeObserver takes over.
 * This provides a reasonable starting point to avoid flash of collapsed content.
 *
 * For dynamic height widgets, this is just the initial size - the ResizeObserver
 * will adjust it based on actual rendered content.
 *
 * @param result - The block execution result
 * @returns Initial height in pixels
 */
const getInitialWidgetHeight = (result: BlockResult | undefined): number => {
  if (!result) return 200; // Default for unknown state

  switch (result.status) {
    case "running":
      // Small, fixed height for loading spinner
      return 80;

    case "error":
      // Reasonable height for error messages (will grow if needed)
      return 150;

    case "success":
      if (result.output.data_ref) {
        // "Claim Check" card has consistent size
        return 120;
      }
      if (result.output.inline_data) {
        // Large initial size for tables, JSON, etc. (will adjust dynamically)
        return 300;
      }
      // Simple success message
      return 80;

    default:
      // Pending or unknown status
      return 200;
  }
};

/**
 * A custom hook to manage all IViewZone widgets for a Syncropel Notebook.
 *
 * This hook orchestrates the creation, updates, and cleanup of interactive
 * overlays in the Monaco Editor. It supports two rendering strategies:
 *
 * 1. **Fixed Height**: Used for UI elements with predictable sizes (e.g., parameter forms)
 * 2. **Dynamic Height**: Used for content with variable sizes (e.g., execution outputs)
 *
 * Dynamic height widgets use a debounced ResizeObserver to automatically adjust
 * their height based on rendered content, with configurable min/max constraints.
 *
 * @param editor - The Monaco Editor instance, or null if not ready
 * @param currentPage - The currently loaded ContextualPage
 * @param blockResults - A record of execution results for each block
 * @returns An array of React Portals to be rendered at the top level of the app
 */
export function useMonacoWidgets(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  currentPage: ContextualPage | null,
  blockResults: Record<string, BlockResult | undefined>
): React.ReactPortal[] {
  // Store references to all active widgets for lifecycle management
  const widgetRefs = useRef<Map<string, ManagedViewZoneWidget>>(new Map());

  // React portals that will be rendered at the component's root
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    // ============================================================
    // GUARD CLAUSE 1: Editor or Page Not Ready
    // ============================================================
    if (!editor || !currentPage) {
      // Perform full cleanup if we previously had widgets
      if (widgetRefs.current.size > 0) {
        log("Editor or page not ready. Cleaning up all widgets.");
        widgetRefs.current.forEach((widget) => widget.dispose());
        widgetRefs.current.clear();
        setPortals([]);
      }
      return;
    }

    const model = editor.getModel();
    if (!model) {
      log("No editor model available.");
      return;
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    const nextPortals: React.ReactPortal[] = [];
    const activeWidgetIds = new Set<string>();

    // Calculate available width for widgets (accounting for scrollbar)
    const editorContentWidth =
      editor.getLayoutInfo().contentWidth -
      editor.getLayoutInfo().verticalScrollbarWidth;

    log(`Processing widgets for page: ${currentPage.id}`);

    // ============================================================
    // WIDGET 1: PAGE PARAMETERS FORM (Fixed Height)
    // ============================================================
    const frontmatterEndLine = findFrontmatterEndLine(model);

    if (
      currentPage.inputs &&
      Object.keys(currentPage.inputs).length > 0 &&
      frontmatterEndLine > 0
    ) {
      const widgetId = "page-parameters";
      activeWidgetIds.add(widgetId);

      // Fixed height for stability - forms don't need dynamic sizing
      const height = 150;

      let widget = widgetRefs.current.get(widgetId);

      if (!widget) {
        // Create new widget with fixed height configuration
        log(`Creating page parameters widget with fixed height: ${height}px`);
        widget = new ManagedViewZoneWidget(
          editor,
          widgetId,
          frontmatterEndLine,
          height,
          {
            dynamicHeight: false, // Fixed height for stability
          }
        );
        widget.attach();
        widgetRefs.current.set(widgetId, widget);
      } else {
        // Update existing widget (line number might have changed)
        widget.update(frontmatterEndLine, height);
      }

      // Configure portal target styling
      const portalTarget = widget.getPortalTarget();
      portalTarget.style.width = `${editorContentWidth}px`;
      portalTarget.style.pointerEvents = "auto"; // Ensure interactivity

      // Create portal with ParametersForm
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

    // ============================================================
    // WIDGET 2: BLOCK OUTPUT VIEWERS (Dynamic Height)
    // ============================================================
    currentPage.blocks.forEach((block) => {
      const blockId = block.id;
      const result = blockResults[blockId];

      // Only render widgets for blocks with results
      if (!result) {
        return;
      }

      // Find the block's position in the document
      const match = model.findNextMatch(
        `id: ${block.id}`,
        { lineNumber: 1, column: 1 },
        false, // isRegex
        true, // matchCase
        null, // wordSeparators
        false // captureMatches
      );

      if (!match) {
        log(`Could not find block ${blockId} in document`);
        return;
      }

      activeWidgetIds.add(blockId);

      // Find where this block ends (after its code fence)
      const endLine = findBlockEndLine(model, match.range.startLineNumber);

      // Get appropriate initial height based on result type
      const initialHeight = getInitialWidgetHeight(result);

      let widget = widgetRefs.current.get(blockId);

      if (!widget) {
        // Create new widget with dynamic height configuration
        log(
          `Creating output widget for block ${blockId} with dynamic height (initial: ${initialHeight}px)`
        );
        widget = new ManagedViewZoneWidget(
          editor,
          blockId,
          endLine,
          initialHeight,
          {
            dynamicHeight: true, // Enable ResizeObserver
            minHeight: 60, // Don't collapse below this
            maxHeight: 600, // Don't expand beyond this (prevents excessive growth)
            debounceMs: 150, // Wait 150ms after resize stops before updating
            heightThreshold: 5, // Only update if height changes by 5+ pixels
          }
        );
        widget.attach();
        widgetRefs.current.set(blockId, widget);
      } else {
        // Update existing widget
        // For dynamic height widgets, we only update line number
        // The ResizeObserver handles height automatically
        widget.update(endLine);
      }

      // Configure portal target styling
      const portalTarget = widget.getPortalTarget();
      portalTarget.style.width = `${editorContentWidth}px`;
      portalTarget.style.pointerEvents = "auto"; // Ensure interactivity

      // Create portal with OutputViewer
      nextPortals.push(
        createPortal(
          <div className="output-view-zone with-scrolling">
            <OutputViewer blockResult={result} />
          </div>,
          portalTarget,
          blockId
        )
      );
    });

    // ============================================================
    // CLEANUP: Remove Stale Widgets
    // ============================================================
    const staleWidgets: string[] = [];

    [...widgetRefs.current.keys()].forEach((widgetId) => {
      if (!activeWidgetIds.has(widgetId)) {
        staleWidgets.push(widgetId);
        const widget = widgetRefs.current.get(widgetId);
        widget?.dispose();
        widgetRefs.current.delete(widgetId);
      }
    });

    if (staleWidgets.length > 0) {
      log(
        `Cleaned up ${staleWidgets.length} stale widgets: ${staleWidgets.join(
          ", "
        )}`
      );
    }

    // ============================================================
    // FINALIZATION: Update Portals
    // ============================================================
    log(
      `Created ${nextPortals.length} portals for ${activeWidgetIds.size} active widgets`
    );
    setPortals(nextPortals);
  }, [editor, currentPage, blockResults]);

  return portals;
}
