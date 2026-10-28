import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudUpload,
  LockKeyhole,
  LogOut,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ApiError, login, train, trainKMeans } from "./lib/api";
import { numeric, parseDataset, selectedPoints, validateSelection } from "./lib/dataset";
import { predictKnn } from "./lib/knn";
import { LossChart, RegressionChart } from "./components/Charts";
import { ClusterChart, KnnChart } from "./components/AlgorithmCharts";
import { Button } from "./components/ui/button";
import examplesJson from "./data/examples.json";
import clusterExamplesJson from "./data/cluster_examples.json";
import type { ClusterExample, ClusterTraining, Dataset, Example, Point, Training } from "./types";
import "./App.css";

const examples = examplesJson as Example[];
const clusterExamples = clusterExamplesJson as ClusterExample[];
type Algorithm = "linear" | "kmeans" | "knn";
const algorithmNames: Record<Algorithm, string> = {
  linear: "Linear regression", kmeans: "K-Means clustering", knn: "KNN regression",
};
const format = (value: number | null, digits = 2) =>
  value === null
    ? "Not defined"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        value,
      );
const equation = (slope: number, intercept: number) =>
  `y = ${format(slope, 3)}x ${intercept < 0 ? "−" : "+"} ${format(Math.abs(intercept), 3)}`;

function App() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("linear");
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [trainingBusy, setTrainingBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [slow, setSlow] = useState(false);
  const [learningRate, setLearningRate] = useState(0.05);
  const [epochs, setEpochs] = useState(500);
  const [clusters, setClusters] = useState(3);
  const [maxIterations, setMaxIterations] = useState(20);
  const [neighbors, setNeighbors] = useState(3);
  const [linearInput, setLinearInput] = useState("");
  const [knnInput, setKnnInput] = useState("");
  const [customTraining, setCustomTraining] = useState<Training | null>(null);
  const [customClusterTraining, setCustomClusterTraining] = useState<ClusterTraining | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const linearExample = examples.find((item) => item.id === exampleId) ?? examples[0];
  const clusterExample = clusterExamples.find((item) => item.id === exampleId) ?? clusterExamples[0];
  const example = algorithm === "kmeans" ? clusterExample : linearExample;
  const activeExamples = algorithm === "kmeans" ? clusterExamples : examples;
  const points: Point[] = useMemo(
    () =>
      dataset
        ? selectedPoints(dataset).points
        : example.points.map(([x, y]) => ({ x, y })),
    [dataset, example],
  );
  const selectionError = dataset ? validateSelection(dataset, algorithm, algorithm === "kmeans" ? clusters : neighbors) : null;
  const training: Training | null = algorithm === "linear" ? (dataset
    ? customTraining
    : (customTraining ?? linearExample.training)) : null;
  const clusterTraining: ClusterTraining | null = algorithm === "kmeans" ? (dataset
    ? customClusterTraining
    : (customClusterTraining ?? clusterExample.training)) : null;
  const playback = algorithm === "kmeans" ? clusterTraining : training;
  const snapshot = training?.snapshots[index] ?? null;
  const clusterSnapshot = clusterTraining?.snapshots[index] ?? null;
  const xLabel = dataset?.xColumn ?? example.xLabel;
  const yLabel = dataset?.yColumn ?? example.yLabel;
  const excluded = dataset ? selectedPoints(dataset).excluded : 0;
  const linearX = numeric(linearInput);
  const linearPrediction = training && linearX !== null
    ? training.final_slope * linearX + training.final_intercept : null;
  const knnX = numeric(knnInput);
  const knnResult = algorithm === "knn" && !selectionError && knnX !== null && points.length >= neighbors
    ? predictKnn(points, knnX, neighbors) : null;

  useEffect(() => {
    if (!playing || !playback) return;
    const motionReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setInterval(
      () =>
        setIndex((previous) => {
          if (previous >= playback.snapshots.length - 1) {
            setPlaying(false);
            return previous;
          }
          return previous + 1;
        }),
      motionReduced ? 180 / speed : 65 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, speed, playback]);

  function clearRun() {
    setPlaying(false);
    setIndex(0);
    setCustomTraining(null);
    setCustomClusterTraining(null);
    setLinearInput("");
    setKnnInput("");
    setError("");
  }
  function selectAlgorithm(next: Algorithm) {
    setAlgorithm(next);
    setDataset(null);
    setExampleId(next === "kmeans" ? clusterExamples[0].id : examples[0].id);
    clearRun();
  }
  function selectExample(id: string) {
    setDataset(null);
    setExampleId(id);
    clearRun();
  }
  function selectColumns(xColumn: string, yColumn: string) {
    setDataset((previous) =>
      previous ? { ...previous, xColumn, yColumn } : previous,
    );
    clearRun();
  }
  async function handleFile(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseDataset(file);
      setDataset(parsed);
      clearRun();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read this file.",
      );
    }
  }
  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError("");
    setSlow(false);
    const slowTimer = window.setTimeout(() => setSlow(true), 8000);
    try {
      const result = await login(password);
      setToken(result.access_token);
      setPassword("");
      setLoginOpen(false);
      setError("");
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      window.clearTimeout(slowTimer);
      setLoginBusy(false);
      setSlow(false);
    }
  }
  async function runTraining() {
    if (!token || trainingBusy || selectionError) return;
    setTrainingBusy(true);
    setError("");
    setSlow(false);
    setPlaying(false);
    const slowTimer = window.setTimeout(() => setSlow(true), 8000);
    try {
      if (algorithm === "kmeans") {
        const result = await trainKMeans(points, clusters, maxIterations, token);
        setCustomClusterTraining(result);
      } else {
        const result = await train(points, learningRate, epochs, token);
        setCustomTraining(result);
      }
      setIndex(0);
      setPlaying(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setToken(null);
        setLoginOpen(true);
        setLoginError("Your session expired. Please sign in again.");
      } else
        setError(cause instanceof Error ? cause.message : "Training failed.");
    } finally {
      window.clearTimeout(slowTimer);
      setTrainingBusy(false);
      setSlow(false);
    }
  }
  function signOut() {
    setToken(null);
    setDataset(null);
    setCustomTraining(null);
    setCustomClusterTraining(null);
    setIndex(0);
    setPlaying(false);
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Activity size={22} strokeWidth={1.8} />
          </span>
          <div>
            <div className="brand-name">
              ML Lab<span className="brand-dot">.</span>
            </div>
            <div className="brand-tagline">Watch machine learning happen.</div>
          </div>
        </div>
        <div className="header-middle">
          <span className="status-dot" /> {algorithmNames[algorithm]}{" "}
          <span className="header-divider" />{" "}
          <span className="header-sub">Algorithm visualizer</span>
        </div>
        <div className="header-actions">
          {token ? (
            <>
              <span className="admin-pill">
                <LockKeyhole size={12} /> Admin workspace
              </span>
              <button className="ghost small" type="button" onClick={signOut}>
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <button
              className="ghost small"
              type="button"
              onClick={() => setLoginOpen(true)}
            >
              <LockKeyhole size={15} /> Admin login
            </button>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${token ? "" : "public-sidebar"}`}>
          <div className="sidebar-intro">
            <h2>Experiment setup</h2>
            <p>Choose an algorithm and dataset, then explore how it reaches a result.</p>
          </div>

          <section className="side-section algorithm-section">
            <div className="section-label">Algorithm</div>
            <label className="field-label" htmlFor="algorithm-select">Choose an algorithm</label>
            <div className="select-wrap">
              <select id="algorithm-select" value={algorithm} onChange={(event) => selectAlgorithm(event.target.value as Algorithm)}>
                <option value="linear">Linear regression</option>
                <option value="kmeans">K-Means clustering</option>
                <option value="knn">KNN regression</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </section>

          <section className="side-section dataset-section">
            <div className="section-label">
              Dataset
            </div>
            <label className="field-label" htmlFor="example-select">
              Example datasets
            </label>
            <div className="select-wrap">
              <select
                id="example-select"
                value={dataset ? "" : exampleId}
                onChange={(event) => selectExample(event.target.value)}
              >
                {dataset && <option value="">Uploaded dataset</option>}
                {activeExamples.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
            {dataset ? (
              <div className="dataset-card">
                <div className="dataset-text">
                  <strong>{dataset.name}</strong>
                  <span>
                    {format(dataset.bytes / 1024, 1)} KB · {dataset.rows.length}{" "}
                    rows
                  </span>
                </div>
              </div>
            ) : (
              <div className="dataset-card">
                <div className="dataset-text">
                  <strong>Synthetic example</strong>
                  <span>{points.length} data points · precomputed replay</span>
                </div>
              </div>
            )}
            <p className="side-hint">
              {dataset
                ? `${points.length} usable rows · ${excluded} excluded for the selected columns.`
                : example.description}
            </p>
          </section>

          {token && (
            <>
              <section className="side-section">
                <div className="section-label">
                  Your data
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="sr-only"
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <div
                  className={`dropzone ${dragging ? "dragging" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload CSV or JSON dataset"
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void handleFile(event.dataTransfer.files[0]);
                  }}
                >
                  <CloudUpload size={22} />
                  <strong>Drop a file or browse</strong>
                  <span>CSV or JSON · max 5 MB</span>
                </div>
                {dataset && (
                  <>
                    <div className="column-grid">
                      <div>
                        <label className="field-label" htmlFor="x-column">
                          X axis
                        </label>
                        <div className="select-wrap">
                          <select
                            id="x-column"
                            value={dataset.xColumn}
                            onChange={(event) =>
                              selectColumns(event.target.value, dataset.yColumn)
                            }
                          >
                            {dataset.numericColumns.map((column) => (
                              <option key={column}>{column}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="y-column">
                          Y axis
                        </label>
                        <div className="select-wrap">
                          <select
                            id="y-column"
                            value={dataset.yColumn}
                            onChange={(event) =>
                              selectColumns(dataset.xColumn, event.target.value)
                            }
                          >
                            {dataset.numericColumns.map((column) => (
                              <option key={column}>{column}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                    <details className="preview">
                      <summary>
                        Preview first 10 rows <ChevronDown size={14} />
                      </summary>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              {dataset.columns.map((column) => (
                                <th key={column}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dataset.rows.slice(0, 10).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {dataset.columns.map((column) => (
                                  <td key={column}>
                                    {String(row[column] ?? "—")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                )}
              </section>
              {algorithm !== "knn" && <section className="side-section settings-section">
                <div className="section-label">
                  Training setup
                </div>
                {algorithm === "linear" ? <>
                <label className="field-label" htmlFor="learning-rate">
                  Learning rate{" "}
                  <span title="How large each gradient descent update is.">
                    <CircleHelp size={13} />
                  </span>
                </label>
                <div className="select-wrap">
                  <select
                    id="learning-rate"
                    value={learningRate}
                    onChange={(event) =>
                      setLearningRate(Number(event.target.value))
                    }
                  >
                    <option value={0.01}>0.01 · Gentle</option>
                    <option value={0.05}>0.05 · Balanced</option>
                    <option value={0.1}>0.1 · Fast</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
                <label className="field-label spaced" htmlFor="epochs">
                  Epochs{" "}
                  <span title="The number of full passes over the selected data.">
                    <CircleHelp size={13} />
                  </span>
                </label>
                <div className="select-wrap">
                  <select
                    id="epochs"
                    value={epochs}
                    onChange={(event) => setEpochs(Number(event.target.value))}
                  >
                    {[100, 300, 500, 1000].map((value) => (
                      <option key={value} value={value}>
                        {value} epochs
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
                </> : <>
                  <label className="field-label" htmlFor="cluster-count">Clusters (K)</label>
                  <div className="select-wrap">
                    <select id="cluster-count" value={clusters} onChange={(event) => { setClusters(Number(event.target.value)); clearRun(); }}>
                      {[2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} clusters</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                  <label className="field-label spaced" htmlFor="max-iterations">Maximum iterations</label>
                  <div className="select-wrap">
                    <select id="max-iterations" value={maxIterations} onChange={(event) => setMaxIterations(Number(event.target.value))}>
                      {[10, 20, 30].map((value) => <option key={value} value={value}>{value} iterations</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </>}
                {selectionError && (
                  <p className="field-error" role="alert">
                    {selectionError}
                  </p>
                )}
                <Button
                  className="primary train-button"
                  type="button"
                  disabled={trainingBusy || !!selectionError}
                  onClick={() => void runTraining()}
                >
                  {trainingBusy ? (
                    <>
                      <span className="spinner" /> Training on server…
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal size={16} /> Train model{" "}
                      <ArrowRight size={17} />
                    </>
                  )}
                </Button>
                <p className="side-hint center">
                  Training runs on the backend. Your data is kept in memory.
                </p>
              </section>
              }
            </>
          )}

          {!token && (
            <div className="public-note">
              <div>
                <strong>Example replay</strong>
                <p>
                  {algorithm === "knn" ? "Try a prediction with the sample points. Sign in to use your own data." :
                    "Real training snapshots are bundled with the site. Sign in to train your own data."}
                </p>
              </div>
            </div>
          )}
        </aside>

        <main className="main-content">
          <div className="content-heading">
            <div>
            <div className="eyebrow violet">{algorithmNames[algorithm]} / {algorithm === "knn" ? "Prediction" : "Training replay"}</div>
              <h1>{dataset ? dataset.name : example.title}</h1>
              <p>
                {dataset
                  ? `A custom dataset with ${points.length} usable points.`
                  : algorithm === "knn" ? "See which nearby examples shape a prediction." :
                    algorithm === "kmeans" ? "Watch the cluster centers move toward groups of points." :
                    "Watch a model improve its fit with every recorded step."}
              </p>
            </div>
            <span className="mode-badge">
              <span /> {dataset ? "Custom data" : "Example data"}
            </span>
          </div>

          <div className="mobile-algorithm">
            <label htmlFor="mobile-algorithm-select">Choose an algorithm</label>
            <div className="select-wrap">
              <select id="mobile-algorithm-select" value={algorithm} onChange={(event) => selectAlgorithm(event.target.value as Algorithm)}>
                <option value="linear">Linear regression</option>
                <option value="kmeans">K-Means clustering</option>
                <option value="knn">KNN regression</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>

          <div className="mobile-dataset">
            <label htmlFor="mobile-example-select">Explore a dataset</label>
            <div className="select-wrap">
              <select
                id="mobile-example-select"
                value={dataset ? "" : exampleId}
                onChange={(event) => selectExample(event.target.value)}
              >
                {dataset && <option value="">Uploaded dataset</option>}
                {activeExamples.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {slow && (
            <div className="slow-banner" role="status">
              <Clock3 size={16} /> The free backend may be waking up. Please
              keep this page open.
            </div>
          )}

          <section className="panel graph-panel">
            <div className="panel-top">
              <div className="panel-title">
                <div>
                  <h3>{algorithm === "linear" ? "Model fit" : algorithm === "kmeans" ? "Cluster map" : "Neighbor map"}</h3>
                  <span>{points.length} observations · {xLabel} → {yLabel}</span>
                </div>
              </div>
              <span className="live-indicator">
                <span />{" "}
                {trainingBusy ? "Training" : playing ? "Playing" : "Ready"}
              </span>
            </div>
            {algorithm === "linear" ? <RegressionChart
              points={points}
              snapshot={snapshot}
              xLabel={xLabel}
              yLabel={yLabel}
            /> : algorithm === "kmeans" ? <ClusterChart
              points={points} snapshot={clusterSnapshot} clusters={clusterTraining?.settings.clusters ?? clusters}
              xLabel={xLabel} yLabel={yLabel}
            /> : <KnnChart points={points} query={knnX} prediction={knnResult?.prediction ?? null}
              neighbors={knnResult?.neighbors ?? []} xLabel={xLabel} yLabel={yLabel} />}
            {algorithm === "linear" ? <div className="equation-strip">
              <span>Current model</span>
              <strong>
                {snapshot
                  ? equation(snapshot.slope, snapshot.intercept)
                  : "Train to see a fitted line"}
              </strong>
              <span className="epoch-chip">
                {snapshot ? `Epoch ${snapshot.epoch}` : "No run"}
              </span>
            </div> : algorithm === "kmeans" ? <div className="equation-strip">
              <span>Current iteration</span>
              <strong>{clusterSnapshot ? `${clusterSnapshot.iteration} / ${clusterTraining?.total_iterations}` : "Train to see clusters"}</strong>
              <span className="epoch-chip">{clusterSnapshot ? `${clusterTraining?.settings.clusters} clusters` : "No run"}</span>
            </div> : <div className="equation-strip">
              <span>Prediction</span>
              <strong>{knnResult ? `${yLabel} ≈ ${format(knnResult.prediction)}` : "Enter X to predict Y"}</strong>
              <span className="epoch-chip">K = {neighbors}</span>
            </div>}
          </section>

          {algorithm === "linear" && training && <section className="panel prediction-panel">
            <div className="panel-title"><div><h3>Predict with the final model</h3><span>Final equation: {equation(training.final_slope, training.final_intercept)} · after {training.total_epochs} epochs</span></div></div>
            <div className="prediction-row">
              <label htmlFor="linear-predict-x">{xLabel} (X)</label>
              <input id="linear-predict-x" type="number" inputMode="decimal" value={linearInput}
                onChange={(event) => setLinearInput(event.target.value)} placeholder="Enter an X value" />
              <div className="prediction-result" aria-live="polite">
                <span>Predicted {yLabel}</span>
                <strong>{linearPrediction !== null && Number.isFinite(linearPrediction) ? format(linearPrediction) : "—"}</strong>
              </div>
            </div>
            {linearInput && linearX === null && <p className="field-error">Enter a finite X value within ±1e12.</p>}
            {linearPrediction !== null && !Number.isFinite(linearPrediction) && <p className="field-error">This X value produces a result outside the supported numeric range.</p>}
            {linearX !== null && (linearX < Math.min(...points.map((point) => point.x)) || linearX > Math.max(...points.map((point) => point.x))) &&
              <p className="side-hint">This is outside the training data range, so the prediction is an extrapolation.</p>}
          </section>}

          {algorithm === "knn" && <section className="panel prediction-panel">
            <div className="panel-title"><div><h3>Find a prediction</h3><span>The closest {neighbors} X values determine the average Y.</span></div></div>
            <div className="prediction-settings">
              <label className="field-label" htmlFor="neighbor-count">Nearest neighbors (K)</label>
              <div className="select-wrap">
                <select id="neighbor-count" value={neighbors} onChange={(event) => setNeighbors(Number(event.target.value))}>
                  {[1, 3, 5, 7, 9].map((value) => <option key={value} value={value}>{value} neighbors</option>)}
                </select><ChevronDown size={16} />
              </div>
            </div>
            <div className="prediction-row">
              <label htmlFor="knn-predict-x">{xLabel} (X)</label>
              <input id="knn-predict-x" type="number" inputMode="decimal" value={knnInput}
                onChange={(event) => setKnnInput(event.target.value)} placeholder="Enter an X value" />
              <div className="prediction-result" aria-live="polite">
                <span>Predicted {yLabel}</span><strong>{knnResult ? format(knnResult.prediction) : "—"}</strong>
              </div>
            </div>
            {knnInput && knnX === null && <p className="field-error">Enter a finite X value within ±1e12.</p>}
            {selectionError && <p className="field-error">{selectionError}</p>}
            {knnResult && <p className="side-hint">Using points at X = {knnResult.neighbors.map(({ point }) => format(point.x)).join(", ")}.</p>}
            <p className="side-hint">KNN averages nearby Y values. It does not train over epochs.</p>
          </section>}

          {algorithm !== "knn" && <section className="panel playback-panel">
            <div className="playback-main">
              <div className="playback-buttons">
                <button
                  className="play-button"
                  type="button"
                  disabled={!playback}
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => {
                    if (playback && index >= playback.snapshots.length - 1)
                      setIndex(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                </button>
                <button
                  className="icon-button"
                  type="button"
                  disabled={!playback}
                  title="Restart playback"
                  aria-label="Restart playback"
                  onClick={() => {
                    setIndex(0);
                    setPlaying(true);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="timeline">
                <div className="timeline-labels">
                  <strong>{algorithm === "kmeans" ? "Clustering progress" : "Training progress"}</strong>
                  <span>
                    {algorithm === "kmeans" ? `Iteration ${clusterSnapshot?.iteration ?? 0} / ${clusterTraining?.total_iterations ?? maxIterations}` :
                      `Epoch ${snapshot?.epoch ?? 0} / ${training?.total_epochs ?? epochs}`}
                  </span>
                </div>
                <div
                  className="timeline-track"
                  style={
                    {
                      "--progress": `${playback ? (index / Math.max(1, playback.snapshots.length - 1)) * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                >
                  <input
                    type="range"
                    aria-label="Training timeline"
                    min={0}
                    max={Math.max(0, (playback?.snapshots.length ?? 1) - 1)}
                    value={index}
                    disabled={!playback}
                    onChange={(event) => {
                      setPlaying(false);
                      setIndex(Number(event.target.value));
                    }}
                  />
                </div>
              </div>
              <div className="speed">
                <label htmlFor="playback-speed">Speed</label>
                <div className="select-wrap">
                  <select
                    id="playback-speed"
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </section>}

          {algorithm === "linear" && <div className="bottom-grid">
            <section className="panel metrics-panel">
              <div className="panel-title">
                <div>
                  <h3>Model metrics</h3>
                  <span>On the selected training data</span>
                </div>
              </div>
              <div className="metrics-grid">
                <div className="metric">
                  <span>Mean squared error</span>
                  <strong>{snapshot ? format(snapshot.mse) : "—"}</strong>
                  <small>Average squared error</small>
                </div>
                <div className="metric">
                  <span>Mean absolute error</span>
                  <strong>{snapshot ? format(snapshot.mae) : "—"}</strong>
                  <small>Average absolute error</small>
                </div>
                <div className="metric">
                  <span>R² score</span>
                  <strong>{snapshot ? format(snapshot.r2, 3) : "—"}</strong>
                  <small>Explained variation</small>
                </div>
                <div className="metric">
                  <span>Current epoch</span>
                  <strong>{snapshot?.epoch ?? "—"}</strong>
                  <small>of {training?.total_epochs ?? epochs} epochs</small>
                </div>
              </div>
            </section>
            <section className="panel loss-panel">
              <div className="panel-title">
                <div>
                  <h3>
                    Training loss{" "}
                    <span title="Loss measures how far predictions are from actual values. Lower loss usually means a better fit.">
                      <CircleHelp size={13} />
                    </span>
                  </h3>
                  <span>Mean squared error over time</span>
                </div>
              </div>
              {training ? (
                <LossChart snapshots={training.snapshots} current={snapshot} />
              ) : (
                <div className="empty-loss">
                  Train the model to see loss over time.
                </div>
              )}
            </section>
          </div>}
          {algorithm === "kmeans" && <div className="bottom-grid">
            <section className="panel metrics-panel">
              <div className="panel-title"><div><h3>Cluster summary</h3><span>At the selected iteration</span></div></div>
              <div className="metrics-grid">
                <div className="metric"><span>Inertia</span><strong>{clusterSnapshot ? format(clusterSnapshot.inertia) : "—"}</strong><small>Sum of squared scaled distances</small></div>
                <div className="metric"><span>Iteration</span><strong>{clusterSnapshot?.iteration ?? "—"}</strong><small>of {clusterTraining?.total_iterations ?? maxIterations}</small></div>
                <div className="metric"><span>Clusters</span><strong>{clusterTraining?.settings.clusters ?? clusters}</strong><small>Requested groups</small></div>
                <div className="metric"><span>Assigned points</span><strong>{clusterSnapshot?.assignments.length ?? "—"}</strong><small>From the selected data</small></div>
              </div>
            </section>
            <section className="panel loss-panel">
              <div className="panel-title"><div><h3>Inertia over time</h3><span>Lower values mean points are closer to their centers.</span></div></div>
              {clusterTraining ? <LossChart stepLabel="Iteration" valueLabel="Inertia"
                snapshots={clusterTraining.snapshots.map((item) => ({ epoch: item.iteration, loss: item.inertia }))}
                current={clusterSnapshot ? { epoch: clusterSnapshot.iteration, loss: clusterSnapshot.inertia } : null} /> :
                <div className="empty-loss">Train the model to see inertia over time.</div>}
            </section>
          </div>}
          <footer className="app-footer">
            <span>
              <span className="footer-dot" /> {algorithm === "linear" ? "Batch gradient descent" : algorithm === "kmeans" ? "K-Means iterations" : "Nearest neighbor averaging"} · Computed from scratch
            </span>
            <span>
              {token ? "Admin session" : "Public demo"}{" "}
              <span className="footer-separator">·</span> ML LAB v1.0
            </span>
          </footer>
        </main>
      </div>

      <Dialog.Root
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (!open) {
            setLoginError("");
            setPassword("");
            setShowPassword(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div className="dialog-icon">
              <LockKeyhole size={22} />
            </div>
            <Dialog.Title>Admin sign in</Dialog.Title>
            <Dialog.Description>
              Enter your administrator password to train models and use your own
              datasets.
            </Dialog.Description>
            <form onSubmit={(event) => void submitLogin(event)}>
              <label htmlFor="admin-password">Password</label>
              <div className="password-wrap"><input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                placeholder="Enter your password"
              /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button></div>
              {loginError && (
                <p className="field-error" role="alert">
                  {loginError}
                </p>
              )}
              {slow && (
                <p className="dialog-slow">
                  The free server may be starting. Please wait…
                </p>
              )}
              <Button className="primary" type="submit" disabled={loginBusy}>
                {loginBusy ? (
                  <>
                    <span className="spinner" /> Connecting…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
            <div className="dialog-foot">
              <Check size={14} /> Secure, short-lived session
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export default App;
