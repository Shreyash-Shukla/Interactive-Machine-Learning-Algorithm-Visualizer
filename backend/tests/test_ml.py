import math
import json
from pathlib import Path

import pytest

from app.ml.linear_regression import loss_and_gradients, predict, train


def test_prediction_and_gradients():
    assert predict(2, 1, 3) == 7
    mse, dm, db = loss_and_gradients([(1, 3), (2, 5)], 0, 0)
    assert mse == 17
    assert dm == -13
    assert db == -8


@pytest.mark.parametrize("points,expected_slope,expected_intercept", [
    ([(x, 2*x + 1) for x in range(1, 6)], 2, 1),
    ([(x, -3*x + 7) for x in range(1, 6)], -3, 7),
    ([(1e9*x, 2e8*x + 1e9) for x in range(1, 6)], 0.2, 1e9),
])
def test_convergence(points, expected_slope, expected_intercept):
    result = train(points)
    assert result["final_slope"] == pytest.approx(expected_slope, rel=1e-4)
    assert result["final_intercept"] == pytest.approx(expected_intercept, rel=1e-4)
    assert result["final_metrics"]["mse"] < 1e-7 * max(1, expected_intercept**2)
    assert result["final_metrics"]["r2"] == pytest.approx(1)
    assert result == train(points)
    epochs = [snapshot["epoch"] for snapshot in result["snapshots"]]
    assert epochs[0] == 0 and epochs[-1] == 500
    assert epochs == sorted(set(epochs))
    assert len(epochs) <= 126


def test_initial_state_and_metrics():
    result = train([(1, 3), (2, 5), (3, 7), (4, 9), (5, 11)])
    start = result["snapshots"][0]
    assert start["slope"] == 0
    assert start["intercept"] == 7  # y mean in original coordinates
    assert start["mse"] == 8
    assert start["mae"] == 2.4
    assert start["r2"] == 0


def test_constant_y_and_invalid_data():
    result = train([(1, 5), (2, 5), (3, 5)])
    assert result["final_metrics"] == {"mse": 0, "mae": 0, "r2": None}
    with pytest.raises(ValueError, match="identical"):
        train([(1, 2), (1, 4)])
    with pytest.raises(ValueError, match="finite"):
        train([(1, math.inf), (2, 4)])


def test_bundled_examples_are_generated_by_the_trainer():
    source = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "examples.json"
    for example in json.loads(source.read_text(encoding="utf-8")):
        assert example["training"] == train(example["points"])
