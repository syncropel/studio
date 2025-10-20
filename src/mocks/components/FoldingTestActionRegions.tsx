"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Button, Group } from "@mantine/core";
import ActionableSummaryWidget from "@/widgets/Notebook/components/ActionableSummaryWidget";

const log = (message: string, ...args: any[]) =>
  console.log(`[FoldingTestBed] ${message}`, ...args);

class TestWidget {
  private domNode: HTMLElement;
  private widget: monaco.editor.IContentWidget;
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string,
    private lineNumber: number
  ) {
    this.domNode = document.createElement("div");

    // Full styling for visibility and proper positioning
    const layoutInfo = editor.getLayoutInfo();

    // Calculate full width minus scrollbar
    const fullWidth = layoutInfo.contentWidth;

    this.domNode.style.width = `${fullWidth}px`;
    // CHANGE: Set exact line height (typical Monaco line height is around 19-20px)
    this.domNode.style.height = "24px"; // CHANGE: Single line height
    this.domNode.style.position = "relative";
    this.domNode.style.zIndex = "100";
    this.domNode.style.pointerEvents = "auto";

    // Solid background with subtle border for clear visibility
    this.domNode.style.backgroundColor = "#f8f9fa";
    this.domNode.style.borderBottom = "1px solid #dee2e6";
    this.domNode.style.borderTop = "1px solid #dee2e6";

    // CHANGE: Removed vertical padding to keep it thin
    this.domNode.style.paddingTop = "0";
    this.domNode.style.paddingBottom = "0";

    // CHANGE: Add margin-bottom to create a "dead zone" below (1 line spacing)
    this.domNode.style.marginBottom = "20px"; // CHANGE: Approximately 1 line height of spacing

    // Ensure the widget stays in place
    this.domNode.style.boxSizing = "border-box";

    // Add a subtle shadow for depth
    this.domNode.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";

    // CHANGE: Center content vertically within the single line
    this.domNode.style.display = "flex";
    this.domNode.style.alignItems = "center";

    this.widget = {
      getId: () => this.id,
      getDomNode: () => this.domNode,
      getPosition: () => ({
        position: { lineNumber: this.lineNumber, column: 1 },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      }),
      allowEditorOverflow: false,
    };
  }

  public attach() {
    this.editor.addContentWidget(this.widget);
    log(`Widget ${this.id} attached at line ${this.lineNumber}`);
  }

  public dispose() {
    this.editor.removeContentWidget(this.widget);
    log(`Widget ${this.id} disposed`);
  }

  public getPortalTarget(): HTMLElement {
    return this.domNode;
  }

  public updateWidth() {
    const layoutInfo = this.editor.getLayoutInfo();
    const fullWidth = layoutInfo.contentWidth;
    this.domNode.style.width = `${fullWidth}px`;
  }
}

export default function FoldingTestActionRegions() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const widgetRefs = useRef<Map<string, TestWidget>>(new Map());
  const [portals, setPortals] = useState<React.ReactPortal[]>([]);
  const disposableRef = useRef<monaco.IDisposable | null>(null);
  const layoutDisposableRef = useRef<monaco.IDisposable | null>(null);

  const updateWidgets = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    log("Updating widgets based on folding state...");

    const foldingController = (editor as any).getContribution(
      "editor.contrib.folding"
    );
    if (!foldingController) {
      log("No folding controller found");
      return;
    }

    foldingController.getFoldingModel().then((foldingModel: any) => {
      if (!foldingModel) {
        log("No folding model found");
        return;
      }

      const newPortals: React.ReactPortal[] = [];
      const activeWidgets = new Set<string>();
      const regions = foldingModel.regions;

      log(`Found ${regions.length} folding regions`);

      for (let i = 0; i < regions.length; i++) {
        const isCollapsed = regions.isCollapsed(i);
        const startLine = regions.getStartLineNumber(i);

        log(`Region ${i}: line ${startLine}, collapsed: ${isCollapsed}`);

        if (isCollapsed) {
          const widgetId = `summary-${startLine}`;
          activeWidgets.add(widgetId);

          let widget = widgetRefs.current.get(widgetId);
          if (!widget) {
            widget = new TestWidget(editor, widgetId, startLine);
            widget.attach();
            widgetRefs.current.set(widgetId, widget);
            log(`Created new widget for line ${startLine}`);
          }

          const isPreamble = startLine === 1;

          // Improved content determination based on line
          const model = editor.getModel();
          const lineContent = model?.getLineContent(startLine) || "";

          let title = "Unknown Block";
          let subtitle: string | undefined = undefined;

          if (isPreamble) {
            title = "My Test Document";
            subtitle = undefined;
          } else if (lineContent.includes("yaml")) {
            title = "block-one";
            subtitle = "yaml";
          } else if (lineContent.includes("sql")) {
            title = "SQL Query";
            subtitle = "sql";
          }

          newPortals.push(
            createPortal(
              <ActionableSummaryWidget
                title={title}
                subtitle={subtitle}
                primaryActionLabel={isPreamble ? "Parameters" : "Config"}
                onPrimaryAction={() =>
                  alert(
                    `${
                      isPreamble ? "Parameters" : "Config"
                    } clicked for line ${startLine}`
                  )
                }
                onRawAction={() => {
                  editor.setSelection(
                    new monaco.Selection(startLine, 1, startLine, 1)
                  );
                  editor.getAction("editor.unfold")?.run();
                  setTimeout(() => updateWidgets(), 50);
                }}
              />,
              widget.getPortalTarget(),
              widgetId
            )
          );
        }
      }

      // Clean up widgets that are no longer collapsed
      widgetRefs.current.forEach((widget, widgetId) => {
        if (!activeWidgets.has(widgetId)) {
          widget.dispose();
          widgetRefs.current.delete(widgetId);
        }
      });

      log(
        `Active widgets: ${activeWidgets.size}, portals: ${newPortals.length}`
      );
      setPortals(newPortals);
    });
  }, []);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    log("Editor has mounted.");

    monacoInstance.languages.registerFoldingRangeProvider("markdown", {
      provideFoldingRanges: (model) => {
        const ranges: monaco.languages.FoldingRange[] = [];

        // Detect YAML frontmatter
        if (model.getLineContent(1).trim() === "---") {
          for (let i = 2; i <= model.getLineCount(); i++) {
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

        // Detect code blocks
        for (let i = 1; i <= model.getLineCount(); i++) {
          if (model.getLineContent(i).startsWith("```")) {
            const startLine = i;
            for (let j = i + 1; j <= model.getLineCount(); j++) {
              if (model.getLineContent(j).startsWith("```")) {
                ranges.push({
                  start: startLine,
                  end: j,
                  kind: monaco.languages.FoldingRangeKind.Region,
                });
                i = j;
                break;
              }
            }
          }
        }
        return ranges;
      },
    });

    // Setup folding model listener
    const foldingController = (editor as any).getContribution(
      "editor.contrib.folding"
    );

    if (foldingController) {
      const setupListener = () => {
        foldingController.getFoldingModel().then((model: any) => {
          if (model) {
            disposableRef.current = model.onDidChange(() => {
              log("Folding model changed, updating widgets.");
              updateWidgets();
            });
            log("Folding model listener attached");
            updateWidgets();
          }
        });
      };

      setTimeout(setupListener, 100);
    }

    // Listen to layout changes to update widget widths
    layoutDisposableRef.current = editor.onDidLayoutChange(() => {
      log("Editor layout changed, updating widget widths");
      widgetRefs.current.forEach((widget) => {
        widget.updateWidth();
      });
    });
  };

  const handleCollapseAll = () => {
    editorRef.current?.getAction("editor.foldAll")?.run();
    setTimeout(updateWidgets, 100);
  };

  const handleExpandAll = () => {
    editorRef.current?.getAction("editor.unfoldAll")?.run();
    setTimeout(updateWidgets, 100);
  };

  const hardcodedContent = [
    "---",
    "name: My Test Document",
    "description: This is a test.",
    "version: 1.0",
    "---",
    "",
    "This is some markdown.",
    "",
    "```yaml",
    "id: block-one",
    "engine: sql",
    "```",
    "",
    "This is more markdown.",
    "",
    "```sql",
    "SELECT * FROM test;",
    "```",
  ].join("\n");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (disposableRef.current) {
        disposableRef.current.dispose();
      }
      if (layoutDisposableRef.current) {
        layoutDisposableRef.current.dispose();
      }
      widgetRefs.current.forEach((widget) => widget.dispose());
      widgetRefs.current.clear();
    };
  }, []);

  return (
    <div
      style={{
        border: "2px solid green",
        margin: "20px",
        padding: "10px",
        zIndex: 9999,
        position: "relative",
        backgroundColor: "white",
      }}
    >
      <h3>Isolated Folding Test Bed</h3>
      <Group mb="md">
        <Button onClick={handleCollapseAll} size="xs">
          Collapse All
        </Button>
        <Button onClick={handleExpandAll} size="xs">
          Expand All
        </Button>
      </Group>
      <div style={{ height: "400px" }}>
        <Editor
          height="100%"
          language="markdown"
          value={hardcodedContent}
          onMount={handleEditorDidMount}
          options={{
            folding: true,
            showFoldingControls: "always",
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
          }}
        />
      </div>
      {portals}
    </div>
  );
}
