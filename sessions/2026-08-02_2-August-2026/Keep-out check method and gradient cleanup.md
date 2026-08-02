## Learner

want to build on friday's session

---

## Grant

Offered four live threads from Friday: camera geometry, `KeepOutGuard.check()`, velocity-damper stress testing, and convexity. The learner chose to start with what happens in `check()`.

Framed the function as two moves:

1. Freeze the rule from the starting pose: each boundary chooses either “stay outside the margin” or “strictly retreat.”
2. Sweep the proposed path: every sampled pose must obey that frozen rule.

Asked about the unresolved trace `−5 → −3 → −4 → +2 mm`: whether it is allowed, where it rejects, and why.

---

## Learner

which file is it

---

## Grant

Pointed to `armnet/edge/src/armnet_edge/keepout.py`, `KeepOutGuard.check()`.

---

## Learner

we get the goal and convert current and goal to radians and then idk what's going on here

Selected the block that builds `current_capsules`, `previous_clearances`, `started_inside`, `previous_wall_clearances`, and `started_inside_walls`.

---

## Grant

Explained the block as a snapshot of the starting situation:

- `current_capsules` turns current joint angles into physical capsule geometry.
- `previous_clearances` records, for each ordinary plane, the smallest clearance of any arm link.
- `started_inside` records whether that clearance is below the safety margin.
- The wall dictionaries repeat the operation for grouped top-camera walls.

The snapshot freezes which boundaries use the ordinary margin rule and which use the strict-retreat rule during the coming path sweep. Asked why this must be decided from the current pose rather than recalculated at every sample.

---

## Learner

can you add comments saying one is about front, left, right planes and the other is about top camera walls?

---

## Grant

Added comments distinguishing regular keep-out planes from grouped top-camera walls.

---

## Learner

Asked whether the gradient-based `KeepOutConstraintState` machinery was stale because gradients were no longer used.

---

## Grant

Initially checked an older working-tree state and found gradient consumers in the live viewer, benchmark, and tests, while confirming that the production velocity damper used exact clearance snapshots.

---

## Learner

check again. its been removed

---

## Grant

Rechecked the changed working tree. Confirmed that `KeepOutConstraintState`, `constraint_states()`, and all gradient-related references had been removed from `armnet`; the system now uses exact clearance snapshots only. Corrected the earlier answer.

---

## Learner

so am i right in thinking that we form capsules of arm links and check the signed distance of links from all the planes?

---

## Grant

Confirmed the core picture:

1. Forward kinematics turns each arm link into a capsule.
2. For each ordinary plane, the guard finds the capsule with the smallest signed surface clearance: signed centre-line distance minus capsule radius.
3. It compares that clearance with the plane's safety margin.

Added two qualifications: top-camera walls are evaluated together as a prism rather than as independent planes, and checks repeat over sampled poses along the proposed motion rather than only at the endpoint.

---

## Learner

what are the core functions for the plane check and the prism check?

---

## Grant

Identified the geometry primitives:

- `_capsule_plane_closest()`
- `_capsule_vertical_prism_closest()`

And the all-link wrappers:

- `_plane_clearance()`
- `_wall_group_clearance()`

Both wrappers use `_minimum_clearance()` to select the closest and therefore limiting arm link.
