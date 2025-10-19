// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/lib/ManagedHybridWidget.ts
"use client";

import * as monaco from "monaco-editor";

/**
 * Manages a hybrid of an IViewZone (for layout) and an IContentWidget (for interaction).
 * This is the definitive, robust solution for rendering interactive React components
 * inside the Monaco Editor.
 */
export class ManagedHybridWidget {
  private viewZoneId: string | null = null;
  private contentWidget: monaco.editor.IContentWidget;
  private contentWidgetDomNode: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string,
    private lineNumber: number
  ) {
    this.contentWidgetDomNode = document.createElement("div");

    this.contentWidget = {
      getId: () => `content-widget-${this.id}`,
      getDomNode: () => this.contentWidgetDomNode,
      getPosition: () => ({
        position: { lineNumber: this.lineNumber, column: 1 },
        preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
      }),
    };

    this.resizeObserver = new ResizeObserver(() => {
      // When the content widget resizes, we just need to tell the editor
      // to re-layout our ViewZone. The editor will then re-measure the domNode.
      if (this.viewZoneId) {
        this.editor.changeViewZones((accessor) => {
          accessor.layoutZone(this.viewZoneId!);
        });
      }
    });
  }

  public attach() {
    this.editor.changeViewZones((accessor) => {
      const viewZone: monaco.editor.IViewZone = {
        afterLineNumber: this.lineNumber,
        // --- THIS IS THE DEFINITIVE FIX ---
        // The height is determined by the height of THIS domNode.
        // By making it our interactive node, Monaco will measure our React component.
        domNode: this.contentWidgetDomNode,
        // We let the ContentWidget handle all clicks.
        suppressMouseDown: true,
      };
      this.viewZoneId = accessor.addZone(viewZone);
    });

    this.editor.addContentWidget(this.contentWidget);
    this.resizeObserver.observe(this.contentWidgetDomNode);
  }

  public dispose() {
    this.resizeObserver.disconnect();
    this.editor.removeContentWidget(this.contentWidget);
    if (this.viewZoneId) {
      this.editor.changeViewZones((accessor) => {
        if (this.viewZoneId) accessor.removeZone(this.viewZoneId);
      });
      this.viewZoneId = null;
    }
  }

  public getPortalTarget(): HTMLElement {
    return this.contentWidgetDomNode;
  }

  public updatePosition(newLineNumber: number) {
    if (this.lineNumber !== newLineNumber && this.viewZoneId) {
      this.lineNumber = newLineNumber;
      // We need to command Monaco to re-layout BOTH primitives.
      this.editor.changeViewZones((accessor) => {
        // The public API doesn't allow changing afterLineNumber directly.
        // A full remove/add is the safest, most robust way.
        // This is a rare operation, so performance is not a concern.
        if (this.viewZoneId) accessor.removeZone(this.viewZoneId);
        const viewZone: monaco.editor.IViewZone = {
          afterLineNumber: newLineNumber,
          domNode: this.contentWidgetDomNode,
          suppressMouseDown: true,
        };
        this.viewZoneId = accessor.addZone(viewZone);
      });
      this.editor.layoutContentWidget(this.contentWidget);
    }
  }
}
