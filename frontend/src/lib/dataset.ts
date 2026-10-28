import Papa from "papaparse";
import type { Dataset, LabeledPoint, Point } from "../types";

const MAX_FILE = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

export function numeric(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= 1e12 ? parsed : null;
}

export function selectedPoints(dataset: Dataset): {
  points: Point[];
  excluded: number;
} {
  const points = dataset.rows.flatMap((row) => {
    const x = numeric(row[dataset.xColumn]);
    const y = numeric(row[dataset.yColumn]);
    return x === null || y === null ? [] : [{ x, y }];
  });
  return { points, excluded: dataset.rows.length - points.length };
}

export function classLabel(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const label = String(value).trim();
  return label && label.length <= 60 ? label : null;
}

export function selectedLabeledPoints(dataset: Dataset): { points: LabeledPoint[]; excluded: number } {
  const points = dataset.rows.flatMap((row) => {
    const x = numeric(row[dataset.xColumn]);
    const y = numeric(row[dataset.yColumn]);
    const label = classLabel(row[dataset.labelColumn]);
    return x === null || y === null || label === null ? [] : [{ x, y, label }];
  });
  return { points, excluded: dataset.rows.length - points.length };
}

export function validateClassificationSelection(dataset: Dataset, k: number): string | null {
  if (!dataset.labelColumn || !dataset.columns.includes(dataset.labelColumn))
    return "Choose a class label column.";
  if (new Set([dataset.xColumn, dataset.yColumn, dataset.labelColumn]).size !== 3)
    return "Choose three different columns for the features and class label.";
  const { points } = selectedLabeledPoints(dataset);
  if (points.length < Math.max(2, k))
    return `At least ${Math.max(2, k)} rows need two numeric features and a class label.`;
  if (new Set(points.map((point) => point.label)).size < 2)
    return "At least two different classes are required.";
  if (new Set(points.map((point) => JSON.stringify([point.x, point.y]))).size < 2)
    return "Feature pairs must not all be identical.";
  if (new Set(points.map((point) => point.label)).size > 8)
    return "Choose a label column with at most eight classes.";
  return null;
}

export function validateSelection(dataset: Dataset, algorithm: "linear" | "kmeans" | "knn" = "linear", count = 2): string | null {
  if (dataset.xColumn === dataset.yColumn)
    return "Choose different X and Y columns.";
  const { points } = selectedPoints(dataset);
  if (points.length < 2)
    return "At least two rows need valid numeric values for both columns.";
  if (points.length > MAX_ROWS)
    return "Only up to 5,000 usable rows can be trained.";
  if (algorithm === "linear" && points.every((point) => point.x === points[0].x))
    return "X values must vary to fit a line.";
  if (algorithm === "kmeans" && new Set(points.map((point) => `${point.x},${point.y}`)).size < count)
    return `Choose at least ${count} distinct points for clustering.`;
  if (algorithm === "knn" && points.length < count)
    return `Choose at least ${count} usable points for KNN.`;
  return null;
}

export async function parseDataset(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE)
    throw new Error("File is larger than the 5 MB limit.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv" && extension !== "json")
    throw new Error("Choose a CSV or JSON file.");
  const text = await file.text();
  let rows: Record<string, unknown>[];
  if (extension === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("This JSON file could not be parsed.");
    }
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (row) => row && typeof row === "object" && !Array.isArray(row),
      )
    ) {
      throw new Error("JSON must be an array of flat objects.");
    }
    rows = parsed as Record<string, unknown>[];
    if (
      rows.some((row) =>
        Object.values(row).some(
          (value) => value !== null && typeof value === "object",
        ),
      )
    ) {
      throw new Error("Nested JSON values are not supported.");
    }
  } else {
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });
    if (parsed.errors.length)
      throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
    rows = parsed.data;
  }
  if (!rows.length) throw new Error("The file has no data rows.");
  if (rows.length > MAX_ROWS)
    throw new Error(
      "The file has more than 5,000 rows. Please use a smaller dataset.",
    );
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  ).filter(Boolean);
  const numericColumns = columns.filter((column) =>
    rows.some((row) => numeric(row[column]) !== null),
  );
  if (numericColumns.length < 2)
    throw new Error("At least two numeric columns are required.");
  const candidate: Dataset = {
    name: file.name,
    bytes: file.size,
    rows,
    columns,
    numericColumns,
    xColumn: numericColumns[0],
    yColumn: numericColumns[1],
    labelColumn: columns.find((column) => !numericColumns.includes(column)) ??
      columns.find((column) => column !== numericColumns[0] && column !== numericColumns[1]) ?? "",
  };
  if (
    !numericColumns.some((xColumn) =>
      numericColumns.some(
        (yColumn) =>
          xColumn !== yColumn &&
          !validateSelection({ ...candidate, xColumn, yColumn }, "knn"),
      ),
    )
  ) {
    throw new Error(
      "No numeric column pair has two usable points.",
    );
  }
  return candidate;
}
