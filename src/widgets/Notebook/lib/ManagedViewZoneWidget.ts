// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/lib/ManagedViewZoneWidget.ts
"use client";

import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[ManagedViewZoneWidget] ${message}`, ...args);

/**
 * Manages a single, interactive IViewZone with a predictable height.
 * This is the definitive, robust solution for rendering interactive components
 * inside the Monaco Editor by prioritizing layout stability.
 */
export class ManagedViewZoneWidget {
  private viewZoneId: string | null = null;
  private domNode: HTMLElement;
  private viewZone: monaco.editor.IViewZone;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string,
    private lineNumber: number,
    private heightInPx: number
  ) {
    this.domNode = document.createElement("div");

    // CHANGED: Add critical styles for interactivity
    this.domNode.style.pointerEvents = "auto"; // Enable all pointer events
    this.domNode.style.userSelect = "text"; // Allow text selection
    this.domNode.style.position = "relative"; // Establish positioning context
    this.domNode.style.zIndex = "10"; // Ensure it's above editor content
    this.domNode.style.cursor = "auto"; // Reset cursor to default
    this.domNode.style.overflow = "visible"; // Allow content to be fully visible

    this.viewZone = {
      afterLineNumber: this.lineNumber,
      domNode: this.domNode,
      heightInPx: this.heightInPx,
      suppressMouseDown: false, // CRITICAL: Makes the content interactive
    };
  }

  public attach() {
    this.editor.changeViewZones((accessor) => {
      this.viewZoneId = accessor.addZone(this.viewZone);
      log(`Attached ViewZone ${this.id} with height ${this.heightInPx}px`);
    });
  }

  public dispose() {
    if (this.viewZoneId) {
      this.editor.changeViewZones((accessor) => {
        accessor.removeZone(this.viewZoneId!);
      });
      this.viewZoneId = null;
    }
  }

  public getPortalTarget(): HTMLElement {
    return this.domNode;
  }

  public update(newLineNumber: number, newHeight: number) {
    if (
      this.viewZoneId &&
      (this.lineNumber !== newLineNumber || this.heightInPx !== newHeight)
    ) {
      this.lineNumber = newLineNumber;
      this.heightInPx = newHeight;
      this.viewZone.afterLineNumber = newLineNumber;
      this.viewZone.heightInPx = newHeight;

      this.editor.changeViewZones((accessor) => {
        accessor.layoutZone(this.viewZoneId!);
      });
    }
  }
}
