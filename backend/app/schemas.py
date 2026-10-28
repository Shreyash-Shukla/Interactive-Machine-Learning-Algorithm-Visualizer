from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Point(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    x: float = Field(ge=-1e12, le=1e12)
    y: float = Field(ge=-1e12, le=1e12)


class TrainRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    points: list[Point] = Field(min_length=2, max_length=5000)
    learning_rate: Literal[0.01, 0.05, 0.1] = 0.05
    epochs: Literal[100, 300, 500, 1000] = 500


class KMeansRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    points: list[Point] = Field(min_length=2, max_length=5000)
    clusters: Literal[2, 3, 4, 5] = 3
    max_iterations: Literal[10, 20, 30] = 20


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=1024)
