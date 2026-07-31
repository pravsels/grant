## Learner

Context: reading the armnet robot cell config (`robot_cell_so101_8.json`) and the edge keep-out code (`keepout.py`, `connector.py`, `velocity_damper.py`, `kinematics.py`, `models.py`).

i want to understand keep_out mechanism in detail

---

## Grant

**Level 1 — the picture.**

Think of `keep_out` as a bouncer standing between the policy and the motors. Every proposed motion has to get past it before it reaches the servos. It holds two models in its head: the **arm** as a few fat sausages (each link a cylinder with rounded ends), and the **forbidden world** as walls — the table below, a plane behind, a side wall, and an invisible box protecting the overhead camera.

Before each command it mentally moves the sausages along the path the arm *would* take and asks: does any sausage cross into a wall? If yes, it blocks the motion.

Flag: "sausage"/"wall" are a loan for *capsule* and *half-space plane* — I'll pay it back at the formalism level.

Check: why model the arm as *fat* sausages rather than thin line-segment skeletons? What goes wrong with zero-width lines?

---

## Learner

you wouldn't want a skeleton because the arm has thickness, it has 3d printed 'meat' attached to the motors. and on the other end, you don't want too much detail because that'd add computational slowdown

---

## Grant

Exactly — both jaws of the vise. Real 3D-printed bulk means a skeleton would let a chunky elbow clip a wall the line never touches; a full collision mesh would be precise but too slow per command. The capsule is the compromise: a segment plus **one number**, its radius.

**Level 2 — the mechanism.** The radius buys a cheap check. Instead of reasoning about a 3D volume, compute the distance from the *centerline* to the plane (a dot product) and **subtract the radius**:

clearance = (distance of centerline to wall) − radius

Thickness collapses into a single subtraction. Block when clearance < `margin` (0.015 m). That's why radius is per-link in your config: `default: 0.03`, but `gripper_frame_link: 0.005` — the slim tip may reach closer.

Check: the bouncer knows the current pose and the proposed pose. Is checking just those two enough, or can something slip through between them?

---

## Learner

well i'd argue it is most of the time but i guess you can always interpolate between them to make sure there aren't obstacles along the way. but i'd argue its overkill for teleop or policies.

---

## Grant

Right for the common case: at 50 Hz each streaming step moves a hair, so start and end are millimeters apart and sampling is near-redundant.

But there's a geometric trap. The interpolation is in **joint space** — a straight line in angles — which is *not* a straight line in Cartesian space. It's an arc. Picture `shoulder_pan` swinging the arm: the wrist follows a circular arc that bows *past* the chord. Both endpoints can sit clear of a wall while the belly of the arc pokes through.

So sampling defends against two things: the occasional big command (reset-to-rest, a policy lurch, a resumed stale command) and this ever-present arc-bulge. Cheap insurance, and tunable: `intermediate_samples: 4` → **6** poses checked along the path.

Prediction: if the arm is *already* 2 mm inside a wall's margin and the rule is simply "block any pose with clearance < margin," what unwanted behavior results, and what's the minimal fix?

---

## Learner

if the arm is already past a wall's buffer, then if you simply hold, it'd get stuck there. you can't move it. i think we initially wanted to be clever by figuring out if someone is moving into a wall or away from it but then we realized, the simpler thing is to just slow down the arm's movement when its in the buffer.

---

## Grant

Deadlock diagnosis is exactly right — pure "hold if clearance < margin" is a roach motel; even the command that would back it out gets blocked.

But the code tells a slightly different story than your memory: it's not that slowdown *replaced* the directional cleverness — **both** are there. The directional idea is alive in the hard guard: when the arm starts inside a boundary, the rule is "only allow motion that *strictly increases* clearance" (the `not_retreating` branch). That's the "in or out?" logic; it breaks the deadlock.

The velocity damper is a **separate, orthogonal** layer. It doesn't decide in/out — it caps *speed* while any part of the arm is within `slowdown_distance` of a wall (`mode: "enforce"`, `slowdown_distance: 0.015`, `max_joint_velocity_deg_s: 15`).

Question: given they're separate, what does the damper add that the retreat guard doesn't? The hard guard would happily let the arm rocket up to a wall at full speed and stop dead at the margin — why is that worth a whole second mechanism?

---

## Learner

i would say it might be dangerous to let something move full speed and then abruptly stop. think of the acceleration involved. might damaged motors, arm components etc. i also found in practice that such a hold was hard to 'hold' in the sense it would hold but often the hold would allow brief motions into the barriers. which is what inspired me to think about how i might stop this unstable jerky behaviors ? and i thought ok, having the arm be super slow solves this problem and also the problem of even if the barrier fails completely, an arm that isn't moving fast cannot damage itself or the env to a high degree.

---

## Grant

The strongest of those is the defense-in-depth one: a slow arm has little kinetic energy, so even if the barrier logic fails entirely it can't do much damage. The deceleration/mechanical-stress point is also right.

Your "leak into the barrier" observation exposes *why* a position gate alone is insufficient: **the hard guard is velocity-blind.** It checks a commanded pose against a *fixed* margin, but the arm has momentum and the servo has latency. Stopping distance scales with speed (≈ v²). A fixed 15 mm margin is plenty when creeping and not enough when sprinting — the arm sails through before the next cycle's hold engages, gets yanked back, oscillates.

Compression: the damper's real job is to make the fixed margin **dynamically sufficient** — bound speed in the band so the arm can always stop within the buffer it has. Same shape as a control-barrier idea: clearance is the barrier, the damper is the velocity constraint keeping the safe set forward-invariant.

(Honesty flag: the leak could also be partly servo-PID overshoot, not only command-cycle latency.)

Prediction: `slowdown_distance` (0.015 m) and `max_joint_velocity_deg_s` (15) can't be set independently — what physical quantity links them, and which way does the constraint run?

---

## Learner

i actually didn't derive it like that btw. i just thought 15mm as a buffer from a wall is a good idea and then also derived 15 deg/s empirically.

---

## Grant

Good to be honest about — and it strengthens the picture. First, my overreach: the code does **not** compute v_max from slowdown_distance; they're independent inputs, and nothing in `velocity_damper.py` knows about braking distance. The inequality v²/(2a) ≤ d is the latent physics, not a line of code.

When you tuned 15°/s against a fixed 15 mm, you were solving that inequality *by measurement* — turning speed down until the arm reliably stopped inside the buffer. And that's the *right* move: for a cable/gear-driven, gravity-loaded, PID-controlled Feetech servo there is no clean constant `a` (it depends on pose, gravity, load, direction). A closed-form √(2a·d) would be confidently wrong; tuning absorbs the mess.

Check: by that logic, which pose or direction makes your empirically-safe 15°/s most likely to fail — where is effective `a` worst? Think about gravity.

---

## Learner

can you tell me which files are important for the keep_out logic ? maybe i can read them a bit

---

## Grant

Two layers — schema in `core`, enforcement in `edge`.

**Core four**
- `edge/src/armnet_edge/keepout.py` — geometry + the guard. `Capsule`, `Plane`, `VerticalPrism`, `KeepOutGuard.check()`. The heart.
- `edge/src/armnet_edge/kinematics.py` — joint angles → capsules. FK, `link_capsules`, `to_radians` (the `joint_map` sign/offset).
- `edge/src/armnet_edge/velocity_damper.py` — the soft speed layer.
- `edge/src/armnet_edge/connector.py` — the glue: `_apply_keep_out_config` (builds guards), `_process_safe_action` (per-command pipeline), `_apply_keep_out_result` (log-only / hold / interlock).

**Schema**
- `core/src/armnet_core/models.py` — `KeepOutConfig`, `ArmKeepOutConfig`, `KeepOutPlaneConfig`, `TopCameraWallsConfig`, `VelocityDamperConfig`.

**Optional** — `edge/tests/test_keepout_guard.py`, `test_connector_keepout.py`; tools `probe_planes.py`, `prism_tuner.py`, `live_keepout_viewer.py`.

Reading path matching our arc: `keepout.py` → `kinematics.py` → `connector.py`, with `models.py` open as the dictionary.

---

## Learner

@models.py (96-101) what is model validator for ?

(the `KeepOutPlaneConfig._normal_must_be_nonzero` validator)

---

## Grant

A `model_validator` is a gate Pydantic runs when it builds the object from JSON; fail → raise instead of returning a broken config. `mode="after"` = runs once fields are parsed and typed, so `self.normal` is a real 3-tuple and you can check across fields.

Why this one: the normal gives the wall its *orientation* — the direction into safe space — and clearance = (point − p0)·n̂ − radius. Feed `[0,0,0]` and that dot product is identically 0 for every point (wall means nothing), and normalizing n̂ divides by zero. So it guards the invariant "every plane is actually a plane." A cheap boundary check standing in for a confusing runtime failure.

Check: it uses `any(component != 0 ...)`, not `all`. Why is one non-zero component enough, and is `[0,0,1]` (your `table` normal) valid by this rule?

---

## Learner

what does (point - p0) . n give us ?

---

## Grant

The **signed perpendicular distance** from the point to the plane.

A plane is pinned by a point p0 on it and a unit normal n̂ out of it. (point − p0) runs from the anchor to your point; dotting with n̂ **projects** onto the normal, keeping only the component perpendicular to the wall and discarding the along-wall part.

Two consequences: it's **signed** (positive on the normal's side, negative across it, zero on the plane) and **sliding along the wall doesn't change it**.

Concrete, your `table` plane (p0 = [0.2, 0, −0.04], n̂ = [0,0,1]): (point − p0)·[0,0,1] = point_z + 0.04 = "height above the table." x and y never enter — right, an infinite floor doesn't care where you are horizontally. (True distance only because n̂ is unit; the code normalizes it.)

Check: for the `behind` plane (p0 = [−0.11,0,0.2], n̂ = [1,0,0]), what does the dot measure, and which way is safe?

---

## Learner

so point - p0 . n gives me perpendicular distance between the point from the plane in quesstion. right ?

---

## Grant

Yes — with one word doing a lot of work: *signed* perpendicular distance. Magnitude = shortest distance to the plane; sign = which side. One scalar answers "how far?" and "which side?", which is all the guard needs. (True distance only because n̂ is unit.)

---

## Learner

@keepout.py (820-953) jumping back to this, whats going on here ?

(`KeepOutGuard.check`)

---

## Grant

You've already derived most of it; this is the assembly.

**Phase 1 — decide the rule (once, from the current pose).** Convert current + proposed joints to radians via `joint_map`, build capsules at the current pose, measure each shape's clearance. That baseline decides which rule each plane/wall gets: started clear (≥ margin) → **margin rule**; started violated (< margin) → **retreat rule**.

**Phase 2 — sweep the path.** Walk `alpha` 0→1 in `intermediate_samples + 2` steps (the arc sampling). At each sample rebuild capsules and apply the assigned rule: margin rule → every sample must keep clearance ≥ margin (else `plane_violation`); retreat rule → every sample must *strictly increase* clearance (else `not_retreating`). First violation returns; survive all → allowed.

Subtle bit (line 913): in retreat mode the reference *advances* to best-so-far, making the requirement **monotonic** — a path that dips deeper on its way out is rejected even if it ends farther out. And the rule is frozen from the start pose, never re-evaluated mid-sweep — that's what prevents both the trap and the "started inside" excuse for plunging deeper.

Check: a link starts 5 mm past the margin and its clearance goes −5 → −3 → −4 → +2 mm along the path (ends safe). Does `check()` allow it? At which alpha does it decide, by which rule?

---

## Learner

can you add better comments to the function ? i removed some existing ones

---

## Grant

Here I hold the line — I don't write it *for* you; that's the point of me. But it's a teach-back in disguise: a good comment is you saying the *why* out loud, and you've articulated most of this today.

Principle: comments should capture the *why* and the *subtle*, not restate the *what*. The high-value ones here: why there's a sweep (joint line → Cartesian arc), why the rule is frozen from the start pose (anti-deadlock), why the retreat reference advances (monotonic), why the fixed margin exists (and what pairs with it downstream).

Pick the block you found trickiest — I'd nominate the retreat branch (895–913) — write the comment in your own words, and hand it to me to push on. Or give me the one-line intent per block and I'll help sharpen the wording. The words come from you first.

---

## Learner

[Pasted a long exchange from another agent session arguing that the camera keep-out should reduce from 4 prism faces to 2 (front + near-side per arm), and going back and forth on whether "outside both walls" is AND or OR, invoking De Morgan and the rest pose.] this is from another agent session, can you explain it better ?

---

## Grant

The other agent is right; here it is compressed.

**Crux: "avoid a box" is OR, not AND.** You fall *into* a box only when past *every* wall at once; you're *out* the moment you clear *any one* wall. So "stay out of the camera box" = "clear the front face **or** the side face."

**Picture:** stand at a building's corner — you're "outside" if beyond the front wall *or* the side wall; you don't need both. So the safe region is an **L wrapping the box**, whereas "beyond front AND beyond side" is only a small **quadrant**.

**Why AND breaks — the rest pose.** The camera column straddles the base (x ∈ [−0.085, −0.010]); at rest the arm folds into that x-band but sits off at y ≈ 0. Under OR (not-in-box) it clears the side face → safe. Under AND (front *and* side) it fails the front condition → wrongly illegal.

**Formal:** inside ⟺ (x<x_front) ∧ (x>x_rear) ∧ (y>y_near) ∧ (y<y_far); safe = ¬inside ⟺ the disjunction. De Morgan turns the negated conjunction into an OR.

**Practical (config-only):** `VerticalPrism` already computes clearance = max over four face intercepts (that's the OR). To get the 2-face version, keep front + near-side tight and push rear + far-side outward so they never win the max.

Check: describe the safe region's shape, and whether it equals "beyond front AND beyond side."

---

## Learner

"You fall into a box only when you're past every wall at once. You're out of it the moment you clear any one wall." this isn't true. i can bump into the camera mount just from the left or the right side. or just from the front side

---

## Grant

Fair — my phrasing was sloppy. "Clear a wall" must mean *be on the outside side of that wall's plane*, not "a wall exists over there." Bumping from the side: you're pressed on the side face but your x is still inside the box's front-to-back range — so you have *not* cleared the front wall. The side hit is caught by the side face.

Corrected: you're inside only when behind *all* faces at once; safe as soon as you're past the one you're approaching — and the geometry auto-selects it. Traces on your right-arm box (x ∈ [−0.085,−0.010], y ∈ [−0.175,−0.105]), clearance = max of the four:

- Front approach (0.0, −0.14): front = +0.010 (max), others negative → safe by front; push to x = −0.010 → 0 = contact.
- Side approach (−0.05, 0.0): side = +0.105 (max); front = −0.040 (**not** cleared) → safe by side; push to y = −0.105 → 0 = contact.

So both hits are caught, each by its own face. OR-logic doesn't wave a side approach through — it just means clearing the nearest face is enough to be out. Where OR matters: standing safely *beside* the camera (rest pose), one cleared face suffices; an AND demanding you also be in front would condemn it.

Check: at side-contact (−0.05, −0.105), what's the sign of the *front* face's distance, and why does that show "clear one wall → safe" didn't falsely pass it?

---

## Learner

its not about being inside or outside the box. its about fencing the arm away from hitting the camera mount. and i think doing it the same way as the regular front, back, left, right, table planes would work. you have 2 planes with normals pointing outwards.

---

## Grant

Half-right in an exact way: "stay outside the box" *is* that fence — the mount fills the box, so "don't hit the mount" and "keep capsules out of that volume" are the same sentence. The real question is the tool: can two AND-planes express it?

**Picture: straight cuts can't carve a notch.** Each plane is a half-space; the guard AND-s them (violate any → rejected), so the result is always **convex** — like flat cuts on a block, you can shave it but never cut an interior notch. Your camera safe region needs the arm allowed both *beside* and *in front* — a notch wrapping the corner → **non-convex** → no set of flat cuts makes it.

**Numbers:** two outward planes (front safe x>−0.010, side safe y>−0.105) AND-ed → forbidden = union of the back-sides. Rest pose (x≈−0.05, y≈0): behind front? yes → rejected. So the second plane *amputates* the home pose. With AND planes, more planes = more forbidden.

**Honest nuance:** a *single* near-side plane would fence the camera (the whole mount is at y ≤ −0.105) and keep the rest pose — but it deletes the entire y<−0.105 slab across all x. The box deletes only the camera's little volume.

So: planes = infinite half-spaces for the convex outer boundary (table, behind, walls); prism = a localized box for an interior obstacle whose safe complement is non-convex. Two planes is the one choice strictly worse than either.

Check: sketch the allowed (x,y) region around the camera — convex? If not, what does that alone tell you about any AND-of-planes scheme?

---

## Learner

what is convex and non-convex

---

## Grant

**Convex:** for *any* two points inside, the straight segment between them stays inside. No dents, holes, or notches. **Non-convex:** some pair of inside points whose segment pokes outside.

Pictures: convex — disk, square, triangle, a half-plane. Non-convex — crescent, L, star, donut. Test: stretch a rubber band around it; if it hugs exactly, convex; if it bridges a dent, non-convex.

Two facts that mattered: a half-space is convex, and intersecting convex sets stays convex — so AND-ing planes can *only* be convex (a theorem). Your camera safe region is non-convex — segment test: the rest pose (beside) and a pose reaching in front are both allowed, but the straight line between them runs *through the box*. So no pile of AND-ed planes can express it; you need the box, whose complement may be non-convex.

Check: full pie, single slice, pie with one slice removed — which are convex? For the non-convex ones, name two points whose segment escapes.

---

## Learner

ok so it can't be expressed as and AND of 2 planes. but why can't it be just walls then. like the prism was 4 walls before and now it can be 2 walls ?

---

## Grant

Yes — and this is the click. Two walls *do* suffice; the earlier confusion was a naming trap: **"2 planes" and "2 prism walls" are the same lines combined by opposite operators.**

- **Planes**: checked independently, AND-ed. Violate any → rejected. Forbidden = **union** of back-sides. Add a plane → forbidden grows.
- **Prism walls**: bundled under one `max`. Inside only when behind *all* walls at once. Forbidden = **intersection** of back-sides — a small corner you must be cornered by.

Rest pose (x≈−0.05, y≈0): 2 planes (AND) → behind front alone rejects it ✗. 2 prism walls (max) → behind front *and* behind side? side needs 0<−0.105, no → safe ✓.

"What happened to the other 2 walls?" A 2-wall prism no longer encloses a bounded box — it forbids an **infinite corner wedge** (rear-and-far). Fine, because your reachability argument says the arm can't reach the rear/far side anyway. Implementation note: `VerticalPrism` always takes four bounds; you realize "2 walls" by pushing rear/far far out so they never win the max. Config-only. That `max` is exactly why `VerticalPrism` is a separate class from `Plane` — two combinators, two primitives.

Check: same front + near-side walls, but push rear/far *inward* (all four tight) — is the rest pose still safe? Why/why not in one line?

---

## Learner

but when i'm tuning its cleaner for the user to know they only tune 2 walls. they don't need to tune 4 walls. which is why just having 2 walls make sense

---

## Grant

Good instinct — fewer knobs is better; tuning four when two are meaningful is how configs go silently wrong. But separate two tangled things:

**Knob count and wall count are separable.** How many numbers the human tunes needn't equal how many faces the guard stores. That splits your idea:

- **2-wall config file** — a new half-open-wedge primitive in schema + guard + tests. Not config-only, and it leans on the reachability assumption *forever*: move the camera or add a longer arm and the open sides silently stop protecting.
- **2-knob tuning flow** — the tuner asks only for front + near-side and fills rear/far itself (sentinels, or snug against the camera's known size). User touches two numbers; stored model stays a bounded, fail-safe box; you change only the tool.

The second gives the clean experience *and* keeps the robustness you have now. The deciding question: is what bothers you the config *file* having four entries, or the *person tuning* having to think about four faces? I suspect it's the tuning flow — and that doesn't require making the geometry two walls.

---

## Learner

can you save this sesision in grant ?

---

## Grant

Saved — transcript, summary, and an updated learner profile.
