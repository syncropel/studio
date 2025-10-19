// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/lib/ManagedHybridWidget.ts
"use client";

import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[ManagedHybridWidget] ${message}`, ...args);

/**
 * Manages an interactive IViewZone within the Monaco Editor.
 * This is the definitive, robust solution for rendering interactive, dynamically-sized
 * React components that correctly push the editor's text content down.
 *
 * It works by creating a single IViewZone and handing its DOM node over to React.
 * A ResizeObserver watches this DOM node for size changes and tells Monaco to
 * re-layout the zone, ensuring the space allocated always matches the content height.
 */
export class ManagedHybridWidget {
  private viewZoneId: string | null = null;
  private domNode: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string, // A unique ID for this widget instance (e.g., a block ID).
    private lineNumber: number // The initial line number to render after.
  ) {
    // This is the single DOM node that will be both measured by the ViewZone
    // and used as the interactive target for our React Portal.
    this.domNode = document.createElement("div");

    // The ResizeObserver links the React component's rendered size back to Monaco's layout.
    this.resizeObserver = new ResizeObserver(() => {
      if (this.viewZoneId) {
        // When our content resizes, we command the editor to re-layout our specific zone.
        // The editor will then re-measure the `domNode` and adjust the space.
        this.editor.changeViewZones((accessor) => {
          log(`ResizeObserver: Triggering layout for zone ${this.id}`);
          accessor.layoutZone(this.viewZoneId!);
        });
      }
    });
  }

  /**
   * Adds the ViewZone to the editor and starts observing its DOM node for size changes.
   */
  public attach() {
    this.editor.changeViewZones((accessor) => {
      const viewZone: monaco.editor.IViewZone = {
        afterLineNumber: this.lineNumber,
        // The height is determined by the height of THIS domNode.
        // By making it our interactive node, Monaco will measure our React component.
        domNode: this.domNode,
        // CRITICAL: This is the official API to make the domNode interactive.
        suppressMouseDown: false,
      };
      this.viewZoneId = accessor.addZone(viewZone);
      log(`Attached ViewZone ${this.id} with zoneId ${this.viewZoneId}`);
    });

    this.resizeObserver.observe(this.domNode);
  }

  /**
   * Properly removes the ViewZone from the editor and cleans up the observer.
   */
  public dispose() {
    log(`Disposing widget: ${this.id}`);
    this.resizeObserver.disconnect();
    if (this.viewZoneId) {
      this.editor.changeViewZones((accessor) => {
        accessor.removeZone(this.viewZoneId!);
      });
      this.viewZoneId = null;
    }
  }

  /**
   * Returns the DOM node that React Portals should target.
   */
  public getPortalTarget(): HTMLElement {
    return this.domNode;
  }

  /**
   * Updates the line number for the widget and triggers a re-layout.
   * This is useful if text is added or removed above the widget.
   * @param newLineNumber The new line number to render after.
   */
  public updatePosition(newLineNumber: number) {
    if (this.lineNumber !== newLineNumber && this.viewZoneId) {
      this.lineNumber = newLineNumber;
      // The public API doesn't allow changing afterLineNumber directly.
      // A full remove/add is the safest, most robust way to guarantee position update.
      // This is a rare operation, so the performance impact is negligible.
      this.editor.changeViewZones((accessor) => {
        if (this.viewZoneId) accessor.removeZone(this.viewZoneId);
        const viewZone: monaco.editor.IViewZone = {
          afterLineNumber: newLineNumber,
          domNode: this.domNode,
          suppressMouseDown: false,
        };
        this.viewZoneId = accessor.addZone(viewZone);
      });
    }
  }
}
