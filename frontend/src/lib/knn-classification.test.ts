import { describe, expect, it } from "vitest";
import { classifyKnn } from "./knn-classification";

describe("KNN classification", () => {
  const points = [
    { x: 0, y: 0, label: "A" }, { x: 0, y: 1, label: "A" },
    { x: 10, y: 0, label: "B" }, { x: 10, y: 1, label: "B" },
  ];

  it("predicts by majority vote over the nearest points", () => {
    const result = classifyKnn(points, { x: 1, y: 0.2 }, 3);
    expect(result.prediction).toBe("A");
    expect(result.votes).toEqual([{ label: "A", count: 2 }, { label: "B", count: 1 }]);
    expect(result.neighbors.map((neighbor) => neighbor.index)).toEqual([0, 1, 2]);
  });

  it("scales both features and breaks tied votes by the closest neighbor", () => {
    const scaled = points.map((point) => ({ ...point, y: point.y * 1000 }));
    expect(classifyKnn(scaled, { x: 1, y: 200 }, 3).prediction).toBe("A");
    expect(classifyKnn(points, { x: 5, y: 0 }, 2).prediction).toBe("A");
  });

  it("rejects invalid queries and K values", () => {
    expect(() => classifyKnn(points, { x: NaN, y: 0 }, 3)).toThrow(/finite/);
    expect(() => classifyKnn(points, { x: 1, y: 0 }, 5)).toThrow(/valid/);
  });
});
