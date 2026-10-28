"""Deterministic, bounded K-Means clustering for two numeric features."""

from __future__ import annotations

import math
from typing import Iterable


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def train(points: Iterable[tuple[float, float]], clusters: int = 3,
          max_iterations: int = 20) -> dict:
    data = list(points)
    if not 2 <= len(data) <= 5000:
        raise ValueError("Provide between 2 and 5,000 points")
    if not 2 <= clusters <= 5 or not 1 <= max_iterations <= 30:
        raise ValueError("Unsupported clustering settings")
    if clusters > len(data):
        raise ValueError("Cluster count cannot exceed the number of points")
    if any(not math.isfinite(x) or not math.isfinite(y) or abs(x) > 1e12 or abs(y) > 1e12 for x, y in data):
        raise ValueError("Coordinates must be finite and within ±1e12")

    # Scale each axis so a large unit (such as salary) cannot dominate distance.
    means = tuple(math.fsum(point[axis] for point in data) / len(data) for axis in (0, 1))
    scales = tuple(max(abs(point[axis] - means[axis]) for point in data) or 1.0 for axis in (0, 1))
    normalized = [((x - means[0]) / scales[0], (y - means[1]) / scales[1]) for x, y in data]
    if len(set(normalized)) < clusters:
        raise ValueError("Choose fewer clusters than distinct points")

    # Farthest-first seeding is deterministic and gives separated initial centers.
    centers = [normalized[0]]
    while len(centers) < clusters:
        centers.append(max(normalized, key=lambda point: min(_distance(point, center) for center in centers)))

    def snapshot(iteration: int) -> dict:
        assignments = [min(range(clusters), key=lambda index: _distance(point, centers[index])) for point in normalized]
        inertia = math.fsum(_distance(point, centers[group]) for point, group in zip(normalized, assignments))
        original_centers = [
            [center[0] * scales[0] + means[0], center[1] * scales[1] + means[1]]
            for center in centers
        ]
        return {"iteration": iteration, "centroids": original_centers,
                "assignments": assignments, "inertia": inertia}

    snapshots = [snapshot(0)]
    for iteration in range(1, max_iterations + 1):
        previous = snapshots[-1]["assignments"]
        next_centers = []
        for group in range(clusters):
            members = [point for point, assigned in zip(normalized, previous) if assigned == group]
            next_centers.append((
                math.fsum(point[0] for point in members) / len(members),
                math.fsum(point[1] for point in members) / len(members),
            ) if members else centers[group])
        if next_centers == centers:
            break
        centers = next_centers
        snapshots.append(snapshot(iteration))
        if snapshots[-1]["assignments"] == previous:
            break

    return {"settings": {"clusters": clusters, "max_iterations": max_iterations},
            "total_iterations": snapshots[-1]["iteration"], "snapshots": snapshots}
