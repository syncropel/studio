// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/lib/ManagedViewZoneWidget.ts
"use client";

import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[ManagedViewZoneWidget] ${message}`, ...args);

/**
 * Manages a single, interactive IViewZone with support for both fixed and dynamic heights.
 * Dynamic height uses a debounced ResizeObserver to efficiently update the editor layout.
 */
export class ManagedViewZoneWidget {
  private viewZoneId: string | null = null;
  private domNode: HTMLElement;
  private viewZone: monaco.editor.IViewZone;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: NodeJS.Timeout | null = null;
  private lastObservedHeight: number;
  private isDynamicHeight: boolean;
  // CHANGED: Add timer for delayed observation start
  private observerStartTimer: NodeJS.Timeout | null = null;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    readonly id: string,
    private lineNumber: number,
    private heightInPx: number,
    options?: {
      dynamicHeight?: boolean;
      minHeight?: number;
      maxHeight?: number;
      debounceMs?: number;
      heightThreshold?: number;
    }
  ) {
    this.domNode = document.createElement("div");
    this.lastObservedHeight = heightInPx;
    this.isDynamicHeight = options?.dynamicHeight ?? false;

    // Add critical styles for interactivity
    this.domNode.style.pointerEvents = "auto";
    this.domNode.style.userSelect = "text";
    this.domNode.style.position = "relative";
    this.domNode.style.zIndex = "10";
    this.domNode.style.cursor = "auto";
    this.domNode.style.overflow = "visible";

    this.viewZone = {
      afterLineNumber: this.lineNumber,
      domNode: this.domNode,
      heightInPx: this.heightInPx,
      suppressMouseDown: false,
    };

    // Setup ResizeObserver for dynamic height if enabled
    if (this.isDynamicHeight) {
      this.setupResizeObserver(options);
    }
  }

  /**
   * Sets up a debounced ResizeObserver to track content height changes
   */
  private setupResizeObserver(options?: {
    minHeight?: number;
    maxHeight?: number;
    debounceMs?: number;
    heightThreshold?: number;
  }) {
    const minHeight = options?.minHeight ?? 60;
    const maxHeight = options?.maxHeight ?? 600;
    const debounceMs = options?.debounceMs ?? 150;
    const heightThreshold = options?.heightThreshold ?? 5;

    this.resizeObserver = new ResizeObserver((entries) => {
      // Clear any pending debounce timer
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer);
      }

      // Debounce the height update to avoid layout thrashing
      this.resizeDebounceTimer = setTimeout(() => {
        for (const entry of entries) {
          const contentHeight = entry.contentRect.height;

          // CHANGED: Skip if content hasn't rendered yet (height is 0 or very small)
          if (contentHeight < 10) {
            log(
              `Skipping update for ${this.id}: content not rendered yet (height: ${contentHeight}px)`
            );
            continue;
          }

          // Apply min/max constraints
          const clampedHeight = Math.max(
            minHeight,
            Math.min(maxHeight, contentHeight)
          );

          // Only update if the change is significant (threshold-based)
          const heightDiff = Math.abs(clampedHeight - this.lastObservedHeight);
          if (heightDiff > heightThreshold) {
            log(
              `Dynamic height change detected for ${this.id}: ${this.lastObservedHeight}px -> ${clampedHeight}px`
            );
            this.lastObservedHeight = clampedHeight;
            this.updateHeight(clampedHeight);
          }
        }
      }, debounceMs);
    });
  }

  public attach() {
    this.editor.changeViewZones((accessor) => {
      this.viewZoneId = accessor.addZone(this.viewZone);
      log(`Attached ViewZone ${this.id} with height ${this.heightInPx}px`);
    });

    // CHANGED: Start observing after a delay to allow React portal content to render
    if (this.isDynamicHeight && this.resizeObserver) {
      this.observerStartTimer = setTimeout(() => {
        if (this.resizeObserver && this.domNode) {
          this.resizeObserver.observe(this.domNode);
          log(`Started observing ${this.id} after portal render delay`);
        }
      }, 100); // 100ms delay to let React render
    }
  }

  public dispose() {
    // CHANGED: Clear observer start timer
    if (this.observerStartTimer) {
      clearTimeout(this.observerStartTimer);
      this.observerStartTimer = null;
    }

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear any pending debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }

    // Remove ViewZone
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

  /**
   * Updates the ViewZone's line number and optionally its height
   */
  public update(newLineNumber: number, newHeight?: number) {
    // For dynamic height widgets, ignore external height updates
    if (this.isDynamicHeight && newHeight !== undefined) {
      log(
        `Ignoring external height update for dynamic widget ${this.id}. Height is managed by ResizeObserver.`
      );
      newHeight = undefined;
    }

    const shouldUpdate =
      this.lineNumber !== newLineNumber ||
      (newHeight !== undefined && this.heightInPx !== newHeight);

    if (this.viewZoneId && shouldUpdate) {
      this.lineNumber = newLineNumber;

      if (newHeight !== undefined) {
        this.heightInPx = newHeight;
        this.viewZone.heightInPx = newHeight;
      }

      this.viewZone.afterLineNumber = newLineNumber;

      this.editor.changeViewZones((accessor) => {
        accessor.layoutZone(this.viewZoneId!);
      });
    }
  }

  /**
   * Internal method to update only the height (used by ResizeObserver)
   */
  private updateHeight(newHeight: number) {
    if (this.viewZoneId && this.heightInPx !== newHeight) {
      this.heightInPx = newHeight;
      this.viewZone.heightInPx = newHeight;

      this.editor.changeViewZones((accessor) => {
        accessor.layoutZone(this.viewZoneId!);
      });
    }
  }
}
