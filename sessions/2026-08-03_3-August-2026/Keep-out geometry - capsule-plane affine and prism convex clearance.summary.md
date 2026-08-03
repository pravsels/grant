### Where Plane Names Come From

- **Question:** is one `check()` snapshot block for the front/left/right/back/table planes and the other for the camera prism?
- **Where they started:** asserted specific plane names as if fixed in code.
- **What unlocked it:** separating structure (`self.planes` = independent half-spaces vs `self.wall_groups` = one prism) from data. Traced construction to `connector.py` (~1244–1268), where plane names are arbitrary keys of `arm_keep_out["planes"]` and only `"top_camera_walls"` is hardcoded. Reading `robot_cell_so101_8.json` gave the real names: `table, behind, {left|right}`.
- **Where they ended:** owns that plane names are config data; corrected own guess (no "front", "behind" not "back", each arm carries only its outward lateral plane).
- **Evidence level:** strong.

### Why Each Arm Has Only Its Outward Lateral Plane

- **Question:** why does the left arm have a `left` plane but no `right`, and vice versa?
- **What unlocked it:** reachability pruning — planes are workspace boundaries and you only pay for ones the arm can reach. Grant then pushed on the exposed gap: all planes face *outward*, none face inward toward the other arm.
- **Where they ended:** correctly identified inter-arm collision as an uncovered, future case (their own plan: URDF + kinematics). Grant framed *why* it doesn't fit: current shapes are static and in one arm's base frame; the other arm is a moving obstacle needing capsule–capsule between two live FK chains.
- **Evidence level:** strong; good design-level synthesis.

### Capsule–Plane Clearance Is Affine → Endpoints Suffice

- **Question:** what does "plane distance is affine" mean precisely, and why check only endpoints?
- **What unlocked it:** affine = linear + constant, `f(x)=a·x+c`; signed distance `d(x)=n̂·x − n̂·p0`. Restricted to the spine, `d(t)=d(0)+t(d(1)−d(0))` — a straight line, so `min over t = min(start,end)`.
- **Where they ended:** stated the shortcut and its justification independently. Handled the adversarial "parallel capsule" case with a hint: parallel ⇒ slope `n̂·(end−start)=0` ⇒ `d(t)` flat ⇒ endpoints tie, never strictly beaten by an interior point.
- **Note:** tapering (radius ≠ end_radius) was raised — `r(t)` is affine, so `d(t)−r(t)` stays affine and the endpoint guarantee survives. Posed, not yet independently confirmed by the learner.
- **Evidence level:** strong on planes.

### Prism Clearance Is max-of-faces (needed a full slowdown)

- **Question:** isn't the prism just four walls — why does the logic change?
- **Where they started:** modeled the prism as four independent plane checks (the recurring AND-thinking). Said "my understanding isn't good" and asked to slow down.
- **What unlocked it:** rebuilt bottom-up with concrete arithmetic. 1D interval `[2,5]`: `clearance = max(2−p, p−5)` is a full signed distance (sign = inside/outside, magnitude = depth/clearance), `max` because forbidden = intersection ⇒ outside = OR over faces. Extended to a 2D box (max of four terms). Corner case `(7,7)`: `max` gives 2 but true distance is `2√2 ≈ 2.83` → the formula is *conservative* (under-reports), which is the safe error direction.
- **Where they ended:** articulated the safety asymmetry cleanly (under-report = more real leeway = safe; over-report = waves through collisions).
- **Evidence level:** moderate→strong on the point case, all via worked numbers.

### Capsule vs Prism → Interior Minimum (the whole reason prism code is harder)

- **Question:** how does the moving capsule change the prism check?
- **Where they started:** two misreads — (1) first computed the midpoint clearance wrong, (2) thought the spine endpoints `A=(7,3), B=(3,7)` defined a *new* forbidden square.
- **What unlocked it:** re-anchoring `A,B` as the ends of one robot link (spine), box fixed. Concrete result: clearance 2 → 0 → 2 as the bead crosses `(5,5)`. Endpoint-only would report "safe" and miss a grazing collision. Clearance-vs-position is a V (max of straight lines); its min is at an endpoint *or* a line-crossing kink.
- **Where they ended:** saw the interior-minimum payoff on concrete numbers; mapped it onto `candidates = [0.0, 1.0]` + interior crossing `alpha`s in `capsule_vertical_prism_signed_distance`. Stopped before reading off `intercept`/`slope`.
- **Evidence level:** developing; landed via worked example, not yet from the abstraction alone.

### Open Threads

- Read off what `intercept` and `slope` mean for each prism face-line (`intercept + alpha*slope`), then confirm the crossing formula `alpha = (i2 − i1)/(s1 − s2)` finds the bottom of the V. **(Resume here.)**
- Independently confirm the tapered-capsule case: `r(t)` affine ⇒ clearance affine ⇒ endpoints still suffice for the plane check.
- Retained/older: `started_inside` frozen-from-initial-pose reasoning; the retreat trace `−5 → −3 → −4 → +2 mm`; worst-gravity pose for the empirical velocity cap; two-knob bounded-prism tuning.
- Design: capsule–capsule inter-arm collision as the future primitive (moving obstacle in shared world frame).

### Style Signals

- **Slows down honestly.** Said outright "my understanding isn't good" and "I didn't understand the capsule part" — and abstract framing ("lines in t", "max of affine") consistently failed while concrete numbered arithmetic (1D interval, specific points, Pythagoras) consistently worked. For new geometry, lead with worked numbers, not the general statement.
- **Adversarial in the productive way.** The "parallel capsule touching horizontally" objection was exactly the right stress test and showed real engagement, not confusion.
- **Two recurring concrete slips:** conflating a diagonal with an axis step (thought `(7,7)→(5,5)` was distance 2), and conflating a *parametrizing* segment with a *new region* (thought spine endpoints were a new box). Both cleared quickly with a redraw.
- **Config vs code instinct still needs nudging:** asserted plane names from code before checking they were data. Once pointed at the trace, followed it cleanly.
- **Safety-asymmetry reasoning is a strength:** articulated conservative-under-reporting = safe without prompting.
