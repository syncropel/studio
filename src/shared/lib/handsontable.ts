// /home/dpwanjala/repositories/cx-studio/src/shared/lib/handsontable.ts
import Handsontable from "handsontable/base";
import { registerAllModules } from "handsontable/registry";

// Import the CSS files
import "handsontable/dist/handsontable.full.min.css";

// Register all modules. This enables all features of Handsontable.
// In a production app, you might cherry-pick modules to reduce bundle size.
registerAllModules();

export { Handsontable };
