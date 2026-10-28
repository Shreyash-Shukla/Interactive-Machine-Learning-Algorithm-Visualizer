import json
import math
from pathlib import Path

import pytest

from app.ml.kmeans import train


def test_kmeans_groups_and_snapshots_are_deterministic():
    points = [(1, 1), (1.2, 0.9), (9, 9), (9.1, 8.8)]
    result = train(points, clusters=2)
    assert result == train(points, clusters=2)
    assert result["snapshots"][0]["iteration"] == 0
    assert result["snapshots"][-1]["iteration"] == result["total_iterations"]
    assert result["total_iterations"] <= 20
    final = result["snapshots"][-1]
    assert final["assignments"][0] == final["assignments"][1]
    assert final["assignments"][2] == final["assignments"][3]
    assert final["assignments"][0] != final["assignments"][2]
    assert final["inertia"] <= result["snapshots"][0]["inertia"]
    assert all(len(snapshot["assignments"]) == len(points) for snapshot in result["snapshots"])


def test_kmeans_validates_bounds_and_distinct_points():
    with pytest.raises(ValueError, match="distinct"):
        train([(1, 1), (1, 1), (2, 2)], clusters=3)
    with pytest.raises(ValueError, match="finite"):
        train([(1, math.inf), (2, 3)], clusters=2)
    with pytest.raises(ValueError, match="count"):
        train([(1, 1), (2, 2)], clusters=3)


def test_bundled_cluster_examples_come_from_trainer():
    source = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "cluster_examples.json"
    for example in json.loads(source.read_text(encoding="utf-8")):
        assert example["training"] == train(example["points"])
