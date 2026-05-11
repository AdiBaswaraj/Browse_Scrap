"use client";

import { useMemo, useState } from "react";
import type { ArtifactRow, ComparisonMatrix } from "@fyndra/shared";

export function CompareTab({ artifact }: { artifact?: ArtifactRow }) {
  const matrix = artifact?.payload as ComparisonMatrix | undefined;
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedRows = useMemo(() => {
    if (!matrix) return [];
    if (sortCol == null) return matrix.rows;
    return [...matrix.rows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [matrix, sortCol, sortAsc]);

  if (!matrix) return <Empty>Comparison matrix will appear once synthesis completes.</Empty>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-800/60">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-ink-500">
            {matrix.columns.map((c, i) => (
              <th
                key={i}
                className="cursor-pointer px-4 py-3 hover:text-white"
                onClick={() => {
                  if (sortCol === i) setSortAsc(!sortAsc);
                  else {
                    setSortCol(i);
                    setSortAsc(true);
                  }
                }}
              >
                {c}
                {sortCol === i && <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i} className="border-b border-ink-700/60 hover:bg-ink-700/30">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-white">
                  {cell == null ? <span className="text-ink-600">—</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center text-ink-500">{children}</div>
  );
}
