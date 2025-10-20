// /home/dpwanjala/repositories/syncropel/studio/src/mocks/components/FoldingTest.tsx
"use client";

import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

/**
 * A minimal, isolated component to test and prove the correct way to register
 * a Monaco FoldingRangeProvider within a React lifecycle.
 */
export default function FoldingTest() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    console.log("[FoldingTest] Editor has mounted.");

    // --- THE CRITICAL INSIGHT: REGISTER THE PROVIDER *INSIDE* ONMOUNT ---
    // This guarantees the editor is fully initialized before we try to interact with it,
    // solving all timing and race condition issues.

    console.log("[FoldingTest] Registering FoldingRangeProvider...");
    const provider = monacoInstance.languages.registerFoldingRangeProvider(
      "markdown",
      {
        provideFoldingRanges: (model, context, token) => {
          console.log("[FoldingTest] `provideFoldingRanges` has been called!");

          const ranges: monaco.languages.FoldingRange[] = [];
          // Simple logic: find all ` ``` ` blocks
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
                  i = j; // Jump past this block
                  break;
                }
              }
            }
          }
          console.log(`[FoldingTest] Returning ${ranges.length} ranges.`);
          return ranges;
        },
      }
    );

    // The provider is registered before the editor finishes its initial render,
    // so no manual "nudge" is required.
  };

  const hardcodedContent = [
    "---",
    "name: My Test Document",
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
        border: "2px solid red",
        margin: "20px",
        height: "400px",
        zIndex: 9999,
        position: "relative",
        backgroundColor: "white",
      }}
    >
      <h3 style={{ padding: "5px" }}>Isolated Folding Test Component</h3>
      <Editor
        height="calc(100% - 30px)"
        language="markdown"
        value={hardcodedContent}
        onMount={handleEditorDidMount}
        options={{ folding: true }}
      />
    </div>
  );
}
