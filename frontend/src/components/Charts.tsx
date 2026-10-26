import { useRef } from "react";
import ReactEChartsCore from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { ScatterChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { RotateCcw } from "lucide-react";
import type { Point, Snapshot } from "../types";

const axis = {
  axisLine: { lineStyle: { color: "#34435d" } },
  axisTick: { show: false },
  axisLabel: { color: "#8b99b0", fontSize: 11 },
  splitLine: { lineStyle: { color: "#202d40", type: "dashed" as const } },
};
const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(value);
echarts.use([
  ScatterChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export function RegressionChart({
  points,
  snapshot,
  xLabel,
  yLabel,
}: {
  points: Point[];
  snapshot: Snapshot | null;
  xLabel: string;
  yLabel: string;
}) {
  const ref = useRef<ReactEChartsCore>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const xPad = (maxX - minX || 1) * 0.1;
  const ends: [number, number][] = snapshot
    ? [
        [minX - xPad, snapshot.slope * (minX - xPad) + snapshot.intercept],
        [maxX + xPad, snapshot.slope * (maxX + xPad) + snapshot.intercept],
      ]
    : [];
  const visibleY = [...ys, ...ends.map((point) => point[1])];
  const minY = Math.min(...visibleY);
  const maxY = Math.max(...visibleY);
  const yPad = (maxY - minY || 1) * 0.12;
  const option: EChartsOption = {
    animationDuration: reduceMotion ? 0 : 250,
    animationDurationUpdate: reduceMotion ? 0 : 150,
    backgroundColor: "transparent",
    legend: {
      top: 2,
      left: 8,
      textStyle: { color: "#aab5c7", fontSize: 12 },
      itemWidth: 13,
      itemHeight: 8,
      data: snapshot ? ["Data points", "Regression line"] : ["Data points"],
    },
    grid: { left: 69, right: 24, top: 48, bottom: 62, containLabel: false },
    tooltip: {
      trigger: "item",
      backgroundColor: "#172235",
      borderColor: "#34435d",
      textStyle: { color: "#e7ecf5" },
      formatter: (params: unknown) => {
        const p = params as { seriesName: string; value: [number, number] };
        return `${p.seriesName}<br/>${xLabel}: <b>${fmt(p.value[0])}</b><br/>${yLabel}: <b>${fmt(p.value[1])}</b>`;
      },
    },
    xAxis: {
      type: "value",
      name: xLabel,
      nameLocation: "middle",
      nameGap: 36,
      nameTextStyle: { color: "#aab5c7", fontSize: 12 },
      min: minX - xPad,
      max: maxX + xPad,
      ...axis,
    },
    yAxis: {
      type: "value",
      name: yLabel,
      nameLocation: "middle",
      nameGap: 51,
      nameTextStyle: { color: "#aab5c7", fontSize: 12 },
      min: minY - yPad,
      max: maxY + yPad,
      ...axis,
    },
    dataZoom: [{ type: "inside", xAxisIndex: 0, filterMode: "none" }],
    series: [
      {
        name: "Data points",
        type: "scatter",
        data: points.map((point) => [point.x, point.y]),
        symbolSize: 10,
        itemStyle: {
          color: "#56d3ef",
          opacity: 0.9,
          shadowBlur: 8,
          shadowColor: "#2eabc8",
        },
        emphasis: { scale: 1.5 },
      },
      ...(snapshot
        ? [
            {
              name: "Regression line",
              type: "line" as const,
              data: ends,
              showSymbol: false,
              smooth: false,
              lineStyle: {
                color: "#a884ff",
                width: 3,
                shadowBlur: 12,
                shadowColor: "#7b5ac6",
              },
              z: 3,
            },
          ]
        : []),
    ],
  };
  return (
    <div className="chart-wrap">
      <button
        className="chart-reset"
        type="button"
        title="Reset graph zoom"
        aria-label="Reset graph zoom"
        onClick={() =>
          ref.current
            ?.getEchartsInstance()
            .dispatchAction({ type: "dataZoom", start: 0, end: 100 })
        }
      >
        <RotateCcw size={14} /> Reset view
      </button>
      <ReactEChartsCore
        echarts={echarts}
        ref={ref}
        option={option}
        notMerge={false}
        lazyUpdate
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}

export function LossChart({
  snapshots,
  current,
}: {
  snapshots: Snapshot[];
  current: Snapshot | null;
}) {
  const option: EChartsOption = {
    animation: false,
    backgroundColor: "transparent",
    grid: { left: 60, right: 20, top: 18, bottom: 34 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#172235",
      borderColor: "#34435d",
      textStyle: { color: "#e7ecf5" },
      formatter: (params: unknown) => {
        const p = (params as { value: [number, number] }[])[0];
        return p
          ? `Epoch ${p.value[0]}<br/>MSE: <b>${fmt(p.value[1])}</b>`
          : "";
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: snapshots.at(-1)?.epoch ?? 1,
      ...axis,
    },
    yAxis: { type: "value", scale: true, ...axis },
    series: [
      {
        type: "line",
        name: "Loss",
        data: snapshots.map((s) => [s.epoch, s.loss]),
        showSymbol: false,
        smooth: false,
        lineStyle: { color: "#9b82f7", width: 2 },
        areaStyle: { color: "rgba(151,112,248,.12)" },
      },
      ...(current
        ? [
            {
              type: "scatter" as const,
              name: "Current epoch",
              data: [[current.epoch, current.loss]],
              symbolSize: 11,
              itemStyle: {
                color: "#a884ff",
                borderColor: "#e5dbff",
                borderWidth: 2,
              },
              z: 5,
            },
          ]
        : []),
    ],
  };
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      style={{ height: 178, width: "100%" }}
    />
  );
}
