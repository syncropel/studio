// /home/dpwanjala/repositories/syncropel/studio/src/shared/lib/serialization.ts
import YAML from "yaml";
import { nanoid } from "nanoid";
import { ContextualPage, Block } from "@/shared/types/notebook";

// ========================================================================
//   CST (Concrete Syntax Tree) Management
// ========================================================================
// This WeakMap is the core of our lossless serialization strategy. It creates a
// hidden association between the plain JavaScript objects our UI uses and the
// rich CST `Document` objects from the YAML parser. A WeakMap is used so that
// when the plain object is garbage collected, the associated CST document can
// be garbage collected as well, preventing memory leaks.

const cstMap = new WeakMap<object, YAML.Document.Parsed>();

/**
 * Retrieves the associated CST `Document` for a given plain JavaScript object.
 * @param obj The plain JS object (e.g., the `currentPage` frontmatter or a block's metadata).
 * @returns The rich CST Document if one was associated during parsing, otherwise undefined.
 */
export function getCstDocument(obj: object): YAML.Document.Parsed | undefined {
  return cstMap.get(obj);
}

// ========================================================================
//   Regular Expressions for Parsing
// ========================================================================

// This regex finds the top-level YAML frontmatter block at the start of the file.
// The `s` flag allows `.` to match newlines, mimicking Python's re.DOTALL.
const FRONTMATTER_REGEX = /^\s*---\r?\n([\s\S]+?)\n---/;

// This regex finds ALL fenced code blocks globally to split the document.
// The `g` flag makes it global, and the `s` flag allows `.` to match newlines.
const GENERIC_FENCED_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)\n```/gs;

/**
 * A helper function to parse the language and inner content from a full fenced block string.
 * @param blockStr The full string of the block, including the ``` fences.
 * @returns A tuple of [language, innerContent].
 */
const parseFencedBlock = (blockStr: string): [string, string] => {
  // Use a non-global regex here as we are only matching a single block string.
  const match = /^```(\w*)\n([\s\S]*?)\n```$/.exec(blockStr.trim());
  if (match) {
    return [match[1].toLowerCase() || "text", match[2]];
  }
  return ["text", blockStr]; // Fallback for malformed or non-fenced content
};

// ========================================================================
//   Core Parsing and Serialization Functions
// ========================================================================

/**
 * FAITHFUL PORT of the Python NotebookParser.
 * Parses the full raw text content of a .cx.md file into an in-memory
 * ContextualPage object, correctly handling interleaved markdown and "block pairs".
 * It also internally creates and associates CST documents for lossless serialization.
 *
 * @param id The ID of the page being parsed.
 * @param textContent The raw text from the Monaco editor.
 * @returns The structured ContextualPage object.
 */
export function parsePageFromText(
  id: string,
  textContent: string
): ContextualPage {
  // --- Step 1: Extract and parse the main document frontmatter as a CST ---
  const frontmatterMatch = textContent.match(FRONTMATTER_REGEX);
  let mainContent = textContent;
  let frontmatter: Partial<ContextualPage> = { name: "Untitled" };
  let frontmatterCst: YAML.Document.Parsed | null = null;

  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1];
    mainContent = textContent.slice(frontmatterMatch[0].length).trimStart();
    try {
      // parseDocument retains all formatting, comments, etc.
      frontmatterCst = YAML.parseDocument(yamlContent);
      frontmatter = frontmatterCst.toJS() as Partial<ContextualPage>;
    } catch (e) {
      console.warn(
        "Could not parse page frontmatter, treating as plain object:",
        e
      );
      // Fallback to simple parsing on error
      frontmatter = YAML.parse(yamlContent);
    }
  }

  // --- Step 2, Pass 1: Split main content into a raw stream of markdown and code parts ---
  const rawParts: { type: "markdown" | "code_block"; content: string }[] = [];
  let lastIndex = 0;
  let match;
  GENERIC_FENCED_BLOCK_REGEX.lastIndex = 0; // Reset regex state

  while ((match = GENERIC_FENCED_BLOCK_REGEX.exec(mainContent)) !== null) {
    const markdownContent = mainContent.slice(lastIndex, match.index).trim();
    if (markdownContent) {
      rawParts.push({ type: "markdown", content: markdownContent });
    }
    rawParts.push({ type: "code_block", content: match[0] });
    lastIndex = match.index + match[0].length;
  }
  const finalMarkdown = mainContent.slice(lastIndex).trim();
  if (finalMarkdown) {
    rawParts.push({ type: "markdown", content: finalMarkdown });
  }

  // --- Step 3, Pass 2: Process the raw stream to form logical Blocks ---
  const blocks: Block[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];

    if (part.type === "markdown") {
      blocks.push({
        id: `md-${nanoid(8)}`,
        engine: "markdown",
        content: part.content,
        inputs: [],
        outputs: [],
      });
      continue;
    }

    const [lang, innerContent] = parseFencedBlock(part.content);
    let isCxMetadataBlock = false;
    let metadata: Partial<Block> & { cx_block?: boolean } = {};
    let metadataCst: YAML.Document.Parsed | null = null;

    if (lang === "yaml") {
      try {
        const doc = YAML.parseDocument(innerContent);
        const parsedJs = doc.toJS();
        if (typeof parsedJs === "object" && parsedJs?.cx_block === true) {
          isCxMetadataBlock = true;
          metadata = parsedJs;
          metadataCst = doc;
        }
      } catch (e) {
        /* Not a cx_block if it's not valid YAML */
      }
    }

    if (
      isCxMetadataBlock &&
      i + 1 < rawParts.length &&
      rawParts[i + 1].type === "code_block"
    ) {
      const blockId = metadata.id;
      if (!blockId) {
        console.warn("Found a cx_block without an ID. Treating as markdown.");
      } else {
        const nextPart = rawParts[i + 1];
        const [codeLang, codeContent] = parseFencedBlock(nextPart.content);

        const block: Block = {
          id: blockId,
          engine: metadata.engine || codeLang,
          content: codeContent.trim(),
          name: metadata.name,
          inputs: metadata.inputs || [],
          outputs: metadata.outputs || [],
        };

        if (metadataCst) {
          // Associate the CST with the final block object for later serialization
          cstMap.set(block, metadataCst);
        }

        blocks.push(block);
        i++; // Skip the next part, as we've consumed it
        continue;
      }
    }

    // If not a valid block pair, treat the current part as simple markdown
    blocks.push({
      id: `md-${nanoid(8)}`,
      engine: "markdown",
      content: part.content,
      inputs: [],
      outputs: [],
    });
  }

  // --- Step 4: Assemble the final ContextualPage object ---
  const page: ContextualPage = {
    id: id,
    name: frontmatter.name || "Untitled",
    description: frontmatter.description,
    inputs: frontmatter.inputs,
    tags: frontmatter.tags,
    author: frontmatter.author,
    blocks,
  };

  // Associate the frontmatter CST with the final page object
  if (frontmatterCst) {
    cstMap.set(page, frontmatterCst);
  }

  return page;
}

/**
 * ROBUST IMPLEMENTATION for comment preservation.
 * Serializes an in-memory ContextualPage object's metadata back into a raw
 * .cx.md file content string by modifying the underlying Concrete Syntax Tree (CST).
 *
 * @param page The current ContextualPage object from the store.
 * @param currentContent The current raw text content from the Monaco editor.
 * @returns The full text content of the file with updated frontmatter.
 */
export function serializePageToText(
  page: ContextualPage,
  currentContent: string
): string {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\n---/;
  const match = currentContent.match(frontmatterRegex);

  // Attempt to retrieve the CST associated with the page object.
  const frontmatterCst = getCstDocument(page);

  if (match && frontmatterCst) {
    // --- HAPPY PATH: We have an existing frontmatter block AND its CST ---

    // Modify the CST directly. This preserves comments and formatting.
    if (frontmatterCst.has("name")) {
      frontmatterCst.set("name", page.name);
    } else {
      frontmatterCst.add({ key: "name", value: page.name });
    }

    if (page.description) {
      if (frontmatterCst.has("description")) {
        frontmatterCst.set("description", page.description);
      } else {
        frontmatterCst.add({ key: "description", value: page.description });
      }
    } else {
      // If description is null/undefined in the model, remove it from the YAML
      frontmatterCst.delete("description");
    }

    // Convert the modified CST back to a string.
    const newYamlString = frontmatterCst.toString();
    const finalFrontmatterBlock = `---\n${newYamlString}---`;

    // Replace the old frontmatter block with the newly generated one.
    return currentContent.replace(frontmatterRegex, finalFrontmatterBlock);
  }

  // --- FALLBACK PATH: No CST found or no frontmatter existed in the first place ---
  // We'll generate a clean one from scratch. Comments will be lost in this case,
  // but it's a safe fallback.
  const newFrontmatterData: Record<string, any> = {
    name: page.name,
    description: page.description,
    inputs: page.inputs,
    tags: page.tags,
    author: page.author,
  };

  // Clean up any keys that have empty/null values to keep the YAML clean.
  Object.keys(newFrontmatterData).forEach((key) => {
    const value = newFrontmatterData[key];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && Object.keys(value).length === 0)
    ) {
      delete newFrontmatterData[key];
    }
  });

  const newYamlString = YAML.stringify(newFrontmatterData);
  const finalFrontmatterBlock = `---\n${newYamlString}---`;

  if (match) {
    // If there was an old block but no CST, replace it.
    return currentContent.replace(frontmatterRegex, finalFrontmatterBlock);
  } else {
    // If no frontmatter ever existed, prepend it.
    return `${finalFrontmatterBlock}\n\n${currentContent.trimStart()}`;
  }
}
