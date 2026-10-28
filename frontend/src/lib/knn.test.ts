import { describe, expect, it } from "vitest";
import { predictKnn } from "./knn";

describe("KNN regression", () => {
  const points = [{ x: 1, y: 10 }, { x: 3, y: 30 }, { x: 5, y: 50 }];

  it("uses the closest K points and averages their Y values", () => {
    const result = predictKnn(points, 2, 2);
    expect(result.neighbors.map((neighbor) => neighbor.index)).toEqual([0, 1]);
    expect(result.prediction).toBe(20);
  });

  it("uses stable dataset order for distance ties and validates requests", () => {
    expect(predictKnn(points, 2, 1).prediction).toBe(10);
    expect(() => predictKnn(points, Number.NaN, 2)).toThrow(/finite/);
    expect(() => predictKnn(points, 2, 4)).toThrow(/valid/);
  });
});
