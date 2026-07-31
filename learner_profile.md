### Current Focus
- Reading and reasoning about the **armnet** robot-safety codebase — specifically the `keep_out` system on the SO-101 arms (edge connector): capsule collision geometry, signed-distance plane checks, the velocity damper, and the camera-mount prism.
- Alongside this, an ongoing theory-to-implementation thread on RL for robotics: dissecting HIL-SERL and the Pi0 RL Token (RLT) codebases to see how off-policy learning, TD3, and action chunking translate from math into PyTorch and real hardware.
- A recurring interest in the *design* of these systems, not just their correctness: config ergonomics, fail-safe behavior under changing assumptions, and where a clean abstraction is worth new code.

### What You've Internalized
Robotics safety / geometry (this session):
- **Capsules as the right model:** links are fat line-segments (segment + one radius) — a skeleton ignores real 3D-printed bulk, a full mesh is too slow. You derived both reasons unprompted.
- **Signed-distance clearance:** clearance = (point − p0)·n̂ − radius. The unit normal projects out the perpendicular distance; the radius subtraction folds link thickness into one number. You correctly recovered the "perpendicular distance" reading (needed the *signed* qualifier added).
- **Velocity-blind position gates:** a fixed geometric margin is only safe below some speed because stopping distance scales with v²; the velocity damper exists to make the fixed margin *dynamically sufficient* (a control-barrier-style constraint). You reached the strongest justification yourself — defense-in-depth via low kinetic energy.
- **Empirical tuning ≈ solving the physics implicitly:** your 15 mm / 15°/s were chosen by feel, which is *correct* practice because a cable/gravity/PID servo has no clean constant deceleration to plug into a closed form.
- **AND vs OR for obstacle avoidance (hard-won):** avoiding a bounded volume is a *disjunction* (De Morgan on the negated conjunction). "2 planes" (AND → forbidden = union, kills the rest pose) and "2 prism walls" (`max` → forbidden = intersection, a corner wedge) are the same lines under opposite operators. A 2-wall prism is an infinite corner wedge, safe only because of the reachability argument.
- **Convexity obstruction:** intersecting half-spaces is always convex; the camera safe region is non-convex (an L wrapping the mount), so no AND-of-planes can express it — the prism must.

RL (retained from prior sessions):
- **Off-policy firewall & its dependence on the Critic:** interventions don't reinforce bad actions because the Bellman target evaluates the next state under the *Actor's* policy — but this only works if the Critic accurately assigns low Q to the doomed path.
- **Base VLA warmup necessity; chunking as time compression; 1-step compounding horizons (γ time-tax); VLA generalization protection via RLT; the "identity function" trap (reference-action dropout); Gaussian policy by definition** (fixed σ noise added to μ_θ, not a learned distribution).

### Open Threads / Things to Revisit
- Which arm pose/direction makes the empirical 15°/s most likely to fail (worst effective deceleration under gravity).
- The convex/non-convex pie-slice check (posed, unanswered).
- Whether to build a 2-knob tuner over the bounded prism vs a literal 2-wall primitive — decision hinges on "is it the config *file* or the tuning *flow* that bothers you?"
- The `check()` monotonic-retreat trace (−5→−3→−4→+2) — does it allow the motion, at which alpha, by which rule?
- The retreat-branch comment you were going to draft yourself (Grant declined to write it for you).
- RL: Equation (2) unconditioned terms when β = 1; line-by-line `compute_loss_critic` (clipped double-Q).

### Misconceptions Seen
- **AND-thinking for multi-face obstacles:** repeatedly modeled "guard several faces" as AND-ed independent planes; missed the union-vs-intersection distinction and the convexity limit. Resolved this session, but it took several counterexamples.
- **Plane vs prism-wall conflation:** treated a prism wall as interchangeable with an independent plane; the combination operator is the whole difference.
- **Design-history recall:** believed the velocity damper *replaced* the directional retreat rule; both actually coexist.
- **Notation Overload (RL):** reads equations too literally — global summation bounds, network inputs as direct values, loss target mirroring the dropout mask.
- **Algorithm vs Real World (RL):** assumed RL always executes its own policy, missing physical safety overrides (VLA during warmup, human interventions).

### Style Notes
- **Adversarial, well-formed pushback:** will not accept a claim until it survives their own counterexamples. This is productive — challenge back with rigor, not reassurance, and expect three angles of attack before a synthesis lands.
- **Catches imprecision and rewards candor:** flagged both a sloppy phrasing ("clear any one wall") and an overclaim (that the code computes the braking relation). Own mistakes plainly and correct them.
- **Grounds everything in the concrete:** reasons with the actual config numbers and hardware realities (3D-printed mass, servo dynamics, gravity, camera geometry). Physical grounding is where they're strongest.
- **Systems/product lens:** raises ergonomics and fail-safe-under-change unprompted; engage the design trade-off, don't just confirm correctness.
- **Metaphor tolerance has shifted:** high-level pictures (bouncer, building-corner, rubber-band) now land *well*, provided they cash out into the math soon after. This is a change from an earlier "zero tolerance for hand-wavy metaphors" stance — they now treat a good metaphor as a loan against precision, which is exactly the intended use. Still: when they ask a formalism-level question, give the equation, not the picture.
- **Prefers inside-out on RL** (start from the loss equations, trace outward) and **shape-first on code/geometry** (the frame before the details) — both consistent with pulling one zoom level at a time.
