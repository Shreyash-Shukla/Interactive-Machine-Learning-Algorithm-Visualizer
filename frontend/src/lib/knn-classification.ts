import type { LabeledPoint, Point } from "../types";

export type ClassNeighbor = { index: number; point: LabeledPoint; distance: number };

export function classifyKnn(points: LabeledPoint[], query: Point, k: number): {
  prediction: string;
  neighbors: ClassNeighbor[];
  votes: { label: string; count: number }[];
} {
  if (![query.x, query.y].every((value) => Number.isFinite(value) && Math.abs(value) <= 1e12))
    throw new Error("Enter finite feature values within ±1e12.");
  if (!Number.isInteger(k) || k < 1 || k > 9 || k > points.length)
    throw new Error("Choose a valid neighbor count.");
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !point.label))
    throw new Error("Training points need valid features and labels.");

  // Scale each axis by its training range so different units contribute fairly.
  const scaleX = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)) || 1;
  const scaleY = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y)) || 1;
  const neighbors = points
    .map((point, index) => ({
      index, point,
      distance: Math.hypot((point.x - query.x) / scaleX, (point.y - query.y) / scaleY),
    }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, k);

  const counts = new Map<string, number>();
  for (const neighbor of neighbors)
    counts.set(neighbor.point.label, (counts.get(neighbor.point.label) ?? 0) + 1);
  // A tied vote goes to the class of the closest neighbor among the tied classes.
  const votes = [...counts].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count ||
      neighbors.findIndex((neighbor) => neighbor.point.label === a.label) -
      neighbors.findIndex((neighbor) => neighbor.point.label === b.label));
  return { prediction: votes[0].label, neighbors, votes };
}
