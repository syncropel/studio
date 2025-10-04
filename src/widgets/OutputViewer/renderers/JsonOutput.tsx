"use client";

import React from "react";
import { CodeHighlight } from "@mantine/code-highlight";

interface JsonOutputProps {
  data: any;
}

export default function JsonOutput({ data }: JsonOutputProps) {
  // The 'safe_serialize' function on the server handles complex types like dates.
  // We can be confident the data is serializable here.
  const jsonString = JSON.stringify(data, null, 2);

  return <CodeHighlight code={jsonString} language="json" />;
}
