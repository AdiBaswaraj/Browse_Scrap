"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ArtifactRow, FlowGraph, SessionRow } from "@fyndra/shared";

export function FlowTab({ artifact, session }: { artifact?: ArtifactRow; session: SessionRow }) {
  const flow = (artifact?.payload as FlowGraph | undefined) ?? (session.flow_data as FlowGraph | null) ?? null;

  const { nodes, edges } = useMemo(() => {
    if (!flow) return { nodes: [] as Node[], edges: [] as Edge[] };
    const nodes: Node[] = flow.nodes.map((n, i) => ({
      id: n.id,
      data: { label: n.label },
      position: n.position && (n.position.x || n.position.y)
        ? { x: n.position.x, y: n.position.y }
        : { x: (i % 4) * 220, y: Math.floor(i / 4) * 140 },
      style: {
        background: "#11141d",
        color: "#e7e9f3",
        border: "1px solid #3a4256",
        borderRadius: 12,
        padding: 8,
        fontSize: 12,
      },
    }));
    const edges: Edge[] = flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      style: { stroke: "#5856d6" },
      labelStyle: { fill: "#e7e9f3", fontSize: 11 },
    }));
    return { nodes, edges };
  }, [flow]);

  if (!flow || nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center text-ink-500">
        Flow diagram will appear once synthesis completes.
      </div>
    );
  }
  return (
    <div className="h-[640px] overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/60">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#252b3a" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
