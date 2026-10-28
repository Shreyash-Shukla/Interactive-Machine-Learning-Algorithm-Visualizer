export type Point = { x: number; y: number };
export type LabeledPoint = Point & { label: string };
export type Snapshot = {
  epoch: number;
  slope: number;
  intercept: number;
  mse: number;
  mae: number;
  r2: number | null;
  loss: number;
};
export type Training = {
  settings: { learning_rate: number; epochs: number };
  total_epochs: number;
  final_slope: number;
  final_intercept: number;
  final_metrics: { mse: number; mae: number; r2: number | null };
  snapshots: Snapshot[];
};
export type ClusterSnapshot = {
  iteration: number;
  centroids: [number, number][];
  assignments: number[];
  inertia: number;
};
export type ClusterTraining = {
  settings: { clusters: number; max_iterations: number };
  total_iterations: number;
  snapshots: ClusterSnapshot[];
};
export type ClusterExample = {
  id: string;
  title: string;
  short: string;
  description: string;
  xLabel: string;
  yLabel: string;
  points: [number, number][];
  training: ClusterTraining;
};
export type ClassificationExample = {
  id: string;
  title: string;
  short: string;
  description: string;
  xLabel: string;
  yLabel: string;
  points: [number, number, string][];
};
export type Example = {
  id: string;
  title: string;
  short: string;
  description: string;
  xLabel: string;
  yLabel: string;
  unit: string;
  points: [number, number][];
  training: Training;
};
export type Dataset = {
  name: string;
  bytes: number;
  rows: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  xColumn: string;
  yColumn: string;
  labelColumn: string;
};
