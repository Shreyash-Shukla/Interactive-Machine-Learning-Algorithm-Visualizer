import { describe, expect, it } from "vitest";
import { classifyNaiveBayes, fitNaiveBayes } from "./naive-bayes";

describe("Gaussian Naive Bayes classification", () => {
  const points = [
    { x: 0, y: 0, label: "A" },
    { x: 2, y: 2, label: "A" },
    { x: 8, y: 8, label: "B" },
    { x: 10, y: 10, label: "B" },
  ];

  it("fits class priors and feature distribution statistics", () => {
    const model = fitNaiveBayes(points);
    expect(model.totalPoints).toBe(4);
    expect(model.classes).toHaveLength(2);

    const classA = model.classes.find((c) => c.label === "A");
    expect(classA).toBeDefined();
    expect(classA?.prior).toBeCloseTo(0.5);
    expect(classA?.meanX).toBe(1);
    expect(classA?.meanY).toBe(1);
    expect(classA?.varianceX).toBe(1);
    expect(classA?.varianceY).toBe(1);

    const classB = model.classes.find((c) => c.label === "B");
    expect(classB).toBeDefined();
    expect(classB?.prior).toBeCloseTo(0.5);
    expect(classB?.meanX).toBe(9);
    expect(classB?.meanY).toBe(9);
  });

  it("predicts the class with highest posterior probability", () => {
    const resA = classifyNaiveBayes(points, { x: 1, y: 1 });
    expect(resA.prediction).toBe("A");
    expect(resA.posteriors[0].label).toBe("A");
    expect(resA.posteriors[0].probability).toBeGreaterThan(0.99);

    const resB = classifyNaiveBayes(points, { x: 9, y: 9 });
    expect(resB.prediction).toBe("B");
    expect(resB.posteriors[0].label).toBe("B");
    expect(resB.posteriors[0].probability).toBeGreaterThan(0.99);
  });

  it("ensures posterior probabilities sum to 1.0", () => {
    const result = classifyNaiveBayes(points, { x: 5, y: 5 });
    const sum = result.posteriors.reduce((acc, p) => acc + p.probability, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("factors in unequal class priors", () => {
    // 9 points in A, 1 point in B
    const skewed = [
      { x: 0, y: 0, label: "A" },
      { x: 1, y: 0, label: "A" },
      { x: 0, y: 1, label: "A" },
      { x: 1, y: 1, label: "A" },
      { x: 0.5, y: 0.5, label: "A" },
      { x: 0.2, y: 0.8, label: "A" },
      { x: 0.8, y: 0.2, label: "A" },
      { x: 0.3, y: 0.7, label: "A" },
      { x: 0.7, y: 0.3, label: "A" },
      { x: 3, y: 3, label: "B" },
      { x: 4, y: 4, label: "B" },
    ];
    const model = fitNaiveBayes(skewed);
    const priorA = model.classes.find((c) => c.label === "A")?.prior;
    const priorB = model.classes.find((c) => c.label === "B")?.prior;
    expect(priorA).toBeCloseTo(9 / 11);
    expect(priorB).toBeCloseTo(2 / 11);
  });

  it("handles zero variance with variance smoothing without throwing", () => {
    const identical = [
      { x: 5, y: 5, label: "A" },
      { x: 5, y: 5, label: "A" },
      { x: 10, y: 10, label: "B" },
      { x: 10, y: 10, label: "B" },
    ];
    const result = classifyNaiveBayes(identical, { x: 5, y: 5 });
    expect(result.prediction).toBe("A");
    expect(Number.isFinite(result.posteriors[0].probability)).toBe(true);
  });

  it("breaks exact ties deterministically using first-seen class", () => {
    const symmetric = [
      { x: -5, y: 0, label: "First" },
      { x: 5, y: 0, label: "Second" },
    ];
    const result = classifyNaiveBayes(symmetric, { x: 0, y: 0 });
    expect(result.prediction).toBe("First");
  });

  it("rejects invalid inputs", () => {
    expect(() => classifyNaiveBayes(points, { x: Infinity, y: 0 })).toThrow(/finite/);
    expect(() => classifyNaiveBayes(points, { x: 0, y: NaN })).toThrow(/finite/);
    expect(() => classifyNaiveBayes(points, { x: 1e13, y: 0 })).toThrow(/finite/);
    expect(() => fitNaiveBayes(points.slice(0, 2))).toThrow(/two to eight/);
  });
});
