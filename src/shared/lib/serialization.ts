// /home/dpwanjala/repositories/syncropel/studio/src/shared/lib/serialization.ts
import YAML from "yaml";
import { ContextualPage } from "@/shared/types/notebook";

/**
 * Serializes an in-memory ContextualPage object's metadata back into a raw
 * .cx.md file content string, preserving the original body content.
 *
 * @param page The current ContextualPage object from the store, which may have updated metadata.
 * @param currentContent The current raw text content from the Monaco editor.
 * @returns The full text content of the file with updated frontmatter.
 */
export function serializePageToText(
  page: ContextualPage,
  currentContent: string
): string {
  // This regex finds the first YAML frontmatter block (content between --- lines).
  // It handles both CRLF and LF line endings.
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = currentContent.match(frontmatterRegex);

  // Construct the new frontmatter data structure from the current page state.
  // We only include fields that are part of the frontmatter spec.
  const newFrontmatterData: Record<string, any> = {
    name: page.name,
  };

  // Only add other fields if they have meaningful values.
  if (page.description) {
    newFrontmatterData.description = page.description;
  }
  if (page.inputs && Object.keys(page.inputs).length > 0) {
    newFrontmatterData.inputs = page.inputs;
  }
  if (page.tags && page.tags.length > 0) {
    newFrontmatterData.tags = page.tags;
  }
  if (page.author) {
    newFrontmatterData.author = page.author;
  }

  // Convert the new frontmatter object to a clean YAML string.
  const newYamlString = YAML.stringify(newFrontmatterData).trim();

  // Reconstruct the full frontmatter block with the --- separators.
  const finalFrontmatterBlock = `---\n${newYamlString}\n---`;

  if (match) {
    // If frontmatter already exists, replace it with the updated version.
    return currentContent.replace(frontmatterRegex, finalFrontmatterBlock);
  } else {
    // If no frontmatter exists, prepend it.
    return `${finalFrontmatterBlock}\n\n${currentContent}`;
  }
}
