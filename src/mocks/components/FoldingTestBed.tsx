// /home/dpwanjala/repositories/syncropel/studio/src/mocks/components/FoldingTestBed.tsx
"use client";

import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Button, Group } from "@mantine/core";
import ActionableSummaryWidget from "@/widgets/Notebook/components/ActionableSummaryWidget";

const log = (message: string, ...args: any[]) =>
  console.log(`[FoldingTestBed] ${message}`, ...args);

export default function FoldingTestBed() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  let foldingProvider: monaco.IDisposable | undefined;

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    log("Editor has mounted.");

    // Clean up any previous provider from hot reloads in dev mode
    if (foldingProvider) {
      foldingProvider.dispose();
    }

    foldingProvider = monacoInstance.languages.registerFoldingRangeProvider(
      "markdown",
      {
        provideFoldingRanges: (model, context, token) => {
          log("`provideFoldingRanges` has been called!");
          const ranges: monaco.languages.FoldingRange[] = [];
          const lineCount = model.getLineCount();

          // Frontmatter logic
          if (lineCount > 1 && model.getLineContent(1).trim() === "---") {
            for (let i = 2; i <= lineCount; i++) {
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

          // Fenced block logic
          for (let i = 1; i <= lineCount; i++) {
            if (model.getLineContent(i).startsWith("```")) {
              const startLine = i;
              for (let j = i + 1; j <= lineCount; j++) {
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
          log(`Returning ${ranges.length} ranges.`);
          return ranges;
        },
      }
    );
  };

  const handleCollapseAll = () => {
    if (!editorRef.current) return;
    log("Executing: Collapse All");
    editorRef.current.focus();
    editorRef.current.getAction("editor.foldAll")?.run();
  };

  const handleExpandAll = () => {
    if (!editorRef.current) return;
    log("Executing: Expand All (Manual, API-Compliant)");
    const editor = editorRef.current;
    editor.focus();

    // --- THE DEFINITIVE, MANUAL EXPAND LOGIC ---
    // We get the model to iterate through its lines.
    const model = editor.getModel();
    if (!model) return;

    // The official `unfold` action takes an argument object with `selectionLines`.
    // We will build an array of all line numbers to pass to it.
    const allLineNumbers: number[] = [];
    for (let i = 1; i <= model.getLineCount(); i++) {
      allLineNumbers.push(i);
    }

    log(`Attempting to expand all ${allLineNumbers.length} lines.`);

    // This is a robust way to expand everything. We are telling the unfold
    // action to consider every single line as a potential start of a folded region.
    // The action is smart enough to only act on lines that are actually folded.
    editor.getAction("editor.unfold")?.run({ selectionLines: allLineNumbers });
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
      <Group mb="md" style={{ height: "36px", border: "1px dashed #ccc" }}>
        <ActionableSummaryWidget
          title="Monthly Billing Report"
          primaryActionLabel="Parameters"
          onPrimaryAction={() => alert("Parameters clicked!")}
          onRawAction={() => alert("Raw clicked!")}
        />
      </Group>
      <Group mb="md" style={{ height: "36px", border: "1px dashed #ccc" }}>
        <ActionableSummaryWidget
          title="get_transactions"
          subtitle="sql"
          primaryActionLabel="Config"
          onPrimaryAction={() => alert("Config clicked!")}
          onRawAction={() => alert("Raw clicked!")}
        />
      </Group>
      <div style={{ height: "400px" }}>
        <Editor
          height="100%"
          language="markdown"
          value={hardcodedContent}
          onMount={handleEditorDidMount}
          options={{ folding: true, showFoldingControls: "always" }}
        />
      </div>
    </div>
  );
}
