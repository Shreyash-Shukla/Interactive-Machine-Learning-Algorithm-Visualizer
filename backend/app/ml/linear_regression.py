"""Deterministic, from-scratch batch gradient descent for one feature."""

from __future__ import annotations

import math
from typing import Iterable


def predict(slope: float, intercept: float, x: float) -> float:
    return slope * x + intercept


def loss_and_gradients(points: list[tuple[float, float]], slope: float, intercept: float) -> tuple[float, float, float]:
    n = len(points)
    errors = [predict(slope, intercept, x) - y for x, y in points]
    return (
        sum(error * error for error in errors) / n,
        2 * sum(error * x for error, (x, _) in zip(errors, points)) / n,
        2 * sum(errors) / n,
    )


def _mean(values: list[float]) -> float:
    # Translation around the first value avoids overflow for large, close values.
    anchor = values[0]
    return anchor + math.fsum(value - anchor for value in values) / len(values)


def _standardize(values: list[float]) -> tuple[list[float], float, float]:
    center = _mean(values)
    spread = max(abs(value - center) for value in values)
    if spread == 0:
        return [0.0] * len(values), center, 0.0
    variance = math.fsum(((value - center) / spread) ** 2 for value in values) / len(values)
    scale = spread * math.sqrt(variance)
    return [(value - center) / scale for value in values], center, scale


def _snapshot(epoch: int, normalized_slope: float, normalized_intercept: float,
              x_mean: float, x_scale: float, y_mean: float, y_scale: float,
              points: list[tuple[float, float]]) -> dict:
    slope = normalized_slope * y_scale / x_scale
    intercept = y_mean + normalized_intercept * y_scale - slope * x_mean
    # Evaluate using centered coordinates so large offsets do not erase the fit.
    errors = [
        (normalized_slope * ((x - x_mean) / x_scale) + normalized_intercept) * y_scale + y_mean - y
        for x, y in points
    ]
    mse = math.fsum(error * error for error in errors) / len(points)
    mae = math.fsum(abs(error) for error in errors) / len(points)
    variation = math.fsum((y - y_mean) ** 2 for _, y in points)
    r2 = None if variation == 0 else 1 - math.fsum(error * error for error in errors) / variation
    result = {"epoch": epoch, "slope": slope, "intercept": intercept,
              "mse": mse, "mae": mae, "r2": r2, "loss": mse}
    if not all(math.isfinite(value) for value in result.values() if isinstance(value, float)):
        raise ValueError("Training became numerically unstable for this dataset")
    return result


def train(points: Iterable[tuple[float, float]], learning_rate: float = 0.05, epochs: int = 500) -> dict:
    data = list(points)
    if not 2 <= len(data) <= 5000:
        raise ValueError("Provide between 2 and 5,000 points")
    if learning_rate not in (0.01, 0.05, 0.1) or epochs not in (100, 300, 500, 1000):
        raise ValueError("Unsupported training settings")
    if any(not math.isfinite(x) or not math.isfinite(y) or abs(x) > 1e12 or abs(y) > 1e12 for x, y in data):
        raise ValueError("Coordinates must be finite and within ±1e12")
    xs, x_mean, x_scale = _standardize([point[0] for point in data])
    ys, y_mean, y_scale = _standardize([point[1] for point in data])
    if x_scale == 0:
        raise ValueError("X values must not all be identical")
    effective_y_scale = y_scale or 1.0
    normalized = list(zip(xs, ys))
    slope = intercept = 0.0
    saved_epochs = {round(i * epochs / min(125, epochs)) for i in range(min(125, epochs) + 1)}
    snapshots = []
    for epoch in range(epochs + 1):
        if epoch in saved_epochs:
            snapshots.append(_snapshot(epoch, slope, intercept, x_mean, x_scale,
                                       y_mean, effective_y_scale, data))
        if epoch < epochs:
            _, dm, db = loss_and_gradients(normalized, slope, intercept)
            slope -= learning_rate * dm
            intercept -= learning_rate * db
    final = snapshots[-1]
    return {"settings": {"learning_rate": learning_rate, "epochs": epochs},
            "total_epochs": epochs, "final_slope": final["slope"],
            "final_intercept": final["intercept"],
            "final_metrics": {key: final[key] for key in ("mse", "mae", "r2")},
            "snapshots": snapshots}
