# Paper Distillation Prompt

Read the attached paper. Produce a technical distillation: a precise,
exhaustive extraction of the paper's method, configuration, and results.

## Non-Negotiable Rules

### 1. Precision
- Name every model, dataset, benchmark, module, loss by its actual name from the paper.
- Include every concrete number, name, and config value the paper provides.
- Every number, name, or config value MUST carry a locator tag pointing to where it
  appears in the paper: `(Table 3)`, `(§4.2)`, `(Fig 5 caption)`, `(Eq 7)`, `(Abstract)`.
  A value with no locator is invalid output.
- Three gap tokens, usable anywhere a field would go. Never substitute a remembered value:
  - `not specified` — the paper gives no value and defers to nothing.
  - `not specified (defers to [cite])` — the paper hands this off to a cited reference
    (e.g. "we use the optimizer settings of [12]").
  - `figure-unreadable` — the value exists only in a figure you cannot read with confidence.
    Do not estimate it.
- Do not infer. Do not fill gaps with defaults from your own knowledge. If you are
  reporting any value at reduced confidence, log it in Section 0.

### 2. Style
- Do not praise or criticize. Do not explain why something "matters."
- Direct technical description only.
- No evaluative or promotional language about the method's quality, importance, or
  performance. Banned examples (unless inside a benchmark or model name): novel,
  innovative, robust, powerful, key insight, crucially, significant, remarkable,
  compelling. The rule is the intent, not the list.
- Use `state-of-the-art` only when the paper itself uses the phrase or names a leaderboard.

### 3. Per-Component Extraction Discipline

**Per neural-network module.** Layer count, hidden dim, head count (if attention), activation, normalization, positional encoding scheme, input/output projection dims, init scheme, total parameter count. Apply a gap token per missing field. Do not skip the field.

**Per loss term.** Reproduce the equation. Reduction (mean / sum / per-sample). Space (raw / normalized / latent / encoded). Masking or weighting. Gradient routing (which params receive gradients; what is detached or stop-gradient'd).

**Per input modality.** Resolution, dtype, channel order, normalization, train-time augmentations, eval-time preprocessing.

**Per training stage.** Trainable params, frozen params, schedule (steps, LR, batch, optimizer, hardware, compute), checkpoint selection.

**Per ablation.** Variables changed. If more than one differs from the full method, label `confounded: <list>` and explain alternative interpretations.

**Per result.** Mark each row source as one of:
- `text` — number stated in prose or a table
- `figure-numeric` — number annotated on a figure and read with confidence
- `figure-unreadable` — value lives only in a figure you cannot read; not estimated
- `unquantified` — bar chart, prose hedge, or both

## Output Length
Length is not a constraint. Do not summarize, compress, or truncate to save space.
Exhaustiveness beats brevity.

## Output Format — exactly 9 sections in this order

### 0. Pre-Extraction Checklist
Emit before anything else:
- Count of numbered equations in the paper, and their numbers.
- List of every table number and every figure number.
- List of every appendix subsection heading (verbatim).
Then, as you fill Sections 1-8, ensure each enumerated item above appears. This is the
completeness forcing function.

### 0b. Extraction Confidence Log
Every place you were tempted to infer a value but did not, and every value you are
reporting at reduced confidence (with its locator). If none, write `none`.

### 1. Contribution
Label(s) from: `new architecture` · `new training recipe` · `new dataset or benchmark` · `new loss function` · `new inference method` · `combination of existing ideas` · `theoretical result` · `engineering or scaling contribution`. State what is added in 1-2 sentences.

### 2. Architecture
Components in data-flow order. For each: name, input rep, output rep, frozen/trained, where output goes next. Apply per-module discipline.

### 3. Training
Per stage. Apply per-loss, per-modality, per-stage discipline.

### 4. Inference
Inputs (modalities, formats, resolutions, history, prompt format). Outputs (type, structure, shape). Decoding procedure (greedy, sampling, diffusion steps, chunked control, replanning frequency). Latency if reported.

### 5. Experiments (Design)
What was compared and whether it is fair. Benchmarks/tasks (exact names). Metrics (exact names, and for each whether higher or lower is better). Baselines (exact names, sizes, reproduced-vs-copied). Comparison conditions (apples-to-apples? state what differs: training data, compute, parameter count). Ablations (apply per-ablation discipline). Special settings. Do not put the numbers here; numbers go in Section 6.

### 6. Results (Numbers)
Table: | Benchmark | Metric (↑/↓) | This Paper | Best Baseline (name) | Delta (signed, + = improvement) | Source |
- "Best Baseline" = strongest baseline under the same training data/compute. If the
  strongest-overall baseline differs from the strongest-comparable one, give both rows
  and say which is which.
- "Delta" is signed so that `+` always means this paper is better, regardless of whether
  the metric is higher- or lower-better.
- Source column uses the per-result rule.
After the table: notes on apples-to-apples-ness, missing baselines, mixed reproduced/reported, paper-introduced benchmarks.

### 7. Equations Verbatim
Reproduce every numbered equation exactly as printed, in order (cross-check against the
count in Section 0). After each: 1-2 sentences naming each symbol's domain (shape, space, scale).

### 8. Appendix Sweep
Walk the appendix subsection headings (already listed in Section 0) in order. For each, extract any concrete number, hyperparameter, dataset detail, ablation, or implementation note. If nothing extractable beyond main text, write `<title>: nothing extractable beyond main text`.

## Failure Conditions
Generic-sounding output. Fields skipped instead of marked with a gap token. Any number
without a locator tag. Equations described without reproduction. Confounded ablations not
labeled. Section 0 checklist items missing from the body. Delta column with ambiguous
direction.
