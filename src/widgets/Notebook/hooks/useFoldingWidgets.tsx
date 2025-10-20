// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/hooks/useFoldingWidgets.tsx
"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { ManagedFoldingWidget } from "../lib/ManagedFoldingWidget";
import ActionableSummaryWidget from "../components/ActionableSummaryWidget";

const log = (message: string, ...args: any[]) =>
  console.log(`[useFoldingWidgets] ${message}`, ...args);

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
 * A hook to manage the lifecycle of "Actionable Summary" widgets that appear
 * over collapsed folding regions in the Monaco Editor.
 * @param editor The Monaco Editor instance.
 * @returns An array of React Portals for the summary widgets.
 */
export function useFoldingWidgets(
  editor: monaco.editor.IStandaloneCodeEditor | null
): React.ReactPortal[] {
  const { currentPage } = useSessionStore();
  const { activeFormWidgetIds, toggleFormWidget } = useUIStateStore();
  const widgetRefs = useRef<Map<string, ManagedFoldingWidget>>(new Map());
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);
  const disposableRef = useRef<monaco.IDisposable | null>(null);
  const layoutDisposableRef = useRef<monaco.IDisposable | null>(null);

  const updateWidgets = useCallback(() => {
    if (!editor || !currentPage) return;

    const foldingController = (editor as any).getContribution(
      "editor.contrib.folding"
    );
    if (!foldingController) return;

    foldingController.getFoldingModel().then((foldingModel: any) => {
      if (!foldingModel) return;

      const newPortals: React.ReactPortal[] = [];
      const activeWidgets = new Set<string>();
      const regions = foldingModel.regions;
      const model = editor.getModel();
      if (!model) return;

      for (let i = 0; i < regions.length; i++) {
        if (regions.isCollapsed(i)) {
          const startLine = regions.getStartLineNumber(i);
          const widgetId = `summary-${startLine}`;
          activeWidgets.add(widgetId);

          let widget = widgetRefs.current.get(widgetId);
          if (!widget) {
            widget = new ManagedFoldingWidget(editor, widgetId, startLine);
            widget.attach();
            widgetRefs.current.set(widgetId, widget);
          }

          const isPreamble = startLine === 1;
          let blockId: string | null = null;
          let title = "Unknown Block";
          let subtitle: string | undefined = undefined;

          if (isPreamble) {
            title = currentPage.name;
          } else {
            const block = currentPage.blocks.find((b) => {
              const match = model.findNextMatch(
                `id: ${b.id}`,
                { lineNumber: startLine, column: 1 },
                false,
                true,
                null,
                false
              );
              return (
                match &&
                match.range.startLineNumber > startLine &&
                match.range.endLineNumber <= regions.getEndLineNumber(i)
              );
            });
            if (block) {
              blockId = block.id;
              title = block.name || block.id;
              subtitle = block.engine;
            }
          }

          const formWidgetId = isPreamble
            ? "page-parameters"
            : `config-${blockId}`;
          const isActive = activeFormWidgetIds.has(formWidgetId);

          newPortals.push(
            createPortal(
              <ActionableSummaryWidget
                title={title}
                subtitle={subtitle}
                primaryActionLabel={isPreamble ? "Parameters" : "Config"}
                isActive={isActive}
                onPrimaryAction={() => {
                  toggleFormWidget(formWidgetId);
                }}
                onRawAction={() => {
                  // --- START: DEFINITIVE FIX ---
                  // 1. If the form for this widget is currently open, close it.
                  if (isActive) {
                    toggleFormWidget(formWidgetId);
                  }
                  // 2. Then, unfold the raw text.
                  editor.setSelection(
                    new monaco.Selection(startLine, 1, startLine, 1)
                  );
                  editor.getAction("editor.unfold")?.run();
                  // --- END: DEFINITIVE FIX ---
                }}
              />,
              widget.getPortalTarget(),
              widgetId
            )
          );
        }
      }

      widgetRefs.current.forEach((widget, widgetId) => {
        if (!activeWidgets.has(widgetId)) {
          widget.dispose();
          widgetRefs.current.delete(widgetId);
        }
      });
      setPortals(newPortals);
    });
  }, [editor, currentPage, toggleFormWidget, activeFormWidgetIds]);

  // Setup and teardown listeners for folding and layout changes
  useEffect(() => {
    if (!editor) return;

    const foldingController = (editor as any).getContribution(
      "editor.contrib.folding"
    );
    if (foldingController) {
      // A short delay gives the editor time to fully initialize its model
      const timeoutId = setTimeout(() => {
        foldingController.getFoldingModel().then((model: any) => {
          if (model) {
            disposableRef.current = model.onDidChange(() => {
              log("Folding model changed, queuing widget update.");
              // Use a timeout to de-bounce and wait for layout to settle
              setTimeout(updateWidgets, 50);
            });
            log("Folding model listener attached.");
            updateWidgets(); // Initial check
          }
        });
      }, 150);

      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [editor, updateWidgets]);

  useEffect(() => {
    if (!editor) return;

    // Listen for editor layout changes (like resizing) to update widget widths
    layoutDisposableRef.current = editor.onDidLayoutChange(() => {
      widgetRefs.current.forEach((widget) => widget.updateWidth());
    });

    // Cleanup on unmount or editor change
    return () => {
      disposableRef.current?.dispose();
      layoutDisposableRef.current?.dispose();
      widgetRefs.current.forEach((widget) => widget.dispose());
      widgetRefs.current.clear();
    };
  }, [editor]);

  return portals;
}
