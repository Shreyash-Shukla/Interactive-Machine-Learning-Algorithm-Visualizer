import ReactEChartsCore from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { ScatterChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { ClusterSnapshot, Point } from "../types";
import type { Neighbor } from "../lib/knn";

echarts.use([ScatterChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const colors = ["#7cb5ef", "#efb56d", "#b695e8", "#80baa7", "#e58e9b"];
const axis = {
  axisLine: { lineStyle: { color: "#55555a" } },
  axisTick: { show: false },
  axisLabel: { color: "#a7a7ad", fontSize: 11, formatter: (value: number) => fmt(value) },
  splitLine: { lineStyle: { color: "#303034" } },
};
const fmt = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

function bounds(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || Math.max(Math.abs(min) * 0.1, 1)) * 0.12;
  return [min - pad, max + pad];
}

function baseOption(points: Point[], xLabel: string, yLabel: string, extraX: number[] = [], extraY: number[] = []): EChartsOption {
  const [minX, maxX] = bounds([...points.map((point) => point.x), ...extraX]);
  const [minY, maxY] = bounds([...points.map((point) => point.y), ...extraY]);
  return {
    backgroundColor: "transparent",
    animationDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220,
    animationDurationUpdate: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180,
    grid: { left: 65, right: 26, top: 28, bottom: 55 },
    tooltip: {
      trigger: "item", backgroundColor: "#27272b", borderColor: "#55555a",
      textStyle: { color: "#f5f5f3" },
      formatter: (params: unknown) => {
        const item = params as { seriesName: string; value: [number, number] };
        return `${item.seriesName}<br/>${xLabel}: <b>${fmt(item.value[0])}</b><br/>${yLabel}: <b>${fmt(item.value[1])}</b>`;
      },
    },
    xAxis: { type: "value", name: xLabel, nameLocation: "middle", nameGap: 36,
      nameTextStyle: { color: "#c3c3c8", fontSize: 12 }, min: minX, max: maxX, ...axis, splitLine: { show: false } },
    yAxis: { type: "value", name: yLabel, nameLocation: "middle", nameGap: 51,
      nameTextStyle: { color: "#c3c3c8", fontSize: 12 }, min: minY, max: maxY, ...axis },
  };
}

export function ClusterChart({ points, snapshot, clusters, xLabel, yLabel }: {
  points: Point[]; snapshot: ClusterSnapshot | null; clusters: number; xLabel: string; yLabel: string;
}) {
  const option: EChartsOption = {
    ...baseOption(points, xLabel, yLabel),
    series: snapshot
      ? [
          ...Array.from({ length: clusters }, (_, group) => ({
            name: `Cluster ${group + 1}`, type: "scatter" as const,
            data: points.filter((_, index) => snapshot.assignments[index] === group).map((point) => [point.x, point.y]),
            symbolSize: 9, itemStyle: { color: colors[group], opacity: 0.85 },
          })),
          ...snapshot.centroids.map((center, group) => ({
            name: `Center ${group + 1}`, type: "scatter" as const, data: [center],
            symbol: "diamond", symbolSize: 22,
            itemStyle: { color: colors[group], borderColor: "#f5f5f3", borderWidth: 2 }, z: 5,
          })),
        ]
      : [{ name: "Data points", type: "scatter", data: points.map((point) => [point.x, point.y]),
          symbolSize: 9, itemStyle: { color: "#e6e6e8", opacity: 0.86 } }],
  };
  return <div className="chart-wrap"><ReactEChartsCore echarts={echarts} option={option} notMerge style={{ height: "100%", width: "100%" }} /></div>;
}

export function KnnChart({ points, query, prediction, neighbors, xLabel, yLabel }: {
  points: Point[]; query: number | null; prediction: number | null; neighbors: Neighbor[];
  xLabel: string; yLabel: string;
}) {
  const chosen = new Set(neighbors.map((neighbor) => neighbor.index));
  const option: EChartsOption = {
    ...baseOption(points, xLabel, yLabel, query === null ? [] : [query], prediction === null ? [] : [prediction]),
    series: [
      { name: "Other points", type: "scatter", data: points.filter((_, index) => !chosen.has(index)).map((point) => [point.x, point.y]),
        symbolSize: 9, itemStyle: { color: "#e6e6e8", opacity: 0.65 } },
      { name: "Nearest neighbors", type: "scatter", data: neighbors.map(({ point }) => [point.x, point.y]),
        symbolSize: 14, itemStyle: { color: colors[0], borderColor: "#f5f5f3", borderWidth: 1 } },
      ...(query === null || prediction === null ? [] : [{ name: "Predicted point", type: "scatter" as const,
        data: [[query, prediction]], symbol: "diamond", symbolSize: 22,
        itemStyle: { color: colors[1], borderColor: "#f5f5f3", borderWidth: 2 }, z: 5 }]),
    ],
  };
  return <div className="chart-wrap"><ReactEChartsCore echarts={echarts} option={option} notMerge style={{ height: "100%", width: "100%" }} /></div>;
}
