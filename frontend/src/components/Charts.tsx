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
  axisLine: { lineStyle: { color: "#444449" } },
  axisTick: { show: false },
  axisLabel: { color: "#a7a7ad", fontSize: 11 },
  splitLine: { lineStyle: { color: "#303034" } },
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
      textStyle: { color: "#c3c3c8", fontSize: 12 },
      itemWidth: 13,
      itemHeight: 8,
      data: snapshot ? ["Data points", "Regression line"] : ["Data points"],
    },
    grid: { left: 65, right: 26, top: 43, bottom: 55, containLabel: false },
    tooltip: {
      trigger: "item",
      backgroundColor: "#27272b",
      borderColor: "#55555a",
      textStyle: { color: "#f5f5f3" },
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
      nameTextStyle: { color: "#c3c3c8", fontSize: 12 },
      min: minX - xPad,
      max: maxX + xPad,
      ...axis,
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: yLabel,
      nameLocation: "middle",
      nameGap: 51,
      nameTextStyle: { color: "#c3c3c8", fontSize: 12 },
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
        symbolSize: 9,
        itemStyle: {
          color: "#e6e6e8",
          opacity: 0.86,
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
                color: "#7cb5ef",
                width: 2.5,
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
  stepLabel = "Epoch",
  valueLabel = "MSE",
}: {
  snapshots: { epoch: number; loss: number }[];
  current: { epoch: number; loss: number } | null;
  stepLabel?: string;
  valueLabel?: string;
}) {
  const option: EChartsOption = {
    animation: false,
    backgroundColor: "transparent",
    grid: { left: 60, right: 20, top: 18, bottom: 34 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#27272b",
      borderColor: "#55555a",
      textStyle: { color: "#f5f5f3" },
      formatter: (params: unknown) => {
        const p = (params as { value: [number, number] }[])[0];
        return p
          ? `${stepLabel} ${p.value[0]}<br/>${valueLabel}: <b>${fmt(p.value[1])}</b>`
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
        name: valueLabel,
        data: snapshots.map((s) => [s.epoch, s.loss]),
        showSymbol: false,
        smooth: false,
        lineStyle: { color: "#7cb5ef", width: 2 },
      },
      ...(current
        ? [
            {
              type: "scatter" as const,
              name: "Current epoch",
              data: [[current.epoch, current.loss]],
              symbolSize: 11,
              itemStyle: {
                color: "#7cb5ef",
                borderColor: "#e6e6e8",
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
