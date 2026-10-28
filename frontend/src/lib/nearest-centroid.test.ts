import { describe, expect, it } from "vitest";
import { classifyCentroid, fitCentroids } from "./nearest-centroid";

describe("nearest centroid classification", () => {
  const points = [
    { x: 0, y: 0, label: "A" }, { x: 2, y: 2, label: "A" },
    { x: 8, y: 0, label: "B" }, { x: 10, y: 2, label: "B" },
  ];

  it("fits actual class means and selects the closest one", () => {
    expect(fitCentroids(points)).toEqual([
      { label: "A", x: 1, y: 1, count: 2 },
      { label: "B", x: 9, y: 1, count: 2 },
    ]);
    expect(classifyCentroid(points, { x: 8, y: 1 }).prediction).toBe("B");
  });

  it("scales unequal feature ranges and handles a constant feature", () => {
    const scaled = points.map((point) => ({ ...point, y: point.y * 1000 }));
    expect(classifyCentroid(scaled, { x: 8, y: 1000 }).prediction).toBe("B");
    expect(classifyCentroid(points.map((point) => ({ ...point, y: 5 })), { x: 1, y: 5 }).prediction).toBe("A");
  });

  it("uses class means rather than the label of the nearest sample", () => {
    const uneven = [
      { x: 0, y: 0, label: "A" }, { x: 100, y: 0, label: "A" },
      { x: 1, y: 0, label: "B" }, { x: 2, y: 0, label: "B" },
    ];
    expect(classifyCentroid(uneven, { x: 0, y: 0 }).prediction).toBe("B");
  });

  it("keeps the first class on an exact tie and rejects invalid inputs", () => {
    expect(classifyCentroid(points, { x: 5, y: 1 }).prediction).toBe("A");
    expect(() => classifyCentroid(points, { x: Infinity, y: 0 })).toThrow(/finite/);
    expect(() => fitCentroids(points.slice(0, 2))).toThrow(/two to eight/);
  });
});
