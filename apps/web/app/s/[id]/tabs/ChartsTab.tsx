"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ArtifactRow, ChartSpec } from "@fyndra/shared";

const PALETTE = ["#7c7af0", "#34d399", "#fb7185", "#f59e0b", "#22d3ee", "#a78bfa", "#f472b6"];

export function ChartsTab({ artifact }: { artifact?: ArtifactRow }) {
  const charts = (artifact?.payload as { charts?: ChartSpec[] } | undefined)?.charts ?? [];
  if (charts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center text-ink-500">
        Charts will appear once synthesis completes.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {charts.map((c, i) => (
        <ChartCard key={i} spec={c} />
      ))}
    </div>
  );
}

function ChartCard({ spec }: { spec: ChartSpec }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
      <h4 className="mb-3 text-sm font-medium text-white">{spec.title}</h4>
      <div className="h-64">
        <ResponsiveContainer>
          <ChartFor spec={spec} />
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartFor({ spec }: { spec: ChartSpec }) {
  const data = spec.data ?? [];
  const xKey = spec.x_field ?? "x";
  const yKey = spec.y_field ?? "y";

  if (spec.kind === "pie") {
    return (
      <PieChart>
        <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    );
  }
  if (spec.kind === "scatter") {
    return (
      <ScatterChart>
        <CartesianGrid stroke="#252b3a" />
        <XAxis dataKey={xKey} stroke="#3a4256" />
        <YAxis dataKey={yKey} stroke="#3a4256" />
        <Tooltip />
        <Scatter data={data} fill={PALETTE[0]} />
      </ScatterChart>
    );
  }
  if (spec.kind === "line" || spec.kind === "timeseries") {
    const series = spec.series;
    if (series) {
      // Group data by series field
      const groups = new Map<string, Array<Record<string, string | number>>>();
      for (const d of data) {
        const k = String(d[series] ?? "");
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(d);
      }
      const keys = Array.from(groups.keys());
      return (
        <LineChart>
          <CartesianGrid stroke="#252b3a" />
          <XAxis dataKey={xKey} stroke="#3a4256" />
          <YAxis stroke="#3a4256" />
          <Tooltip />
          <Legend />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              data={groups.get(k)}
              dataKey={yKey}
              name={k}
              stroke={PALETTE[i % PALETTE.length]}
              dot={false}
            />
          ))}
        </LineChart>
      );
    }
    return (
      <LineChart data={data}>
        <CartesianGrid stroke="#252b3a" />
        <XAxis dataKey={xKey} stroke="#3a4256" />
        <YAxis stroke="#3a4256" />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke={PALETTE[0]} dot={false} />
      </LineChart>
    );
  }
  // bar
  return (
    <BarChart data={data}>
      <CartesianGrid stroke="#252b3a" />
      <XAxis dataKey={xKey} stroke="#3a4256" />
      <YAxis stroke="#3a4256" />
      <Tooltip />
      <Bar dataKey={yKey} fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}
