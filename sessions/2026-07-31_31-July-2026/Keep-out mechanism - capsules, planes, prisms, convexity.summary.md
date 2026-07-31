### Capsules vs Skeleton (why fat line-segments)
- **Question:** why is the arm modeled as fat capsules rather than zero-width lines?
- **Where they started:** n/a — asked to understand keep_out "in detail."
- **What unlocked it:** the two-jaw framing — physical 3D-printed bulk (a skeleton lets a chunky link clip a wall) vs computational cost (a full mesh is too slow per command). Capsule = segment + one radius.
- **Where they ended:** independently nailed both reasons before being told. "the arm has thickness... 3d printed 'meat'... too much detail would add computational slowdown."
- **Evidence level:** strong

### Signed-Distance Clearance (radius subtraction)
- **Question:** what does (point − p0)·n̂ give us?
- **Where they started:** unsure what the dot product computes.
- **What unlocked it:** projection intuition — dotting with the unit normal keeps the perpendicular component, discards the along-wall part; grounded in the `table` plane collapsing to "height above table" (point_z + 0.04). Clearance = that distance − radius.
- **Where they ended:** correct teach-back, "perpendicular distance." Needed the *signed* qualifier and unit-normal caveat added.
- **Evidence level:** strong

### Path Sampling & the Joint-Space Arc
- **Question:** is checking start + end poses enough, or must you sample between?
- **Where they started:** argued endpoints suffice and interpolation is "overkill for teleop or policies."
- **What unlocked it:** correct for small 50 Hz deltas, BUT joint-space linear interpolation is a *Cartesian arc* that bows past the chord — both endpoints clear while the belly crosses. `intermediate_samples: 4` → 6 sampled poses.
- **Where they ended:** accepted the arc-bulge as the structural reason (beyond just "big jumps"). Not independently re-derived.
- **Evidence level:** wobbly

### Deadlock, Retreat Rule vs Velocity Damper
- **Question:** if "block when clearance < margin," what happens when the arm starts inside the buffer?
- **Where they started:** correctly diagnosed the deadlock (arm gets trapped). Recalled the design as "we dropped the directional cleverness in favor of just slowing down."
- **What unlocked it:** correction from the code — *both* mechanisms exist: the hard guard's `not_retreating` (strictly-increasing clearance) is the directional logic and breaks the deadlock; the velocity damper is a separate, orthogonal speed cap.
- **Where they ended:** engaged; their memory of the design history was partially off (thought slowdown replaced directionality; actually both coexist).
- **Evidence level:** wobbly

### Why a Position Gate Needs a Velocity Damper
- **Question:** what does the damper add that the retreat guard doesn't — why not just stop dead at the margin?
- **Where they started:** proposed mechanical stress from abrupt stops, plus an empirical observation that the hold "leaked" brief motions into barriers, plus defense-in-depth (low kinetic energy if the barrier fails).
- **What unlocked it:** naming the mechanism — the hard guard is *velocity-blind*; stopping distance scales with v², so a fixed margin is sufficient only below some speed. The damper makes the fixed margin *dynamically sufficient* (a control-barrier framing).
- **Where they ended:** strong physical intuition; the defense-in-depth argument was their own and is the strongest justification.
- **Evidence level:** strong

### slowdown_distance ↔ max_velocity coupling
- **Question:** are the two damper knobs independent? What links them?
- **Where they started:** revealed they did NOT derive them — picked 15 mm as a sane buffer, tuned 15°/s empirically.
- **What unlocked it:** reframing empirical tuning as *implicitly solving* v²/(2a) ≤ d by measurement; and the candid point that for a cable/gravity/PID servo there is no clean constant `a`, so tuning is the correct method, not a shortcut. (Grant also corrected its own overreach: the code does not compute this relation.)
- **Where they ended:** honest that the numbers were empirical; the physics reframing recontextualized why they work.
- **Evidence level:** strong

### model_validator (Pydantic) & the non-zero normal
- **Question:** what is a `model_validator` for?
- **Where they started:** unfamiliar with the decorator.
- **What unlocked it:** a construction-time gate (`mode="after"` = post-parse), guarding the invariant that a plane normal is non-zero, because a zero normal makes the signed-distance dot product identically 0 and the normalization divide-by-zero. Cheap boundary check standing in for a confusing runtime failure.
- **Where they ended:** received the explanation; no independent teach-back yet.
- **Evidence level:** wobbly

### KeepOutGuard.check() structure
- **Question:** "whats going on here?" for the full `check()` function.
- **Where they started:** had already reasoned out capsules, signed distance, sampling, and the retreat rule across the session.
- **What unlocked it:** framing it as two phases — decide-the-rule-once (margin vs retreat, frozen from the start pose) then sweep-and-apply; plus the subtle monotonic advance of the retreat reference (rejects a path that dips deeper on its way out).
- **Where they ended:** assembly of pieces they mostly owned; the monotonic subtlety was newly surfaced.
- **Evidence level:** wobbly

### AND vs OR for the Camera Box (the big thread)
- **Question:** re-explain another agent's argument about reducing the camera prism from 4 faces to 2, and why "outside both walls" is OR not AND. Then repeated pushback.
- **Where they started:** Strong, persistent AND-intuition. Objected that "clear any one wall → outside" seemed false ("I can hit it from the left or front"); reframed as "fencing, not inside/outside"; proposed two independent outward-normal planes.
- **What unlocked it:** several passes — (1) De Morgan: avoid-a-box = negation of a conjunction = disjunction; (2) correcting Grant's own sloppy "clear any one wall" phrasing with numeric traces showing each approach is caught by its own face; (3) the convexity obstruction — AND-of-half-spaces is always convex, the camera safe region is non-convex (an L wrapping the corner), proven by the segment test (rest pose ↔ front-reach line crosses the box); (4) the decisive reframe: "2 planes" vs "2 prism walls" are the *same lines under opposite operators* — planes AND → forbidden = union (grows, kills rest pose); prism walls `max` → forbidden = intersection (a corner wedge, keeps rest pose).
- **Where they ended:** reached the click that 2 walls work *as a prism* (max), not as AND-planes; understood the 2-wall prism is an infinite corner wedge that's safe only because of the reachability argument.
- **Evidence level:** strong (arrived at the correct synthesis after genuine adversarial back-and-forth)

### Convex vs Non-Convex (foundational detour)
- **Question:** "what is convex and non-convex?"
- **Where they started:** did not know the definition, though had been using the conclusion.
- **What unlocked it:** the segment definition + rubber-band test + the two load-bearing facts (half-space convex; intersection preserves convexity), grounded by the rest-pose-to-front-reach segment cutting through the camera box.
- **Where they ended:** received the definition; a pie-slice check was posed to test it (not yet answered).
- **Evidence level:** wobbly

### 2-knob tuning vs 2-wall geometry (design judgment)
- **Question:** isn't it cleaner for the user to tune only 2 walls?
- **Where they started:** conflated the tuning UX (fewer knobs) with the stored geometric representation (fewer faces).
- **What unlocked it:** separating knob-count from wall-count — a 2-knob tuner can sit over a bounded 4-face box; the literal 2-wall primitive costs new code and is less fail-safe if reachability assumptions change (camera moves, longer arm).
- **Where they ended:** left with the deciding question (is it the config file or the tuning flow that bothers them?) — leaning toward tuning flow.
- **Evidence level:** wobbly

### Surfaced Misconceptions
- **AND/OR for obstacle avoidance:** strong and repeated intuition that guarding multiple faces means AND-ing independent planes; missed that avoiding a bounded volume is a disjunction (negated conjunction) and that AND-of-planes can only carve convex regions.
- **Plane vs prism-wall:** treated a "prism wall" as interchangeable with an independent plane, missing that the combination operator (union vs intersection of forbidden regions) is what differs.
- **Design history recall:** believed the velocity damper *replaced* the directional retreat rule; in fact both coexist.
- **Metaphor tolerance shifted:** now accepts high-level pictures (bouncer, building-corner, rubber-band) provided they cash out to math quickly — a change from the earlier "zero tolerance" stance.

### Open Threads
- Which pose/direction makes empirical 15°/s most likely to fail (worst effective deceleration under gravity) — posed, not answered.
- The convex/non-convex pie-slice check — posed, not answered.
- Whether to implement a 2-knob tuner over the bounded prism, or a literal 2-wall primitive — decision pending on "file vs flow."
- The `keepout.py` `check()` monotonic-retreat trace (−5→−3→−4→+2) — posed, not answered.
- The retreat-branch comment they were going to draft themselves (deferred; Grant declined to write it).

### Style Signals
- **Adversarial, persistent pushback:** will not accept a claim until it survives their counterexamples (repeatedly challenged the AND/OR framing from three different angles before the synthesis landed). This is productive, not obstinate — each objection was well-formed.
- **Caught Grant's imprecision twice:** the sloppy "clear any one wall" phrasing and the overclaim that the code computes the braking-distance relation. Rewards candor and self-correction.
- **Grounds abstractions in the concrete config:** consistently reasons with the actual cell-08 numbers (x-band, 15 mm, 15°/s) and physical hardware realities (3D-printed mass, servo dynamics, gravity, camera placement between arms).
- **Systems/product lens:** naturally raised tuning ergonomics and fail-safe-under-change, not just correctness.
- **Metaphor now welcome if it pays back:** engaged well with the bouncer / building-corner / rubber-band pictures once they were tied to the math.
