// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/providers/markdownFoldingProvider.ts
import * as monaco from "monaco-editor";

const log = (message: string, ...args: any[]) =>
  console.log(`[MarkdownFoldingProvider] ${message}`, ...args);

let isRegistered = false;

/**
 * Register markdown folding provider globally.
 * DIAGNOSTIC VERSION: Returns hardcoded ranges to test if provider is being called
 */
export function registerMarkdownFoldingProvider() {
  if (isRegistered) {
    log("⚠️ Provider already registered, skipping");
    return;
  }

  log("📋 Registering DIAGNOSTIC FoldingRangeProvider for 'markdown'...");

  monaco.languages.registerFoldingRangeProvider("markdown", {
    provideFoldingRanges: (model, context, token) => {
      log("🔥🔥🔥 PROVIDER CALLED! 🔥🔥🔥");
      log(`   Model URI: ${model.uri.toString()}`);
      log(`   Model language: ${model.getLanguageId()}`);
      log(`   Line count: ${model.getLineCount()}`);

      // DIAGNOSTIC: Return hardcoded ranges for lines 17-28 and 29-31
      // This tests if Monaco is using our provider at all
      const testRanges = [
        {
          start: 17,
          end: 28,
          kind: monaco.languages.FoldingRangeKind.Region,
        },
        {
          start: 29,
          end: 31,
          kind: monaco.languages.FoldingRangeKind.Region,
        },
      ];

      log(`🎯 Returning ${testRanges.length} HARDCODED test ranges`);
      return testRanges;
    },
  });

  isRegistered = true;
  log("✅ DIAGNOSTIC Provider registered globally");
}
