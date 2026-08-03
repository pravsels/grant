## Learner

lets continue from yesterday's session

---

## Grant

Welcome back. We left three threads open in `check()`, each a natural next step:

- **Why `started_inside` is frozen** from the initial pose instead of recomputed at every sample along the path.
- **The retreat trace** `−5 → −3 → −4 → +2 mm` — is that motion allowed, and if it's rejected, at which step and by which rule?
- **Tracing `_capsule_plane_closest()`** line by line, then contrasting its clean affine minimum with the messier prism calculation.

The first two are really the same question wearing different clothes. Where do you want to start?

---

## Learner

        # Record violated planes so movement can be limited to strict retreat.

this one is for front, left, right and back and table planes whereas the other one is for camera prism planes, right

---

## Grant

You've got the split right structurally — but let me separate what the code *guarantees* from what you're asserting.

The two blocks are keyed on different dictionaries:

```
# keepout.py, KeepOutGuard.check()
previous_clearances = {
    name: self._plane_clearance(current_capsules, plane)[0]
    for name, plane in self.planes.items()
}
started_inside = {
    name: previous_clearances[name] < plane.margin
    for name, plane in self.planes.items()
}

# Camera walls use the same retreat rule as planes.
previous_wall_clearances = {
    name: self._wall_group_clearance(current_capsules, walls)[0]
    for name, walls in self.wall_groups.items()
}
```

So the real distinction is `self.planes` (each an independent half-space) vs `self.wall_groups` (walls combined into a prism). That much the code enforces.

The names "front, left, right, back, table" — that's a claim about what's *in* `self.planes`, which comes from config, not from these lines. Do you actually know those are the entries, or are you inferring it? Worth pinning down before we lean on it.

---

## Learner

where is KeepOutGuard set then ? would be useful to trace planes

---

## Grant

`__init__` is right where your cursor sits (line 301) — `self.planes = dict(planes)`, so planes are just passed in. The interesting question is *who* passes them. The production caller is in `connector.py`. Let me pin that.

Here's the trail, top to bottom:

```
# connector.py, guard construction
planes: dict[str, Plane] = {}
for plane_name, plane_cfg in plane_configs.items():
    ...
    planes[str(plane_name)] = Plane(
        point=plane_cfg["p0"],
        normal=plane_cfg["normal"],
        margin=float(plane_cfg.get("margin", 0.0)),
    )
wall_groups: dict[str, VerticalPrism] = {}
if isinstance(wall_config, dict) and wall_config.get("enabled", False):
    wall_groups["top_camera_walls"] = VerticalPrism(...)
```

Notice the asymmetry, because it settles your earlier question:

- The **plane names are whatever keys live under `keep_out.planes` in the config** (`plane_configs = arm_keep_out.get("planes")`). The code never mentions "front" or "table" — those are just dictionary keys chosen by whoever wrote the JSON.
- The **prism has exactly one hardcoded name**, `"top_camera_walls"`, and it's built from four scalars (`x_rear, x_front, y_left, y_right`), not from a list of planes.

So your front/left/right/back/table guess is only confirmable by reading the actual config file — it's data, not code.

The config is a `robot_cell_*.json` (nested `robot` → `arms` → `keep_out` → `planes`). Want to find that file and read off the real plane names? That closes the loop you opened.

---

## Learner

@robot_cell_so101_8.json (16-194)  looks like it comes from here and goes to guard_configs @connector.py (1215-1222)

---

## Grant

Yes — that's the first hop exactly. `arms` → `guard_configs` maps each arm name to its own `keep_out` block, and then the loop below pulls `plane_configs = arm_keep_out.get("planes")` from it. One guard per arm.

Now cash out your earlier guess against the data. You said "front, left, right, back, table." What's actually there:

- **left arm:** `table`, `behind`, `left`
- **right arm:** `table`, `behind`, `right`

So: no "front"; it's "behind" not "back"; and left/right isn't a fixed set — **each arm carries only its own outward lateral plane.** That last point is the interesting one.

Why would the left arm guard have a `left` plane but no `right` one, and vice versa? What does that tell you about what these planes are actually protecting against?

---

## Learner

its simple. in a bimanual setup, the left arm can't reach the right wall. not the case for a single arm ssetup so a single arm keepout would indeed have both left and right walls.

---

## Grant

Right — that's the reachability-pruning argument, and it's the correct reading: each plane is a workspace boundary, and you only pay for the ones a given arm can actually reach. The left arm is mounted left, so the left wall is live and the right wall is dead weight. I'll grant your single-arm claim too — a centered lone arm can reach both, so it'd carry both.

But your own framing exposes a gap. List the left arm's planes again: `table`, `behind`, `left`. Every one of those faces *outward* — floor, back, and the far-left edge.

In a bimanual rig the two arms share the space between them. **Nothing in either guard faces inward, toward the other arm.** So what stops the left arm from swinging right and clocking the right arm? Either these planes aren't the mechanism for that, or it's an uncovered case. Which do you think it is?

---

## Learner

well i had a future plan that we could protect the arms from collision based on their urdf models and kinematics. but that is something that isn't implemented

---

## Grant

That's the right diagnosis, and it's worth naming *why* it doesn't fit the current abstraction rather than just "not implemented yet."

Every shape in the guard today is **static and expressed in one arm's own base frame** — the table, the back wall, the camera prism don't move. That's what lets you precompute a plane once and check signed distance against it cheaply.

The other arm is a **moving obstacle.** There's no fixed plane you can write down for it; its capsules depend on the *other* arm's live joint state, and both live in a shared world frame. So it's not a missing plane in the config — it's a different kind of check: capsule-vs-capsule between two FK chains, re-evaluated every step, which is exactly why it wants the URDF/kinematics machinery you're describing.

The good news: you already have the pieces. `link_capsules()` gives you each arm's capsules, and you've got capsule-segment geometry in `_capsule_plane_closest`. The new primitive is capsule–capsule distance instead of capsule–plane. Where do you want to take it — sketch that design, or back to one of the open traces?

---

## Learner

back to the absolute core of calculating the capsules distance from the planes. zooming in on the core methods that do that

---

## Grant

Good — this is the cleanest primitive in the file. Here it is in full:

```
# keepout.py
def _capsule_plane_closest(capsule, plane):
    """Return clearance and the capsule endpoint closest to a plane."""
    # Plane distance is affine, so its minimum lies at one endpoint.
    start_distance = float(np.dot(capsule.start - plane.point, plane.normal))
    end_distance = float(np.dot(capsule.end - plane.point, plane.normal))
    assert capsule.end_radius is not None
    # Convert centre-line distance to outer-surface clearance.
    start_clearance = start_distance - capsule.radius
    end_clearance = end_distance - capsule.end_radius
    ...
    if start_clearance <= end_clearance:
        return (start_clearance, ...capsule.start...)
    return (end_clearance, ...capsule.end...)
```

The entire function rests on the claim in that first comment: *"Plane distance is affine, so its minimum lies at one endpoint."* Everything else is bookkeeping around it.

You already own the per-point piece — signed distance is `(x − p0)·n̂`. Now extend it along the segment. Parametrize a point on the centre line as `x(t) = start + t (end − start)` for `t ∈ [0,1]`, and write the signed distance `d(t)`.

What does `d(t)` look like as a function of `t` — what's its shape? And from that shape, why must the minimum sit at `t=0` or `t=1`, never in the middle?

---

## Learner

what does 'plane distance is affine' mean. lets be precise here

---

## Grant

Precise version. **Affine = linear map plus a constant.** A function `f` is affine if `f(x) = a·x + c` for some fixed vector `a` and scalar `c`. (Strictly *linear* would require `c=0`, i.e. `f(0)=0`; affine relaxes that.)

The plane's signed distance has exactly this form:

  d(x) = (x - p0) · n̂ = (n̂ · x) - (n̂ · p0)

so `a = n̂` and `c = -(n̂ · p0)`.

Now restrict to the segment `x(t) = start + t·(end - start)`, for `t` in `[0, 1]`. Substitute and group by `t`:

  d(t) = [n̂·start - n̂·p0]  +  t·[n̂·(end - start)]
       = d(0) + t·(d(1) - d(0))

That's just `a + b·t` — a **straight line** in `t`, constant slope `b = n̂·(end - start)`.

[The learner noted inline LaTeX wasn't rendering; this was re-delivered without LaTeX, then in display-mode LaTeX on separate lines, which rendered.]

So the picture is: walk from one end of the capsule's centre line to the other, and the signed distance to the plane changes at a constant rate. No curvature, no interior dip.

Given that `d(t)` is a straight line on `[0, 1]`, where's its minimum — and why does that justify checking only `start` and `end`?

---

## Learner

so for the capsule and plane case, we only check the end points and if they have cleareance from a plane. that alone tells us if the whole capsule is clear or not.

---

## Grant

Exactly right — and the reason it's *valid* (not just a shortcut) is the straight-line shape. Since clearance varies linearly along the spine, every interior point sits somewhere between the two endpoint values. So

  min over t of clearance(t) = min(start clearance, end clearance).

If the smaller endpoint clears the plane, the whole capsule clears. No interior point can secretly dip below.

One sharpening to make sure the picture is airtight: we just added tapering, so the radius isn't constant — it interpolates from `radius` at the start to `end_radius` at the end. Clearance is now `clearance(t) = d(t) - r(t)`. Does the "minimum at an endpoint" guarantee survive that subtraction? Think about what kind of function `r(t)` is, and what you get when you subtract it from `d(t)`.

---

## Learner

but wait a minute though. what about a joint touching a plane horizontally, meaning with some point that is on the centre line part of the capsule ? how would just calculating clearance from the end cover it ?

---

## Grant

That's the right worry to poke at, and it's the exact case that *looks* like it should break the shortcut. Let me take it head-on.

Picture the capsule lying flat, parallel to the plane — its whole body at roughly equal height above the floor. The closest point does seem to be somewhere in the middle. But watch what happens to the slope:

  slope = n̂ · (end - start)

When the capsule is parallel to the plane, its direction `(end − start)` is perpendicular to the normal `n̂`, so that dot product is **zero**. The line `d(t)` goes **flat** — every point on the spine is at the *same* distance. The middle isn't closer than the ends; it *ties* them. So `min(start, end)` still returns the correct value.

That's the general fact hiding here: an affine function on `[0,1]` attains its minimum at an endpoint — and in the degenerate flat case, at *every* point including the endpoints. **There is no configuration where an interior point beats both ends.** Tilt the capsule and one end wins; lay it flat and it's a tie.

The key is that this is special to **planes**, because a plane's distance field is affine — constant gradient everywhere.

Now hold onto that intuition, because it's exactly what fails next door: distance to a *point*, or to another *capsule*, is not affine along the spine — it's a convex bowl, and the minimum genuinely can sit in the interior. That's the whole reason the prism code has to go looking for interior crossings. Want to turn to that contrast now?

---

## Learner

but isn't the prism just 4 walls ? why would the logic change now ?

---

## Grant

Careful — that's the same trap you fought through on Friday, wearing new clothes. "Four walls" suggests four independent planes, each checked on its own. But a prism isn't four boundaries; it's one bounded **forbidden box**, and that changes how you combine them.

Here's the distinction. A single plane splits the world into safe / unsafe — being clear means staying on the safe side of *that one* boundary. But to be clear of the *box*, you don't need to be past all four faces. You only need to be past **one**. Step out the front face and you're outside the box, never mind that you're still between the left and right faces.

So the clearance to the prism isn't the *min* of the four face-distances — it's the **max**:

  clearance_prism(x) = max over faces of ( face-distance_i(x) )

"You're as safe as your best-escaping face." That's exactly your Friday result: the forbidden region is the *intersection* of four half-spaces (inside all four ⇒ inside the box), so by De Morgan, *outside* is a disjunction — outside face 1 **or** 2 **or** 3 **or** 4 — and disjunction over signed distances is `max`.

Now here's why the segment logic breaks. For one plane, clearance along the capsule was a single straight line → min at an endpoint. But `max` of four straight lines is a **convex, V-shaped** function — it can bend downward and bottom out *in the middle* of the segment. That interior dip is a real closest point that neither endpoint sees.

Before I show the code: sketch `max(two straight lines)` as a function of `t`. What shape do you get, and where can its minimum land?

---

## Learner

we need to slow down here. my understanding isn't good.

---

## Grant

Good call. Let me throw out the capsule, the four walls, and the segment — all of it — and rebuild from the smallest possible version. We'll add pieces back only once each one is solid.

Simplest case: **one point, one forbidden region, in 1D.**

Picture a number line. The forbidden region is the interval from 2 to 5 — that's our "box," just squashed down to one dimension. It has two "faces": a left one at 2 and a right one at 5. Anywhere inside `[2, 5]` is forbidden; outside is safe.

Now put a point at position `p = 7`.

Just answer this, nothing more: how far is `p = 7` from the forbidden interval, and which face is it closest to?

---

## Learner

7 is 2 points away from one end of the forbidden space, 5

---

## Grant

Exactly. Now let me name the two faces as little formulas, because this is where `max` sneaks in.

Measure how far outside `p` is *on account of each face*:

- left face at 2:  `2 - p`
- right face at 5:  `p - 5`

Evaluate at `p = 7`:

- left: `2 - 7 = -5`
- right: `7 - 5 = +2`

The true answer you just gave is `+2`. Notice which combiner recovers it:

  max(-5, +2) = +2

`min` would hand you `-5`, which is nonsense here. So the two faces combine with **max**, and the positive winner tells you the point is outside, 2 units clear, via the face at 5.

Now the telling case — put the point *inside*, at `p = 3`. Compute `2 - p` and `p - 5`, take the max. What sign do you get, and what do you think that sign is telling you?

---

## Learner

it'd be max(-1, -2) which would be -1

---

## Grant

That's it. Let me read back what `-1` is telling you:

- **Negative sign** → the point is *inside* the forbidden interval.
- **Magnitude 1** → the nearest face (the one at 2) is 1 unit away — that's how deep you've penetrated, or equivalently the shortest escape.

So one single expression, `clearance(p) = max(2 - p, p - 5)`, does everything: positive = outside and clear by that much, zero = on the boundary, negative = inside and that deep. And `max` automatically picks the face that matters in *both* regimes — the escape face when outside, the nearest wall when inside. No if-statements about where the point is.

That's the entire prism idea, just in 1D with two faces.

The jump to the real thing is only bookkeeping: a 2D box has **four** faces (two for x, two for y), so it's `max` of four terms instead of two — but the logic is identical. And in 3D the prism is that same 2D box, just extended infinitely up and down, which is why the code throws away the z-coordinate entirely.

Comfortable enough with the 1D `max` to add the second dimension?

---

## Learner

sure, lets do it

---

## Grant

Same box, now in 2D. Forbidden region is the rectangle `2 ≤ x ≤ 5` and `2 ≤ y ≤ 5`, so four faces: left/right in x (at 2 and 5) and left/right in y (at 2 and 5). Forbidden means inside on **both** axes at once.

The four face terms are just the 1D pair, once per axis:

- x-left: `2 - x`
- x-right: `x - 5`
- y-left: `2 - y`
- y-right: `y - 5`

and clearance is the `max` of all four.

Take the point `p = (7, 3)` — off to the right, level with the box. Compute the four terms and take their max. What number do you get, what face wins, and does it match where you'd point if I asked "nearest bit of the box"?

---

## Learner

max was 2 so its clear.

so is the logic that its x or y could be within the box but it only matters if its x or y is further away on the left or the right to be outside the region ?

---

## Grant

Yes — you've got the principle, let me just tighten the wording.

To be **inside** the forbidden box you must be inside on *every* axis at once (and inside all four faces). So to be **outside**, it's enough to be outside on *any single* face. Your point sat inside the box's y-range (`y = 3` is between 2 and 5), but `x = 7` pokes out the right side, and that one escape is all it takes. `max` is what surfaces "am I outside on at least one face?" — the biggest term is the face doing the saving.

Clean version of your sentence: *being inside on some axes is harmless; you're clear the moment one face puts you outside, and `max` reports that face.*

Now the check that matters — slide the point to the **corner**, `p = (7, 7)`. Compute the four terms and the max. Then, separately: what's the actual straight-line (ruler) distance from `(7,7)` to the nearest bit of the box, which is the corner `(5,5)`? Compare the two numbers.

---

## Learner

max was 2 for both the axes and the disatance is also 2 from 7,7 to 5,5

---

## Grant

Hold on — check that second number. `(7,7)` to `(5,5)` isn't a straight sideways step; you have to move 2 in x **and** 2 in y. That's a diagonal.

The `max` is genuinely 2 — no dispute there. But the ruler distance along that diagonal: apply Pythagoras to the 2-across, 2-up triangle. What do you actually get?

---

## Learner

oh is it 2 * sqrt(2) ?

---

## Grant

Right, `2√2 ≈ 2.83`. So look at the mismatch:

- the `max` formula says clearance **2**
- the true ruler distance to the corner is **2.83**

The formula *under-reports* — it claims you're closer to the box than you actually are. That's not a bug; it's the whole reason the docstring calls it a **conservative** clearance. On the face regions (like your earlier `(7,3)`) it's exact; only in the corner diagonals does it undershoot, because `max` measures along the axes and ignores that a diagonal escape is longer.

Here's the question that ties it to safety: the formula is *wrong* in the corners, but always wrong in the same direction — it says "less clearance than reality." Why is that the *safe* direction for a collision check to err, and what would go wrong if it erred the other way (over-reporting)?

---

## Learner

under reporting is fine because you have more clearence in reality than what was calculated. so you have more leeway than you thought. over reporting is bad because you have less leeway than you calculated.

---

## Grant

Nailed it. Under-reporting only ever costs you a little usable workspace — the guard might veto a legal motion that skirts a corner (a false alarm, annoying but harmless). Over-reporting risks the one thing a safety check must never do: wave through a motion that actually collides. When you can't be exact, you deliberately bias toward the harmless failure. That's the asymmetry the whole guard is built on.

So, consolidating — for a **single point**, you now own the prism:

- clearance = `max` of four affine face-terms
- sign tells inside/outside, magnitude tells depth/clearance
- exact on faces, conservatively low in corners, never optimistic

The last piece is the one we backed away from earlier, and now it'll land. Reintroduce the **capsule**: instead of a fixed point, the point slides along the spine, `t` from 0 to 1. Each of the four face-terms was affine in position, so along the spine each becomes a straight **line in t**. The clearance is the `max` of those four lines at each `t`.

That's the object to picture next: `max` of a few straight lines, graphed against `t`. Shall we sketch what that graph looks like, and find where its minimum can sit?

---

## Learner

i didn't understand the capsule part at all

---

## Grant

Let me drop the "lines in t" phrasing — that was me getting ahead of the picture. Back to something concrete.

A capsule's spine is a line **segment**, not a single point — say it runs from `A = (7, 3)` to `B = (3, 7)`. Same forbidden box as before, `[2,5] × [2,5]`.

To find how close the *whole spine* comes to the box, imagine a bead sliding along the spine from `A` to `B`, and at each position you compute the clearance the way you just learned (max of the four face-terms). Clearance becomes a number that changes as the bead moves.

Let me compute the two ends for you:

- at `A = (7,3)`: max of face-terms is **2** (out the right side, exactly like before)
- at `B = (3,7)`: by symmetry, also **2** (out the top)

Now you do the **midpoint** of the spine, which is `(5, 5)`. Compute the four face-terms there and take the max. What clearance does the bead see in the middle?

---

## Learner

max cleareance is -2

---

## Grant

Let me see the four terms — one of them looks off. At `(5, 5)`:

- x-left: `2 - 5 = -3`
- x-right: `5 - 5 = 0`
- y-left: `2 - 5 = -3`
- y-right: `5 - 5 = 0`

Take the max of `{-3, 0, -3, 0}`. Where does `-2` come from — can you recompute the right/top terms? `x = 5` sits exactly *on* the right face at 5, so `x - 5` should be...?

---

## Learner

i thought you mean we now have a new square from 3 to 7 in x and y that is forbidden

---

## Grant

Ah, that's the mix-up — let me clear it. The box **doesn't change**. The forbidden region stays fixed at `[2,5] × [2,5]` the whole time. `A = (7,3)` and `B = (3,7)` are *not* a new box — they're the two **ends of the capsule's spine**, i.e. the two joints of one robot link. Join them with a straight line and that line is the link.

Picture it:

- The box sits in the middle, corners at (2,2), (5,2), (2,5), (5,5).
- `A = (7,3)` is out to the right of it.
- `B = (3,7)` is up above it.
- The spine is the straight diagonal segment connecting `A` to `B`. That diagonal passes right over the box's top-right corner `(5,5)` — which is exactly its midpoint.

So the bead isn't defining forbidden space; it's the robot link sweeping past a fixed obstacle. At the midpoint `(5,5)` the link is *grazing the corner*.

Now recompute the clearance at that midpoint `(5,5)` against the **fixed** box — the four terms I listed. What's the max?

---

## Learner

max is 0

---

## Grant

There it is. Now line up the three numbers the bead saw along the spine:

- start `A`: clearance **2**
- middle `(5,5)`: clearance **0** (grazing the corner)
- end `B`: clearance **2**

This is the payoff. Suppose you'd used the plane trick — check only the endpoints. Both say **2**: "loads of room, safe." But the link actually **touches the box** at its midpoint. Endpoint-only checking would have *over-reported* clearance and waved through a collision — the exact unsafe direction you flagged earlier.

That's why the prism can't reuse the plane shortcut. Plot clearance against position along the spine and you get a **V**: 2 → 0 → 2. It dips in the middle and climbs back. The lowest point — the true closest approach — sits in the **interior**, invisible to the endpoints.

The V shape is precisely "max of straight lines": each face-term traces a straight line as the bead moves, and taking their max at every position gives that bowl with a kink at the bottom. So to find the minimum, the code can't just look at `t=0` and `t=1` — it must also check where those lines **cross** (the bottom of the V).

Quick check before we read that code: for a V-shaped (convex) curve on `[0,1]`, its minimum is at one of only two *kinds* of places. What are they?

---

## Learner

intercepts

---

## Grant

Close, but let me pin the word — "intercept" usually means where a line hits an axis, and that's not quite what's driving the V. Think about the bead walking left to right along the V:

The two kinds of places where the minimum can sit are:

1. the **endpoints**, `t = 0` or `t = 1`, and
2. the **bottom of the V** — the interior point where the two straight lines **cross each other** (a kink).

Nowhere else, because between kinks the curve is a straight line, and a straight line's min on a stretch is always at one of its ends.

That maps directly onto the code. Look at how it builds its list of places to check:

```
# keepout.py, capsule_vertical_prism_signed_distance
candidates = [0.0, 1.0]
for first in range(len(intercepts)):
    for second in range(first + 1, len(intercepts)):
        slope_difference = slopes[first] - slopes[second]
        if slope_difference == 0:
            continue
        alpha = float((intercepts[second] - intercepts[first]) / slope_difference)
        if 0.0 < alpha < 1.0:
            candidates.append(alpha)
return min(float(np.max(intercepts + alpha * slopes)) for alpha in candidates)
```

`candidates` starts as `[0.0, 1.0]` — your endpoints. The double loop then finds every place two face-lines **cross** (solving line `first` = line `second` for `alpha`) and keeps the crossings that fall inside `(0,1)`.

Here each face-line is written as `intercept + alpha * slope`. In that form, what do you think `intercept` is (the value at which `alpha`?), and what is `slope` measuring?

---

## Learner

i'll have to come back to this. lets save the session in grant pls

---

## Grant

Saved the transcript, summary, and updated the learner profile. Resume point: reading off what `intercept` and `slope` mean for each prism face-line, then confirming the crossing formula lands you at the bottom of the V.
