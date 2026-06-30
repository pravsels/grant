### Meaningful Threads

**1. The Mechanics of Classifier Guidance vs. CFG**
- **Question:** "how did CFG even come about ? why was it necessary ?" and "how i can go from an input image to classifier score to getting a 'gradient'"
- **Prior model:** Learner assumed conditioning just meant adding text to a prompt. They didn't know the history of Classifier Guidance or the concept of calculating gradients with respect to inputs (pixels).
- **Unlock:** The "control board of sliders" analogy to explain gradients, followed by the explanation of backpropagating straight to the pixels (`x.requires_grad = True`) while locking model weights. CFG was framed as calculating the geometric difference between conditioned and unconditioned predictions to bypass the easily-fooled classifier.
- **End:** Learner accurately taught back the CFG inference process ("gets the difference between the 2 to point in the direction... apply a weight") and predicted that relying on a narrow classifier gradient just "keeps making the image more and more orange."
- **Evidence level:** strong

**2. CFG Extrapolation and Robot Behavior**
- **Question:** Implied by Grant: "What do you think physically happens to the robot's actions if we turn that $\beta$ dial up way too high?"
- **Prior model:** No prior model on the physical consequences of mathematical extrapolation in policy networks.
- **Unlock:** Framing CFG as drawing an arrow from "average" to "good" data, and then asking what happens when you multiply that arrow to push past the data you collected.
- **End:** Learner successfully mapped the abstract mathematical extrapolation to physical bounds: "maybe it tries to grasp fast or grasp harder ?"
- **Evidence level:** strong

**3. Training vs. Inference in CFG**
- **Question:** "does that mean 70% of the time we calculate both, then get the difference... and then 30% of the time, we don't have the advantage prompt or the guidance."
- **Prior model:** Learner conflated the inference-time CFG calculation (calculating differences and scaling by beta) with the training-time process (prompt dropout).
- **Unlock:** Explicitly separating the two phases: training is just playing two different imitation games (70% with prompt, 30% blanked out) to predict exact actions; inference is when the math (arrows, differences, $\beta$) happens.
- **End:** Learner nodded along and moved on to ask about equations, ignoring the follow-up question meant to test this concept.
- **Evidence level:** unverified

**4. Context-Specific "Unconditioned"**
- **Question:** "when you say unconditioned what you mean is we still have the text language prompt l... we just don't add the advantage text. am i right ?"
- **Prior model:** Initially standard assumptions about "unconditioned" meaning entirely blank inputs.
- **Unlock:** Grant's validation of the learner's realization that the robot would flail randomly without the task prompt.
- **End:** Learner confidently defined that unconditioned drops the advantage text but keeps the task instructions.
- **Evidence level:** strong

### Surfaced Misconceptions
- Confusing the CFG mathematical operations (vector subtraction, scaling) for training steps, rather than understanding them strictly as inference-time steering mechanisms.
- Believed "advantage conditioning" was purely about appending text to a prompt. (This is true for $\beta=1$, but misses the extrapolative power of CFG).

### Open Threads
- What mathematically cancels out in Equation 2 of the paper when $\beta = 1$?
- What would happen at inference if the model had never been trained on unconditioned data? (Learner skipped this Socratic question).

### Style Signals
- **Formula-driven:** The learner actively requests exact mathematical formulas and programmatic mappings (e.g., "show me the formula of the gradient").
- **Mechanically focused:** They want to "drill down" into the exact step-by-step mechanics (e.g., mapping pixels to scores to gradients).
- **Self-directed:** They will completely ignore a tutor's Socratic question if they have a burning question of their own they want answered (skipped the training thought-experiment to demand the equation numbers in the paper).