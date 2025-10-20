// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/lib/ManagedFoldingWidget.ts
"use client";

import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[ManagedFoldingWidget] ${message}`, ...args);

/**
 * Manages an IContentWidget that is displayed ONLY when a folding region is collapsed.
 * This class uses styling on its domNode to create the appearance of a single,
 * spaced-out line for an "Actionable Summary".
 */
export class ManagedFoldingWidget {
  private domNode: HTMLElement;
  private widget: monaco.editor.IContentWidget;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string,
    private lineNumber: number
  ) {
    this.domNode = document.createElement("div");

    // --- STYLING EXACTLY FROM THE PROVEN TEST BED ---
    const layoutInfo = editor.getLayoutInfo();
    const fullWidth =
      layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth;

    this.domNode.style.width = `${fullWidth}px`;
    // We render a single line of UI...
    this.domNode.style.height = "24px";
    // ...and then add a large margin-bottom to create the empty space below it.
    this.domNode.style.marginBottom = "20px";

    // Styling for positioning and interactivity
    this.domNode.style.position = "relative";
    this.domNode.style.zIndex = "10";
    this.domNode.style.pointerEvents = "auto";
    this.domNode.style.boxSizing = "border-box";
    this.domNode.style.display = "flex";
    this.domNode.style.alignItems = "center";

    // Visual styling
    this.domNode.style.backgroundColor = "#f8f9fa";
    this.domNode.style.borderTop = "1px solid #e9ecef";
    this.domNode.style.borderBottom = "1px solid #e9ecef";
    this.domNode.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";

    this.widget = {
      getId: () => this.id,
      getDomNode: () => this.domNode,
      getPosition: () => ({
        position: { lineNumber: this.lineNumber, column: 1 },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      }),
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
    this.domNode.style.width = `${
      layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth
    }px`;
  }
}
