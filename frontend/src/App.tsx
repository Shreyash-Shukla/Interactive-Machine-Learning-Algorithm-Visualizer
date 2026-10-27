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
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ApiError, login, train } from "./lib/api";
import { parseDataset, selectedPoints, validateSelection } from "./lib/dataset";
import { LossChart, RegressionChart } from "./components/Charts";
import { Button } from "./components/ui/button";
import examplesJson from "./data/examples.json";
import type { Dataset, Example, Point, Training } from "./types";
import "./App.css";

const examples = examplesJson as Example[];
const format = (value: number | null, digits = 2) =>
  value === null
    ? "Not defined"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        value,
      );
const equation = (slope: number, intercept: number) =>
  `y = ${format(slope, 3)}x ${intercept < 0 ? "−" : "+"} ${format(Math.abs(intercept), 3)}`;

function App() {
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [trainingBusy, setTrainingBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [slow, setSlow] = useState(false);
  const [learningRate, setLearningRate] = useState(0.05);
  const [epochs, setEpochs] = useState(500);
  const [customTraining, setCustomTraining] = useState<Training | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const example = examples.find((item) => item.id === exampleId) ?? examples[0];
  const points: Point[] = useMemo(
    () =>
      dataset
        ? selectedPoints(dataset).points
        : example.points.map(([x, y]) => ({ x, y })),
    [dataset, example],
  );
  const selectionError = dataset ? validateSelection(dataset) : null;
  const training = dataset
    ? customTraining
    : (customTraining ?? example.training);
  const snapshot = training?.snapshots[index] ?? null;
  const xLabel = dataset?.xColumn ?? example.xLabel;
  const yLabel = dataset?.yColumn ?? example.yLabel;
  const excluded = dataset ? selectedPoints(dataset).excluded : 0;

  useEffect(() => {
    if (!playing || !training) return;
    const motionReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setInterval(
      () =>
        setIndex((previous) => {
          if (previous >= training.snapshots.length - 1) {
            setPlaying(false);
            return previous;
          }
          return previous + 1;
        }),
      motionReduced ? 180 / speed : 65 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, speed, training]);

  function clearRun() {
    setPlaying(false);
    setIndex(0);
    setCustomTraining(null);
    setError("");
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
      const result = await train(points, learningRate, epochs, token);
      setCustomTraining(result);
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
          <span className="status-dot" /> Linear regression{" "}
          <span className="header-divider" />{" "}
          <span className="header-sub">Gradient descent lab</span>
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
        <aside className="sidebar">
          <div className="sidebar-intro">
            <h2>Experiment setup</h2>
            <p>Choose data, then follow how the fitted line changes with each training step.</p>
          </div>

          <section className="side-section">
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
                {examples.map((item) => (
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
              <section className="side-section settings-section">
                <div className="section-label">
                  Training setup
                </div>
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
            </>
          )}

          {!token && (
            <div className="public-note">
              <div>
                <strong>Example replay</strong>
                <p>
                  These real training snapshots are bundled with the site. Sign
                  in as admin to train your own data.
                </p>
              </div>
            </div>
          )}
        </aside>

        <main className="main-content">
          <div className="content-heading">
            <div>
              <div className="eyebrow violet">Linear regression / Training replay</div>
              <h1>{dataset ? dataset.name : example.title}</h1>
              <p>
                {dataset
                  ? `A custom dataset with ${points.length} usable points.`
                  : "Watch a model improve its fit with every recorded step."}
              </p>
            </div>
            <span className="mode-badge">
              <span /> {dataset ? "Custom data" : "Example data"}
            </span>
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
                {examples.map((item) => (
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
                  <h3>Model fit</h3>
                  <span>{points.length} observations · {xLabel} → {yLabel}</span>
                </div>
              </div>
              <span className="live-indicator">
                <span />{" "}
                {trainingBusy ? "Training" : playing ? "Playing" : "Ready"}
              </span>
            </div>
            <RegressionChart
              points={points}
              snapshot={snapshot}
              xLabel={xLabel}
              yLabel={yLabel}
            />
            <div className="equation-strip">
              <span>Current model</span>
              <strong>
                {snapshot
                  ? equation(snapshot.slope, snapshot.intercept)
                  : "Train to see a fitted line"}
              </strong>
              <span className="epoch-chip">
                {snapshot ? `Epoch ${snapshot.epoch}` : "No run"}
              </span>
            </div>
          </section>

          <section className="panel playback-panel">
            <div className="playback-main">
              <div className="playback-buttons">
                <button
                  className="play-button"
                  type="button"
                  disabled={!training}
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => {
                    if (training && index >= training.snapshots.length - 1)
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
                  disabled={!training}
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
                  <strong>Training progress</strong>
                  <span>
                    Epoch {snapshot?.epoch ?? 0} /{" "}
                    {training?.total_epochs ?? epochs}
                  </span>
                </div>
                <div
                  className="timeline-track"
                  style={
                    {
                      "--progress": `${training ? (index / Math.max(1, training.snapshots.length - 1)) * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                >
                  <input
                    type="range"
                    aria-label="Training timeline"
                    min={0}
                    max={Math.max(0, (training?.snapshots.length ?? 1) - 1)}
                    value={index}
                    disabled={!training}
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
          </section>

          <div className="bottom-grid">
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
          </div>
          <footer className="app-footer">
            <span>
              <span className="footer-dot" /> Batch gradient descent · Computed
              from scratch
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
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                placeholder="Enter your password"
              />
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
