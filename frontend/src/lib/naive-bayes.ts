import type { LabeledPoint, Point } from "../types";

export type ClassCentroid = { label: string; x: number; y: number; count: number };

export type NaiveBayesClassStats = {
  label: string;
  count: number;
  prior: number;
  meanX: number;
  varianceX: number;
  meanY: number;
  varianceY: number;
};

export type NaiveBayesPosterior = {
  label: string;
  probability: number;
  logLikelihood: number;
};

export type NaiveBayesModel = {
  classes: NaiveBayesClassStats[];
  centroids: ClassCentroid[];
  totalPoints: number;
};

export type NaiveBayesResult = {
  prediction: string;
  posteriors: NaiveBayesPosterior[];
  stats: NaiveBayesClassStats[];
  centroids: ClassCentroid[];
};

function gaussianLogPdf(value: number, mean: number, variance: number): number {
  return -0.5 * Math.log(2 * Math.PI * variance) - ((value - mean) ** 2) / (2 * variance);
}

export function fitNaiveBayes(points: LabeledPoint[]): NaiveBayesModel {
  if (
    points.length < 2 ||
    points.some(
      (point) =>
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        Math.abs(point.x) > 1e12 ||
        Math.abs(point.y) > 1e12 ||
        !point.label,
    )
  ) {
    throw new Error("At least two valid labeled points are required.");
  }

  const grouped = new Map<string, LabeledPoint[]>();
  for (const point of points) {
    const list = grouped.get(point.label);
    if (!list) grouped.set(point.label, [point]);
    else list.push(point);
  }

  if (grouped.size < 2 || grouped.size > 8) {
    throw new Error("Choose data with two to eight classes.");
  }

  const total = points.length;
  const meanTotalX = points.reduce((sum, p) => sum + p.x, 0) / total;
  const meanTotalY = points.reduce((sum, p) => sum + p.y, 0) / total;
  const varTotalX = points.reduce((sum, p) => sum + (p.x - meanTotalX) ** 2, 0) / total;
  const varTotalY = points.reduce((sum, p) => sum + (p.y - meanTotalY) ** 2, 0) / total;
  const epsilonX = Math.max(varTotalX * 1e-9, 1e-9);
  const epsilonY = Math.max(varTotalY * 1e-9, 1e-9);

  const classes: NaiveBayesClassStats[] = [];
  const centroids: ClassCentroid[] = [];

  for (const [label, classPoints] of grouped.entries()) {
    const count = classPoints.length;
    const meanX = classPoints.reduce((sum, p) => sum + p.x, 0) / count;
    const meanY = classPoints.reduce((sum, p) => sum + p.y, 0) / count;
    const rawVarX = classPoints.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0) / count;
    const rawVarY = classPoints.reduce((sum, p) => sum + (p.y - meanY) ** 2, 0) / count;
    const varianceX = Math.max(rawVarX, epsilonX);
    const varianceY = Math.max(rawVarY, epsilonY);

    classes.push({
      label,
      count,
      prior: count / total,
      meanX,
      varianceX,
      meanY,
      varianceY,
    });
    centroids.push({ label, x: meanX, y: meanY, count });
  }

  return { classes, centroids, totalPoints: total };
}

export function classifyNaiveBayes(points: LabeledPoint[], query: Point): NaiveBayesResult {
  if (![query.x, query.y].every((value) => Number.isFinite(value) && Math.abs(value) <= 1e12)) {
    throw new Error("Enter finite feature values within ±1e12.");
  }

  const model = fitNaiveBayes(points);

  const rawPosteriors = model.classes.map((cls, order) => {
    const logPrior = Math.log(cls.prior);
    const logLikelihoodX = gaussianLogPdf(query.x, cls.meanX, cls.varianceX);
    const logLikelihoodY = gaussianLogPdf(query.y, cls.meanY, cls.varianceY);
    const logLikelihood = logLikelihoodX + logLikelihoodY;
    const logPosterior = logPrior + logLikelihood;
    return { label: cls.label, logPosterior, logLikelihood, order };
  });

  const maxLog = Math.max(...rawPosteriors.map((p) => p.logPosterior));
  const expScores = rawPosteriors.map((p) => Math.exp(p.logPosterior - maxLog));
  const sumExp = expScores.reduce((sum, val) => sum + val, 0);

  const posteriors: NaiveBayesPosterior[] = rawPosteriors
    .map((p, idx) => ({
      label: p.label,
      probability: expScores[idx] / sumExp,
      logLikelihood: p.logLikelihood,
      order: p.order,
    }))
    .sort((a, b) => b.probability - a.probability || a.order - b.order)
    .map(({ label, probability, logLikelihood }) => ({
      label,
      probability,
      logLikelihood,
    }));

  return {
    prediction: posteriors[0].label,
    posteriors,
    stats: model.classes,
    centroids: model.centroids,
  };
}
