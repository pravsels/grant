### `KeepOutGuard.check()` — Initial Snapshot
- **Question:** what happens after current and goal joint positions are converted to radians?
- **Where they started:** understood goal construction and radians conversion, then lost the thread when capsule and clearance dictionaries appeared.
- **What unlocked it:** the “starting snapshot” or scoreboard framing. Current joints become capsules; each ordinary plane and camera-wall group records its minimum arm clearance and whether it starts below the margin.
- **Where they ended:** understood that the two sets of dictionaries serve ordinary planes versus grouped top-camera walls. The deeper reason for freezing `started_inside` from the initial pose was posed but not answered.
- **Evidence level:** developing

### End-to-End Geometry Picture
- **Question:** is the mechanism essentially capsules plus signed distances to planes?
- **Where they started:** independently compressed the pipeline to “form capsules of arm links and check signed distance from all planes.”
- **What unlocked it:** two precision corrections: clearance is signed centre-line distance minus capsule radius, and the camera walls are combined as one prism rather than checked as independent planes. The same checks run at every sampled pose along the motion.
- **Where they ended:** owns the main shape of the plane-check pipeline; prism combination and path sampling still needed as explicit qualifiers.
- **Evidence level:** moderate

### Geometry Call Chain
- **Question:** which functions contain the core plane and prism checks?
- **Where they started:** looking for the code entry points after gaining the system-level picture.
- **What unlocked it:** separating the single-capsule geometry primitives from the all-link aggregation wrappers.
- **Where they ended:** identified `_capsule_plane_closest()` and `_capsule_vertical_prism_closest()` as the geometry, `_plane_clearance()` and `_wall_group_clearance()` as wrappers, and `_minimum_clearance()` as the limiting-link selector.
- **Evidence level:** received, not yet traced independently

### Gradient Machinery Removal
- **Question:** is `KeepOutConstraintState` stale now that production no longer uses gradients?
- **Where they started:** correctly noticed that gradient-based projection no longer matched the current velocity-damper design.
- **What happened:** the working tree changed during the session. An initial inspection found diagnostic consumers in the viewer, benchmark, and tests; after the learner challenged this and requested a fresh check, all gradient machinery and consumers had in fact been removed.
- **Where they ended:** confirmed that `armnet` now uses exact clearance snapshots only.
- **Evidence level:** strong codebase awareness; learner caught stale evidence

### Comments Added
- Added comments in `KeepOutGuard.check()` distinguishing the initial clearance snapshots for ordinary keep-out planes from those for grouped top-camera walls.

### Open Threads
- Why `started_inside` must be frozen from the initial pose instead of recalculated at every interpolation sample.
- Resolve the monotonic-retreat trace `−5 → −3 → −4 → +2 mm`: rejection point and rule.
- Trace `_capsule_plane_closest()` line by line, then compare its simple affine minimum with the more involved prism calculation.
- Retained from Friday: worst-gravity pose for the empirical velocity cap; two-knob bounded-prism tuning; convexity transfer check.

### Style Signals
- The learner benefits from first naming the role of a block (“starting snapshot”) and then assigning each data structure to that role.
- They actively verify explanations against a rapidly changing working tree and will catch conclusions based on stale code. Re-read before making current-state claims.
- Their own compression of the system is increasingly accurate; respond by tightening boundary cases rather than restarting from first principles.
