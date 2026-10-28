"""Rebuild the frontend's public replay data from the production trainer."""
import json
from pathlib import Path

from app.ml.linear_regression import train
from app.ml.kmeans import train as cluster

EXAMPLES = [
    {
        "id": "study", "title": "Study hours vs exam score", "short": "Study hours",
        "xLabel": "Study hours", "yLabel": "Exam score (%)", "unit": "%",
        "description": "More study time usually improves scores, with natural variation between students.",
        "points": [[1, 27], [1.5, 34], [2, 37], [2.5, 45], [3, 48], [3.5, 52], [4, 59], [4.5, 62], [5, 66], [5.5, 69], [6, 75], [6.5, 77], [7, 83], [7.5, 86], [8, 91], [8.5, 94]],
    },
    {
        "id": "ads", "title": "Advertising spend vs sales", "short": "Advertising spend",
        "xLabel": "Ad spend ($k)", "yLabel": "Sales ($k)", "unit": "$k",
        "description": "A synthetic campaign sample showing how sales may rise with advertising investment.",
        "points": [[5, 18], [7, 23], [9, 27], [11, 26], [13, 33], [15, 36], [17, 38], [19, 43], [21, 44], [23, 51], [25, 53], [27, 55], [29, 62], [31, 63], [33, 68]],
    },
    {
        "id": "salary", "title": "Experience vs salary", "short": "Years of experience",
        "xLabel": "Experience (years)", "yLabel": "Salary ($k)", "unit": "$k",
        "description": "A synthetic salary sample with an upward trend and individual variation.",
        "points": [[0.5, 42], [1, 45], [1.5, 51], [2, 49], [2.5, 55], [3, 61], [3.5, 58], [4, 64], [4.5, 68], [5, 70], [5.5, 74], [6, 77], [6.5, 79], [7, 85], [7.5, 83], [8, 91]],
    },
]

output = []
for example in EXAMPLES:
    output.append({**example, "training": train(example["points"])})
target = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "examples.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
print(f"Generated {target}")

CLUSTER_EXAMPLES = [
    {
        "id": "learning-groups", "title": "Learning patterns", "short": "Learning patterns",
        "xLabel": "Practice hours", "yLabel": "Quiz score (%)",
        "description": "Three synthetic groups of learners with different practice and score patterns.",
        "points": [[1.8, 29.9], [3.4, 26.9], [2.0, 30.8], [0.9, 28.4], [2.4, 37.4], [0.6, 21.7],
                   [0.6, 37.9], [2.7, 13.3], [6.6, 66.9], [5.5, 55.7], [3.8, 36.5], [5.1, 37.9],
                   [3.9, 43.7], [3.4, 50.8], [4.8, 63.0], [5.1, 56.5], [8.0, 81.2], [7.9, 68.9],
                   [9.7, 91.9], [9.2, 82.6], [7.4, 67.3], [7.3, 62.2], [8.9, 72.8], [9.2, 72.4]],
    },
    {
        "id": "store-groups", "title": "Store activity groups", "short": "Store activity",
        "xLabel": "Visits per month", "yLabel": "Spend ($)",
        "description": "Synthetic customer activity with low, medium, and high engagement groups.",
        "points": [[1, 18], [2, 23], [2, 16], [3, 28], [3, 20], [4, 31],
                   [5, 48], [5, 55], [6, 50], [6, 62], [7, 58], [7, 67],
                   [9, 94], [9, 102], [10, 96], [11, 110], [11, 103], [12, 116]],
    },
]
cluster_target = target.with_name("cluster_examples.json")
cluster_target.write_text(json.dumps([
    {**example, "training": cluster(example["points"])} for example in CLUSTER_EXAMPLES
], separators=(",", ":")), encoding="utf-8")
print(f"Generated {cluster_target}")
