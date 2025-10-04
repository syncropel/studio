// /home/dpwanjala/repositories/cx-studio/src/widgets/OutputViewer/renderers/TableOutput.tsx
"use client";

import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react-wrapper";
import { Text } from "@mantine/core";
import { Handsontable } from "@/shared/lib/handsontable";
import { nanoid } from "nanoid";

interface TableOutputProps {
  data: Record<string, any>[];
}

export default function TableOutput({ data }: TableOutputProps) {
  // --- START OF DEFINITIVE FIX ---
  // Hooks MUST be called at the top level, unconditionally.
  const { colHeaders, columns, tableData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { colHeaders: [], columns: [], tableData: [] };
    }

    const headers = Object.keys(data[0]);
    const columnSettings = headers.map((key) => ({
      data: key,
      title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      renderer: (
        _instance: Handsontable.Core,
        td: HTMLTableCellElement,
        _row: number,
        _col: number,
        _prop: string | number,
        value: any,
        _cellProperties: Handsontable.CellProperties // Prefixed to ignore warning
      ) => {
        if (typeof value === "object" && value !== null) {
          td.innerText = JSON.stringify(value);
        } else {
          td.innerText = String(value ?? "");
        }
        return td;
      },
    }));
    return { colHeaders: headers, columns: columnSettings, tableData: data };
  }, [data]);

  // Now that hooks are done, we can have an early return.
  if (!tableData || tableData.length === 0) {
    return <Text c="dimmed">No records to display.</Text>;
  }
  // --- END OF DEFINITIVE FIX ---

  return (
    <div
      className="handsontable-container"
      style={{ width: "100%", height: "auto" }}
    >
      <HotTable
        data={tableData}
        colHeaders={colHeaders}
        columns={columns}
        rowHeaders={true}
        height="auto"
        width="100%"
        autoWrapRow={true}
        autoWrapCol={true}
        manualColumnResize={true}
        filters={true}
        dropdownMenu={true}
        columnSorting={true}
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
      />
    </div>
  );
}
