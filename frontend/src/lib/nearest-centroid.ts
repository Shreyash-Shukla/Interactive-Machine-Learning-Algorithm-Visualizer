import type { LabeledPoint, Point } from "../types";

export type ClassCentroid = { label: string; x: number; y: number; count: number };

export function fitCentroids(points: LabeledPoint[]): ClassCentroid[] {
  if (points.length < 2 || points.some((point) =>
    !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
    Math.abs(point.x) > 1e12 || Math.abs(point.y) > 1e12 || !point.label))
    throw new Error("At least two valid labeled points are required.");

  const centers = new Map<string, ClassCentroid>();
  for (const point of points) {
    const center = centers.get(point.label);
    if (!center) {
      centers.set(point.label, { label: point.label, x: point.x, y: point.y, count: 1 });
    } else {
      center.count += 1;
      center.x += (point.x - center.x) / center.count;
      center.y += (point.y - center.y) / center.count;
    }
  }
  if (centers.size < 2 || centers.size > 8)
    throw new Error("Choose data with two to eight classes.");
  return [...centers.values()];
}

export function classifyCentroid(points: LabeledPoint[], query: Point): {
  prediction: string;
  centroids: ClassCentroid[];
  distances: { label: string; distance: number }[];
} {
  if (![query.x, query.y].every((value) => Number.isFinite(value) && Math.abs(value) <= 1e12))
    throw new Error("Enter finite feature values within ±1e12.");
  const centroids = fitCentroids(points);
  // Use training ranges so both feature axes have comparable influence.
  const scaleX = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)) || 1;
  const scaleY = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y)) || 1;
  const distances = centroids.map((center) => ({
    label: center.label,
    distance: Math.hypot((query.x - center.x) / scaleX, (query.y - center.y) / scaleY),
  })).sort((a, b) => a.distance - b.distance);
  // Map insertion order resolves an exact tie by first class seen in the data.
  return { prediction: distances[0].label, centroids, distances };
}
