### Current Focus
- Reading and reasoning about the **armnet** robot-safety codebase — the `keep_out` system on the SO-101 arms (edge connector): capsule collision geometry, signed-distance plane checks, the vertical-prism camera guard, the velocity damper, and how config flows into the guard.
- Currently deep in the **geometry primitives**: `_capsule_plane_closest` (affine, done) and `capsule_vertical_prism_signed_distance` / `_capsule_vertical_prism_closest` (convex max-of-faces, in progress).
- Alongside this, an ongoing theory-to-implementation thread on RL for robotics: dissecting HIL-SERL and the Pi0 RL Token (RLT) codebases — off-policy learning, TD3, action chunking from math into PyTorch and real hardware.
- A recurring interest in the *design* of these systems, not just correctness: config ergonomics, fail-safe behavior under changing assumptions, and where a clean abstraction is worth new code.

### What You've Internalized
Robotics safety / geometry:
- **Capsules as the right model:** links are fat line-segments (spine + radius). Refined this session: the crisp definition is *all points within r of the segment* — which automatically gives the cylindrical body plus **hemispherical end-caps**, not a bare cylinder. "Perpendicular distance from the spine" holds only on the body; near a tip the nearest surface point is radial from the endpoint.
- **Tapered capsules:** radius can differ at the two ends (`radius` vs `end_radius`, e.g. the gripper). This is why the plane primitive subtracts a *different* radius at each endpoint.
- **Signed-distance clearance to a plane:** clearance = (point − p0)·n̂ − radius; the unit normal projects out perpendicular distance, the radius folds in link thickness.
- **Plane distance is affine (fully owned):** `d(x)=n̂·x − n̂·p0` (linear + constant). Along the spine `d(t)=d(0)+t(d(1)−d(0))` is a straight line, so its minimum is at an endpoint → checking `start` and `end` alone certifies the whole capsule. Handled the adversarial parallel-capsule case: parallel ⇒ slope `n̂·(end−start)=0` ⇒ `d(t)` flat ⇒ endpoints tie, an interior point never strictly wins.
- **Prism = bounded forbidden box = intersection of half-spaces.** Clearance = **max** of the per-face signed distances (De Morgan: outside the box = outside *some* face = OR). One `max` expression is a full signed distance: sign = inside/outside, magnitude = depth/clearance, and it auto-selects the relevant face without branching. Built this bottom-up from a 1D interval.
- **The prism clearance is conservative in corners:** at a corner, max-of-faces under-reports the true (diagonal) distance (`2` vs `2√2`). Correct by design — under-reporting only costs a little workspace (false alarms); over-reporting could wave through a collision. You stated this safety asymmetry cleanly and unprompted.
- **Why the prism can't reuse the plane shortcut (landed on a worked example):** as the capsule sweeps, clearance-vs-position is `max` of straight lines = a convex **V**. Its minimum can be **interior** (a link grazing a box corner reads 0 in the middle while both endpoints read a safe 2). Endpoint-only checking would over-report and miss it. The min sits at an endpoint **or** at a line-crossing kink — which is exactly what the code enumerates (`candidates = [0,1]` + interior crossings).
- **Config vs code:** the guard's plane *names* are arbitrary keys under `keep_out.planes` in `robot_cell_*.json`, not code. Real names: `table, behind`, plus each arm's own *outward* lateral wall (`left` for the left arm, `right` for the right). Only `"top_camera_walls"` is hardcoded.
- **Static vs moving obstacles:** every current keep-out shape is static and expressed in one arm's base frame, so a fixed plane/prism can be precomputed. Inter-arm collision is a *moving* obstacle in a shared world frame — not expressible as a fixed plane; it needs capsule–capsule distance between two live FK chains (your planned, unimplemented feature).
- **Exact snapshots replaced gradients:** `armnet` now uses exact clearance snapshots only; the gradient/`KeepOutConstraintState` machinery has been removed.
- **Velocity-blind position gates:** a fixed geometric margin is only safe below some speed (stopping distance ∝ v²); the velocity damper makes the fixed margin dynamically sufficient (control-barrier-style). Empirical 15 mm / 15°/s ≈ solving the physics implicitly.

RL (retained from prior sessions):
- **Off-policy firewall & its dependence on the Critic;** base VLA warmup necessity; chunking as time compression; 1-step compounding horizons (γ time-tax); VLA generalization protection via RLT; the "identity function" trap (reference-action dropout); Gaussian policy by definition (fixed σ noise on μ_θ, not learned).

### Open Threads / Things to Revisit
- **Resume point:** read off what `intercept` and `slope` mean for each prism face-line (`intercept + alpha*slope`), and confirm the crossing formula `alpha=(i2−i1)/(s1−s2)` finds the bottom of the V.
- Independently confirm the tapered case: `r(t)` is affine ⇒ clearance `d(t)−r(t)` is affine ⇒ endpoints still suffice.
- Why `started_inside` is frozen from the initial pose rather than recalculated at every sample; the monotonic-retreat trace `−5→−3→−4→+2 mm` (rejection point and rule).
- Which arm pose/direction makes the empirical 15°/s most likely to fail (worst effective deceleration under gravity).
- Whether to build a 2-knob tuner over the bounded prism vs a literal 2-wall primitive.
- Design sketch: capsule–capsule inter-arm collision primitive.
- RL: Equation (2) unconditioned terms when β=1; line-by-line `compute_loss_critic` (clipped double-Q).

### Misconceptions Seen
- **AND-thinking for multi-face obstacles (recurring):** models "guard several faces" as independent AND-ed planes; misses that a *bounded volume* is an intersection whose complement is a union → clearance combines with `max`, not per-face `min`. Resurfaced this session for the prism; resolved via a 1D rebuild.
- **Abstraction-before-numbers:** general statements ("distance is affine", "max of lines is convex", "each face becomes a line in t") repeatedly did *not* land; the same ideas landed immediately once grounded in specific arithmetic. Teach geometry with worked numbers first, then generalize.
- **Concrete slips, cleared with a redraw:** treated a diagonal as an axis step (`(7,7)→(5,5)` distance "2" instead of `2√2`); read a parametrizing segment's endpoints as defining a *new* region (thought the spine `A,B` were a new forbidden box).
- **Config vs code:** asserted plane names as if hardcoded before checking they were config data.
- **RL (older):** notation overload (reads equations too literally); assumes RL always executes its own policy, missing physical safety overrides.

### Style Notes
- **Names the gap honestly and asks to slow down.** Will say "my understanding isn't good" rather than nod along. Take these literally — drop the abstraction and rebuild from the smallest concrete case (1D, specific numbers), one step per turn, confirming each before adding a dimension.
- **Worked numbers > general statements for new geometry.** Once a concrete instance is solid, *then* name the general principle. Inside-out on RL (start from the loss equations); for geometry/code, concrete-example-first, then shape, then formalism.
- **Adversarial, well-formed pushback (a strength):** stress-tests a claim with its own counterexample (the parallel-capsule case) before accepting it. Challenge back with rigor; expect the objection to be productive, not confusion.
- **Safety/systems lens is strong:** reasons cleanly about conservative-vs-optimistic error directions and raises fail-safe-under-change and inter-arm design unprompted. Engage the design trade-off.
- **Grounds everything in the concrete:** actual config numbers, hardware realities, real file contents. Physical/config grounding is where they're strongest; nudge them to *check* config rather than assume from code.
- **Catches imprecision and rewards candor:** flags sloppy phrasing and stale conclusions; owns own errors plainly once shown. Correct terminology gently (e.g. "intercept" vs "line-crossing") rather than letting a loose word harden.
- **Metaphor tolerance:** high-level pictures (bead sliding along the spine, V-shaped valley, box corner) land well provided they cash out into arithmetic soon after. When they ask a formalism-level question, give the equation — but in **display-mode LaTeX on its own line**; inline `\( \)` math does not render in their UI.
- **UI note:** use `\[ ... \]` block math on separate lines; avoid inline `\(...\)` and `$...$`.
