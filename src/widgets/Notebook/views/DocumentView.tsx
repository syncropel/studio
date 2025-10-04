// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/views/DocumentView.tsx
"use client";

import { Box } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import BlockComponent from "../BlockComponent";
import ParametersForm from "../ParametersForm"; // <-- IMPORT THE PARAMETERS FORM

export default function DocumentView() {
  const currentPage = useSessionStore((state) => state.currentPage);

  if (!currentPage) return null;

  return (
    <>
      <ParametersForm />

      {currentPage.blocks.map((block) => (
        <BlockComponent key={block.id} block={block} />
      ))}
    </>
  );
}
