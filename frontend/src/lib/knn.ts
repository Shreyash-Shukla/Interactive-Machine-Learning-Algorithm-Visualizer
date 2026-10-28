import type { Point } from "../types";

export type Neighbor = { index: number; point: Point; distance: number };

export function predictKnn(points: Point[], query: number, k: number): {
  prediction: number;
  neighbors: Neighbor[];
} {
  if (!Number.isFinite(query) || Math.abs(query) > 1e12)
    throw new Error("Enter a finite X value within ±1e12.");
  if (!Number.isInteger(k) || k < 1 || k > 9 || k > points.length)
    throw new Error("Choose a valid neighbor count.");
  const neighbors = points
    .map((point, index) => ({ index, point, distance: Math.abs(point.x - query) }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, k);
  return {
    prediction: neighbors.reduce((sum, item) => sum + item.point.y, 0) / k,
    neighbors,
  };
}
