# ML Lab — Complete Application Build Specification

## 1. Your Role and Mission

You are an expert full-stack engineer, machine learning engineer, security engineer, and product designer.

Your task is to **design, develop, test, and prepare for deployment a complete web application called ML Lab**.

ML Lab is an interactive Machine Learning Algorithm Visualizer designed to help users understand how machine learning algorithms actually learn.

This is a college laboratory project, but its implementation, design, and engineering quality should be comparable to a polished public developer tool.

Build a genuinely functional product, not a static prototype.

You are responsible for:

- Frontend development
- Backend development
- From-scratch ML implementation
- Dataset handling
- Interactive visualizations
- Training animations
- Admin authentication
- API security
- Error handling
- Responsive design
- Testing
- Deployment configuration
- Documentation

**Do not stop after planning or scaffolding. Implement the complete working application.**

Make reasonable technical decisions independently and favor simplicity, correctness, maintainability, and excellent user experience.

If a repository already exists, inspect it before modifying anything. Otherwise, initialize the project from scratch.

---

# 2. Product Vision

ML Lab is a web-based playground where users can visually explore machine learning algorithms.

The main idea is simple:

Instead of uploading a dataset and receiving only the final prediction, the user can watch how an algorithm learns from the dataset.

For example, in Linear Regression, the user should see a scatterplot of data points and a regression line that gradually adjusts as gradient descent progresses.

Eventually, the application may support:

- Linear Regression
- Logistic Regression
- K-Means Clustering
- K-Nearest Neighbors
- Decision Trees
- Other machine learning algorithms

However, **Version 1 must implement only Linear Regression**.

Do not build additional algorithms or clutter the interface with unavailable options.

Design modular components so future algorithms can be integrated without restructuring the entire application.

### Product philosophy

1. Make machine learning visual.
2. Make complex concepts easy to understand.
3. Let users experiment with real datasets.
4. Show genuine learning behavior, not fabricated animations.
5. Keep the interface elegant and simple.
6. Prioritize educational value without overwhelming users with technical information.

The application should feel like an interactive scientific playground rather than a traditional dashboard.

---

# 3. Final System Architecture

The architecture is explicitly decided.

**Frontend: React hosted on Vercel.**

**Backend: Python FastAPI hosted on Render.**

These are two separate deployments communicating through HTTPS API requests.

### Architecture

```text
                 USER'S BROWSER
                       |
                       v
              VERCEL (Frontend)
              React + TypeScript
                       |
            -----------------------
            |                     |
       Public Demo            Admin Login
            |                     |
       View Examples          Authenticate
       Replay Training             |
            |                     v
            |              RENDER (Backend)
            |              Python + FastAPI
            |                     |
            |              Validate Admin
            |                     |
            |              Train ML Model
            |                     |
            |              Return Snapshots
            |                     |
            -----------------------
                       |
                       v
               Interactive Graphs
               Training Animation
               Model Metrics
```

### Important architectural rules

- Do NOT run the FastAPI backend on Vercel.
- Do NOT use Vercel serverless functions for ML training.
- Do NOT introduce a database.
- Do NOT use paid cloud APIs.
- Do NOT require a GPU.
- Do NOT introduce WebSockets unless absolutely necessary.
- Do NOT permanently store uploaded datasets.
- Keep the backend stateless wherever possible.
- Keep the system compatible with free hosting tiers.

Training must execute on the CPU of the machine running the FastAPI backend.

During development, this is the developer's computer.

In production, this is the Render web-service instance.

---

# 4. Technology Stack

## Frontend

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide React icons
- Apache ECharts
- PapaParse for CSV parsing

Use native Fetch or a lightweight HTTP client for communication with FastAPI.

Avoid unnecessary dependencies.

Use React hooks for application state.

A heavyweight global state-management library is unnecessary for this version.

## Backend

Use:

- Python 3.11 or another currently supported compatible version
- FastAPI
- Uvicorn
- Pydantic
- Pytest

Use a reputable, maintained password-hashing library and token-signing library for authentication.

## Machine Learning

Implement Linear Regression entirely from scratch in Python.

Allowed:

- Python standard library
- Basic arithmetic
- Math utilities
- CSV/JSON parsing
- Libraries used exclusively for testing or non-ML infrastructure

Prohibited for model training:

- Scikit-learn regression implementations
- TensorFlow
- PyTorch
- Statsmodels
- NumPy polynomial fitting
- NumPy least-squares solvers
- Any third-party implementation that automatically fits Linear Regression

All regression mathematics must be explicitly implemented in our own code.

---

# 5. Public and Admin Access

This is a very important product requirement.

ML Lab will have two access levels.

## Public Visitor

Anyone with the website link can:

- Open the ML Lab website.
- Understand what the platform does.
- Explore built-in sample datasets.
- View scatterplots.
- Replay previously computed training animations.
- Inspect example regression equations.
- Inspect example training losses and model metrics.
- Read short explanations of the algorithm.

Public visitors must NOT be able to:

- Submit their own datasets for model training.
- Trigger new backend training operations.
- Change parameters and initiate retraining.
- Access admin-only features.
- Obtain authentication credentials.

The public experience must remain useful without requiring backend computation.

Bundle genuine precomputed training snapshots for sample datasets with the frontend.

Generate these snapshots using the same from-scratch algorithm used by the backend. Do not manually invent training results.

The public experience should be described as a demo or example replay.

## Administrator

There will be exactly one administrator: the project owner.

The administrator can:

- Sign in.
- Upload CSV or JSON files.
- Select dataset columns.
- Configure model training.
- Trigger actual backend training.
- Observe the training animation.
- Inspect intermediate epochs.
- Retrain with different settings.
- Test custom datasets.
- Sign out.

### Admin UI

Add a small, unobtrusive **Admin Login** option in the application header.

When clicked, display an elegant login dialog.

The login interface should be minimal and professional.

A single password field is sufficient for this single-administrator project.

After successful authentication, display the private training controls.

Do not create a public registration system.

Do not create user accounts or profiles.

---

# 6. Authentication and Security

Implement actual backend authentication.

Simply hiding a button is NOT security.

Someone who directly calls the Render API must not be able to train a model without authorization.

### Authentication implementation

Use a simple, secure authentication design suitable for a single-admin college project.

Requirements:

1. Store the administrator's password as a securely salted password hash in Render environment variables.
2. Never store the plaintext password in frontend code or the repository.
3. Provide a local utility for generating the password hash securely.
4. Implement a login endpoint that verifies the submitted password.
5. On successful login, issue a short-lived, cryptographically signed access token.
6. Use a separate high-entropy signing secret stored in backend environment variables.
7. Validate the token on every protected API request.
8. Reject missing, invalid, expired, or incorrectly signed tokens.
9. Use HTTPS in production.
10. Provide an explicit logout action.

For the initial version, use a short-lived bearer token, with an expiry of approximately 30 minutes.

Keep the access token only in frontend memory rather than localStorage.

After refreshing the page or when the token expires, the administrator may sign in again.

This is acceptable for a small demonstration application.

Use an explicit Authorization header for protected API requests.

Avoid cross-site authentication cookies, since the frontend and backend use separate Vercel and Render domains.

### Required backend authorization

`POST /api/train` must be protected.

It must return HTTP 401 when no valid administrator token is supplied.

Do not trust an `isAdmin` boolean submitted by the frontend.

Do not trust a secret stored in frontend environment variables.

Do not embed the admin password or signing key in the React application.

### Additional security

- Implement reasonable login rate limiting.
- Add a modest rate limit to training requests.
- Limit training request size.
- Validate every input on the backend.
- Reject invalid or nonfinite numbers.
- Do not log administrator passwords, tokens, or uploaded dataset contents.
- Never print authentication secrets.
- Keep production secrets out of Git.
- Include appropriate `.gitignore` rules.
- Do not enable unrestricted CORS.
- Restrict accepted frontend origins to the actual Vercel production domain and local development origin.
- Ensure CORS allows necessary Authorization headers.
- Avoid exposing interactive API documentation in production if it is unnecessary.

In-memory rate limiting is acceptable for this single-instance college demo, but document that it is not durable across Render restarts and is not a substitute for stronger infrastructure-level abuse protection.

The application is not intended to provide enterprise-grade multi-user authentication.

Favor security without unnecessary complexity.

---

# 7. UI/UX Design — Highest Priority

The application must look exceptionally polished.

Think of the design quality found in modern developer tools, professional data platforms, and thoughtfully designed interactive educational applications.

The UI should feel cohesive, deliberate, and premium.

However, prioritize usability over decoration.

## Design language

Use a sophisticated dark interface.

Suggested palette:

- Main background: very dark navy or charcoal.
- Secondary surfaces: slightly lighter charcoal.
- Borders: subtle slate-gray.
- Primary accent: indigo or violet.
- Scatterplot points: cyan or light blue.
- Regression line: vivid violet.
- Success indicators: muted green.
- Text: soft white and neutral gray.

Use Geist or Inter for typography.

Use consistent spacing, subtle shadows, carefully chosen border radii, and refined component states.

### Avoid

- Generic dashboard templates.
- Heavy gradients everywhere.
- Excessive glassmorphism.
- Giant decorative graphics.
- Unnecessary animations.
- Cluttered panels.
- Excessive technical jargon.
- Bright, distracting colors.
- Poorly spaced cards.
- Giant headings that consume the workspace.

The application should feel like a tool built by an experienced product team.

## Layout

Create a single-page application with a compact header and a visually dominant main workspace.

### Header

Include:

- Minimal ML Lab logo.
- Product name.
- Small tagline: "Watch machine learning happen."
- Current algorithm name.
- Admin Login button or signed-in admin status.
- Optional dark/light theme toggle if it can be implemented cleanly.

### Main workspace

Desktop layout:

**Left sidebar**

Approximately 300–340px wide.

Admin mode:

- Dataset selection.
- Upload controls.
- Dataset information.
- X/Y feature selection.
- Training configuration.
- Train Model button.

Public mode:

- Example dataset selector.
- Dataset summary.
- Brief explanation of the selected example.
- Playback options.

**Main content area**

- Large interactive scatterplot.
- Animated regression line.
- Current model equation.
- Playback timeline.
- Performance metrics.
- Training loss chart.

The visualization should receive most of the available screen space.

### Responsive behavior

For tablets and phones:

- Stack panels appropriately.
- Preserve the usability of the graph.
- Keep controls easy to interact with.
- Avoid horizontal overflow.
- Avoid tiny unreadable axis labels.

### Micro-interactions

Implement restrained, purposeful interactions:

- Smooth hover feedback.
- Responsive button states.
- Short transitions.
- Skeletons or loading states when appropriate.
- Animated line movement.
- Clear active/inactive states.
- Informative tooltips.
- Smooth dialog opening.
- Accessible keyboard navigation.

Respect reduced-motion preferences.

Make accessibility part of the implementation rather than an afterthought.

---

# 8. Built-In Example Datasets

The application must work immediately without an upload.

Provide three small synthetic datasets:

1. Study Hours vs Exam Score
2. Advertising Spend vs Sales
3. Years of Experience vs Salary

Use realistic values with natural variation.

Clearly indicate that these are example datasets.

When a public visitor selects an example:

- Show its scatterplot.
- Load its genuine precomputed training history.
- Allow the user to replay and inspect training.
- Show the equation, loss, and metrics.

No public backend training request should occur.

When the administrator selects an example:

- Allow them to train the model again from scratch.
- Allow changing the learning rate.
- Allow changing the number of epochs.
- Allow inspecting newly generated results.

All examples must use the same visualization components as uploaded datasets.

---

# 9. Dataset Upload and Processing

Dataset upload is available only in the authenticated admin workspace.

Support CSV and JSON.

### CSV example

```csv
hours,score
1,25
2,35
3,48
4,62
5,75
```

### JSON example

```json
[
  {"hours": 1, "score": 25},
  {"hours": 2, "score": 35},
  {"hours": 3, "score": 48}
]
```

Support JSON arrays of flat objects.

Do not implement complex nested JSON mapping in this version.

### Upload experience

Provide:

- Drag-and-drop upload area.
- Click-to-select upload.
- Supported format labels.
- Uploaded filename.
- File size information.
- Dataset preview table.
- Number of detected rows.
- Number of usable rows.
- Number of excluded rows.
- Numeric column detection.
- X-axis selector.
- Y-axis selector.

Show the first approximately 10 rows in a clean preview.

### Validation rules

- Maximum uploaded file size: 5 MB.
- Maximum training rows: 5,000.
- Minimum two usable points.
- X and Y must be different columns.
- X values must not all be identical.
- Only valid finite numeric values are accepted.
- Missing or invalid rows must be clearly reported.
- Reject datasets with no usable numeric feature pairs.
- Handle malformed CSV and JSON gracefully.

Perform convenient parsing and validation in the frontend.

**Repeat all important validation on the backend.**

Never trust frontend validation alone.

Uploaded datasets should be processed in memory.

Do not save them permanently on Render.

The frontend sends only the selected numeric X/Y pairs and training settings to the backend.

---

# 10. Linear Regression From Scratch

This is the most important mathematical requirement.

Implement simple Linear Regression using Batch Gradient Descent.

There will be one independent variable X and one target variable Y.

The model is:

`y_pred = m*x + b`

Where:

- `m` represents slope.
- `b` represents intercept.

### Training algorithm

Implement the following steps yourself.

**Initialization**

Start the internal model parameters at zero.

**Prediction**

Calculate predictions using the current slope and intercept.

**Loss**

Implement Mean Squared Error:

`MSE = sum((y_pred - y_actual)^2) / n`

**Gradients**

`dm = (2/n) * sum((y_pred - y_actual) * x)`

`db = (2/n) * sum(y_pred - y_actual)`

**Parameter updates**

`m = m - learning_rate * dm`

`b = b - learning_rate * db`

Repeat these operations for the configured number of epochs.

Do not replace this process with a closed-form least-squares fit.

Do not use an existing regression implementation.

### Feature scaling

Implement internal standardization to ensure stable training on datasets containing differently scaled numbers.

For example:

- Study hours might range from 1 to 10.
- Salary might range from 100,000 to 2,000,000.

Standardize X and Y internally for optimization.

Handle constant Y safely.

Convert the learned coefficients back into the original data units for all displayed equations, predictions, and visualizations.

Be mathematically precise about this conversion.

Note that zero-initialized parameters in standardized coordinates do not necessarily correspond to a zero intercept in original coordinates. Display the genuine converted values, not an artificially fabricated initial equation.

### Training settings

Provide:

**Learning rate**

- 0.01
- 0.05 — default
- 0.1

**Epochs**

- 100
- 300
- 500 — default
- 1000

Offer simple tooltips for both.

Avoid confusing users with excessive parameters.

### Model behavior

The model must train from scratch on the submitted dataset each time the admin clicks Train Model.

The application must not use a fixed pretrained model for arbitrary uploads.

Training should be deterministic for the same dataset and settings.

Handle numerical instability gracefully.

---

# 11. Training History

Record the model's real progress during gradient descent.

The backend should return snapshots containing:

- Epoch number.
- Slope in original units.
- Intercept in original units.
- Mean Squared Error.
- Mean Absolute Error.
- R² score when defined.
- Training loss.

Include the initial state at epoch 0 and the final state.

Save up to approximately 100–150 evenly distributed snapshots.

Every saved snapshot must represent an actual state from the training process.

Do not generate fake intermediate coefficients.

Do not interpolate between arbitrary beginning and ending values to simulate learning.

If visual transitions interpolate for smooth rendering, they must be visually distinguished from or clearly understood as animation between genuinely recorded training states. All displayed epoch metrics must correspond to real recorded snapshots.

### Performance

Training is expected to be lightweight for the first release.

Use a synchronous API request:

1. Frontend submits data.
2. Backend trains the model.
3. Backend returns the full training history.
4. Frontend replays that history.

Do not use WebSockets or background job queues for this version.

---

# 12. Main Interactive Regression Graph

The scatterplot is the central feature of ML Lab.

Use Apache ECharts.

### Graph requirements

Display:

- Dataset points.
- Regression line.
- X-axis label.
- Y-axis label.
- Legend.
- Hover tooltips.
- Sensible number formatting.
- Stable axis ranges.

The regression line must update as the selected training snapshot changes.

Use the actual slope and intercept returned by the backend.

The line must accurately represent:

`y = m*x + b`

Do not use hardcoded visual paths.

Support:

- Smooth animation.
- Zoom where practical.
- Reset view.
- Responsive resizing.
- Dataset point tooltips.
- Distinguishable point and line colors.

Keep transitions smooth without excessive rerendering.

---

# 13. Playback and Training Animation

Implement a clean playback controller.

It should include:

- Play.
- Pause.
- Restart.
- Timeline slider.
- Current epoch.
- Total epochs.
- Playback speed: 0.5x, 1x, 2x.

Users must be able to:

- Watch training from beginning to end.
- Pause at any epoch.
- Move backward.
- Move forward.
- Inspect intermediate predictions.
- Replay training without sending another backend request.

### Synchronization

When the timeline changes, update all of the following simultaneously:

- Regression line.
- Current epoch.
- Model equation.
- Performance metrics.
- Highlighted point on the loss chart.

The animation must remain synchronized.

Never display final metrics while showing an earlier training state.

After the animation finishes, retain the final trained model.

---

# 14. Training Loss Chart

Below the main graph, include a smaller line chart showing model loss over time.

X-axis: Epoch.

Y-axis: Mean Squared Error.

Requirements:

- Show actual recorded loss values.
- Highlight the currently selected epoch.
- Update with the playback controls.
- Make the trend easy to understand.
- Provide hover tooltips.
- Handle high and low loss values sensibly.

Show loss using original target units squared, or clearly identify any different displayed loss scale. Prefer original-scale MSE for consistency with the metrics panel.

Include a short educational tooltip:

"Loss measures how far predictions are from the actual values. Lower loss usually means a better fit."

Never fabricate a smooth decreasing loss curve.

---

# 15. Metrics and Model Details

Create a compact, well-designed metrics section.

Display:

### Mean Squared Error

Average squared prediction error.

### Mean Absolute Error

Average absolute prediction error.

### R² Score

How much variation in the target is explained by the model.

### Current Epoch

Current selected training iteration.

Also display the current model equation prominently.

Example:

`y = 2.45x + 10.32`

Use proper signs and sensible number formatting.

All metrics must be calculated from actual predictions on the selected training dataset.

Clearly label them as training-data metrics.

Do not call them test accuracy.

Do not display NaN or Infinity.

Handle undefined R² values explicitly.

### Optional prediction tool

If the main application is complete, add a small prediction feature.

Allow the administrator to enter an X value and obtain a prediction from the final trained model.

Keep it secondary to the main visualization.

---

# 16. Backend API

Build a small, clean REST API.

### GET /api/health

Public endpoint.

Returns the backend's health status.

Must not expose secrets or sensitive configuration.

### POST /api/auth/login

Accepts the administrator password.

Verifies it against the stored password hash.

Returns a signed access token after successful verification.

Uses appropriate error handling and rate limiting.

### GET /api/auth/me

Protected endpoint.

Validates an existing access token and returns basic authentication status.

### POST /api/train

Protected endpoint.

Accepts:

- Array of `{x, y}` numeric points.
- Learning rate.
- Epoch count.

Returns:

- Training settings.
- Total epochs.
- Final slope.
- Final intercept.
- Final metrics.
- Recorded training snapshots.

### Error handling

Use appropriate status codes.

- 400 or 422 for invalid training data.
- 401 for unauthenticated requests.
- 403 where authenticated access is insufficient.
- 413 for oversized request bodies.
- 429 for rate-limited requests.
- 500 for unexpected backend failures.

Avoid leaking stack traces or environment variables in production responses.

Use Pydantic for validation.

Reject invalid learning rates, unreasonable epoch counts, oversized point arrays, and nonfinite values.

Make sure large numeric inputs cannot easily cause uncontrolled overflow or invalid JSON results.

---

# 17. API Communication and CORS

The frontend and backend run on different domains.

Example:

Frontend:

`https://ml-lab.vercel.app`

Backend:

`https://ml-lab-api.onrender.com`

These are illustrative URLs, not actual deployed addresses.

Use a frontend environment variable:

`VITE_API_BASE_URL`

The frontend must read this value instead of hardcoding the Render URL throughout the application.

Use backend environment variables for:

- `ADMIN_PASSWORD_HASH`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`

Include safe example environment files without real credentials.

Configure FastAPI CORS correctly.

Allow only the actual Vercel production origin and explicitly configured local development origins.

Allow the necessary HTTP methods and Authorization headers.

Do not rely on CORS as an authentication mechanism.

Ensure expired tokens cause a clear session-expired message and return the administrator to the login interface.

---

# 18. Render Free-Tier Compatibility

The Python FastAPI backend must be deployable as a Render Web Service using the Free instance plan.

### Important Render behavior

Render Free services can spin down after approximately 15 minutes without inbound traffic.

A later request may take approximately a minute to wake the service.

Your application must handle this gracefully.

### Frontend behavior

When the administrator initiates login or training:

- Show a clear loading state.
- Prevent repeated accidental submissions.
- Allow sufficient time for a sleeping backend to wake.
- If the backend is slow, explain that the free server may be starting.
- Do not display a fabricated training-progress percentage.
- Display useful errors if the backend remains unavailable.
- Provide a retry option.

The public demo should still function while the backend sleeps because sample data and prerecorded training histories are bundled with the frontend.

Do not implement artificial server-pinging systems merely to prevent sleeping.

### Resource efficiency

- Enforce the 5,000-row training limit.
- Enforce the configured maximum of 1,000 epochs.
- Use lightweight dependencies.
- Avoid database connections.
- Avoid large model libraries.
- Avoid permanent uploads.
- Keep API responses reasonably small.
- Limit simultaneous expensive training operations as appropriate for a small instance.
- Ensure no training occurs for unauthenticated public visitors.

---

# 19. Deployment Configuration

Organize the repository as a simple monorepo.

Suggested structure:

```text
ml-lab/
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- types/
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |
|   |-- public/
|   |   |-- examples/
|   |
|   |-- package.json
|   |-- .env.example
|   |-- vite.config.ts
|
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- schemas.py
|   |   |-- auth/
|   |   |-- ml/
|   |       |-- linear_regression.py
|   |
|   |-- scripts/
|   |-- tests/
|   |-- requirements.txt
|   |-- .env.example
|
|-- README.md
|-- .gitignore
```

Adjust this structure only if there is a clear engineering benefit.

## Deploy the frontend to Vercel

Prepare the React application for deployment with:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Public environment variable: `VITE_API_BASE_URL`

Ensure the production build succeeds.

## Deploy the backend to Render

Prepare a Python Web Service with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Configure the necessary backend environment variables.

Bind to Render's provided port.

Provide a working health-check endpoint.

Do not rely on persistent local filesystem storage.

The backend must start correctly after a cold boot.

### Deployment responsibility

Prepare all necessary configuration and documentation.

If deployment access is available, use it appropriately.

Otherwise, complete the deploy-ready implementation and provide exact deployment instructions.

Never claim the application has been deployed unless deployment has actually succeeded.

Never request that the administrator paste secret passwords or credentials into source code.

---

# 20. Application States and User Experience

Carefully design all application states.

### State 1 — First Visit

The user sees a polished visualizer with an example dataset.

The application should immediately communicate what it does.

The public example is interactive without requiring sign-in.

### State 2 — Example Playback

User selects an example and clicks Play.

The line moves through genuine prerecorded training states.

The loss chart and metrics update.

### State 3 — Admin Login

The administrator clicks Admin Login.

A login dialog opens.

After successful authentication, private controls become available.

### State 4 — Dataset Upload

The administrator uploads a CSV or JSON file.

The application parses it and displays a preview.

Numeric columns become selectable.

The scatterplot updates to show the newly selected data.

Previously trained results must be cleared.

### State 5 — Training

The administrator clicks Train Model.

The backend trains from scratch.

Show a proper loading state.

After the API responds, the training history becomes available for playback.

### State 6 — Playback

The regression line animates according to real recorded model parameters.

The user can pause, scrub, replay, and change playback speed.

### State 7 — Retraining

The administrator changes the learning rate or epoch count.

The application makes a fresh training request.

Replace previous training history with the new result.

Do not accidentally mix old and new snapshots.

### State 8 — Errors

For example:

- Unsupported file.
- Missing numeric columns.
- Invalid dataset.
- Expired admin session.
- Incorrect admin password.
- Backend unavailable.
- Training failure.

Each error must have clear, helpful wording and an appropriate recovery action.

---

# 21. Testing and Mathematical Verification

Create meaningful automated tests.

Use pytest for backend tests.

### ML correctness tests

Test a simple dataset:

```text
X = [1, 2, 3, 4, 5]
Y = [3, 5, 7, 9, 11]
```

The model should converge close to:

`y = 2x + 1`

Test:

- Prediction calculations.
- Gradient calculations.
- Loss calculation.
- Parameter updates.
- Convergence.
- Standardization.
- Conversion to original units.
- MAE.
- MSE.
- R².
- Negative slopes.
- Large numeric scales.
- Constant X handling.
- Constant Y handling.
- Snapshot ordering.
- Initial snapshot at epoch 0.
- Final snapshot at the configured final epoch.
- Deterministic training.

### API security tests

Verify:

- Training without a token returns 401.
- Training with an invalid token returns 401.
- Training with an expired token returns 401.
- Incorrect login credentials are rejected.
- Valid admin login succeeds.
- Authenticated training succeeds.
- Oversized datasets are rejected.
- Invalid numeric values are rejected.
- Rate limits are enforced as designed.

### Frontend tests

Test important interactions where practical:

- CSV parsing.
- JSON parsing.
- Feature selection.
- Invalid dataset handling.
- Authentication state.
- Training result handling.
- Playback controls.
- Timeline synchronization.
- Session expiration.
- Backend errors.

Check the UI at desktop, tablet, and mobile widths.

Run all available tests, TypeScript checks, linting, and production builds.

Fix discovered issues before considering implementation complete.

---

# 22. Developer Documentation

Provide a high-quality README.

The README must explain:

1. What ML Lab is.
2. What problem it solves.
3. Supported features.
4. Technology stack.
5. System architecture.
6. How the ML algorithm works.
7. Why no pretrained model is necessary.
8. How gradient descent works.
9. How training snapshots are visualized.
10. How to run the frontend locally.
11. How to run the backend locally.
12. How to configure admin credentials securely.
13. How to deploy the frontend to Vercel.
14. How to deploy the backend to Render.
15. How to configure CORS.
16. How to run automated tests.
17. Known limitations.
18. How additional algorithms can eventually be added.

Include sample datasets.

Include `.env.example` files without actual credentials.

Make local setup easy for another developer.

---

# 23. Explicitly Out of Scope

Do not introduce unnecessary features.

Do not build:

- Multiple ML algorithms.
- Public registration.
- Multi-user dashboards.
- Databases.
- File storage systems.
- Payment systems.
- GPU infrastructure.
- AI chatbots.
- A complex model registry.
- Cloud training pipelines.
- Kubernetes.
- Job queues.
- WebSocket infrastructure.
- Large preprocessing pipelines.
- Complex statistical dashboards.
- Three-dimensional visualizations.
- External ML model APIs.

Keep the implementation focused on one exceptionally well-executed algorithm visualizer.

---

# 24. Implementation Plan

Follow this sequence.

### Phase 1 — Project Foundation

Set up the frontend, backend, basic project structure, and development environment.

Establish the UI design system.

### Phase 2 — ML Implementation

Implement Linear Regression from scratch.

Add normalization, gradient descent, metrics, and training snapshots.

Write mathematical correctness tests.

### Phase 3 — Backend and Security

Implement authentication, request validation, authorization, API endpoints, CORS, and resource limits.

Write API tests.

### Phase 4 — Frontend Experience

Build the workspace, sample datasets, CSV/JSON upload, feature selection, and admin login.

### Phase 5 — Interactive Visualization

Implement the scatterplot, regression line, training timeline, loss chart, metrics, and playback controls.

### Phase 6 — UI/UX Refinement

Polish spacing, typography, responsive behavior, interactions, loading states, errors, and accessibility.

### Phase 7 — Deployment Preparation

Prepare Vercel and Render configuration, environment examples, and deployment documentation.

### Phase 8 — Final Verification

Run tests.

Run production builds.

Test the complete application locally.

Verify authentication and training through the actual frontend.

Fix all major issues.

Do not leave placeholder functionality.

---

# 25. Definition of Done

The application is complete only when all requirements below are met.

### Machine learning

- Linear Regression is implemented from scratch.
- Gradient descent genuinely trains the model.
- Uploaded datasets can be used for training.
- Training produces mathematically correct coefficients.
- Training history contains actual model states.
- All metrics are genuine.

### Frontend

- Professional, polished UI.
- Working sample datasets.
- Functional dataset upload.
- Functional column selection.
- Interactive regression graph.
- Animated training playback.
- Functional playback controls.
- Synchronized loss chart.
- Accurate metrics.
- Responsive design.

### Security

- Administrator authentication works.
- Credentials are securely stored server-side.
- Training endpoints require authorization.
- Public visitors cannot initiate training.
- Input limits are enforced.
- Production CORS is restricted.

### Deployment

- Frontend is ready for Vercel.
- Backend is ready for Render.
- Environment variables are documented.
- Render cold starts are handled gracefully.
- No paid infrastructure is required for the intended small-scale demo within free-tier limits.

### Quality

- No fake training animations.
- No hardcoded regression results for uploaded datasets.
- No dead buttons.
- No placeholder API calls.
- No major unhandled errors.
- Automated tests pass.
- Production build succeeds.
- README is complete.

---

# 26. Final Design and Engineering Direction

This project will be demonstrated to a college professor and may later be published as a portfolio project.

The application should impress through:

- Clear visualization of machine learning.
- Correct implementation of algorithms.
- Excellent visual design.
- Smooth interaction.
- Thoughtful educational explanations.
- Real-world full-stack architecture.
- Secure admin-only computing.
- Reliable live demonstrations.

Prioritize the experience of actually **watching Linear Regression learn**.

Make the graph the centerpiece.

Make the controls intuitive.

Make the model mathematically correct.

Make the architecture simple.

Do not add complexity simply to demonstrate technical sophistication.

**Build a small, beautiful, accurate, and complete ML learning tool rather than a large, unfinished platform.**

Deliver the working codebase, tests, documentation, and deployment-ready configuration.

At the end, summarize:

- What was implemented.
- What tests were run and their results.
- How to start the project locally.
- How to deploy it on Vercel and Render.
- How to configure the admin password securely.
- Any known limitations or remaining manual steps.

Do not claim completion for features that have not been implemented or verified.