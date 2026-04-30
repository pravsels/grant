### Equation 3 Summation Notation
- **Question:** "how does that make sense?" regarding adding a discounted future Q to the summation $C$ times.
- **Where they started:** The learner misread standard notation, assuming the summation applied to both the reward terms and the expectation of the future Q-value.
- **What unlocked it:** Explicitly rewriting the equation with brackets to show the summation only binds to the reward, followed by a geometric "timeline" explanation of taking $C$ steps, collecting rewards, and then asking for *one* future estimate.
- **Where they ended:** They recognized the math and mapped it conceptually, but didn't prove transfer. "ah makes sense about the summation being only for the reward term."
- **Evidence level:** wobbly

### Multimodal VLA vs Unimodal Gaussian Actor
- **Question:** "why is the VLA's actions multimodal but the actor's actions unimodal ?"
- **Where they started:** Didn't understand the physical geometry of action distributions or why a single Gaussian actor fails on diverse human data.
- **What unlocked it:** The "Handle" vs "Rim" grasp example. Explaining that the VLA collapses the multimodal choice into a single mode, which is passed as an *input* to the unimodal Actor to refine, preventing the Gaussian from averaging into empty space.
- **Where they ended:** Asked a follow-up about the notation of the Actor's mean, indicating they were trying to map the input concept to the math.
- **Evidence level:** wobbly

### Actor Mean Notation Trick
- **Question:** "what does it mean for the action distribution to have a mean of (x, a_tilde_1:C) ?"
- **Where they started:** The learner took the notation literally, thinking the tuple of state and VLA action *was* the mean of the distribution.
- **What unlocked it:** Clarifying that $\mu_\theta$ represents the neural network itself, and the tuple represents the *inputs* fed into that network to produce the mean vector.
- **Where they ended:** Understood the data flow. "yeah this makes sense."
- **Evidence level:** wobbly

### Reference Action Dropout
- **Question:** "how could it be zeros though ? wouldn't the regularization term now force the actor to output actions close to a vector of 0s ?"
- **Where they started:** Logically inferred that if the reference chunk is replaced with zeros, the BC loss target would also be zeros, forcing the robot to stop moving.
- **What unlocked it:** Separating the **forward pass** (blinding the input to prevent lazy copy-pasting) from the **loss function** (which still grades against the true reference action from the buffer).
- **Where they ended:** Accepted the explanation and moved on to clarify the network architectures.
- **Evidence level:** wobbly

### Policy Parameterization ($\pi_\theta$ vs $\mu_\theta$)
- **Question:** "what is the actual actor network ? ... do you think there's some term that actually forces pi_theta to be a normal distribution?"
- **Where they started:** Expected a specific mathematical loss term to be responsible for shaping the neural network's output into a Gaussian distribution.
- **What unlocked it:** Providing the literal 3 lines of PyTorch code showing that the network only outputs the mean, and the normal distribution is created *by definition* by manually adding fixed `randn` noise.
- **Where they ended:** Immediately caught a specific implication from the code snippet: "wait, did you say that the noise is fixed ?"
- **Evidence level:** strong

### Warmup Phase & Offline IL Data
- **Question:** "if warmup is about seeing successes than you can absolute fill it up with IL data from the past."
- **Where they started:** Correctly deduced that if the goal is just avoiding a cold-start with sparse rewards, offline Imitation Learning data should suffice.
- **What unlocked it:** Grant attempted to argue it was impractical to retroactively generate VLA reference actions ($\tilde{\mathbf{a}}$) for offline data. The learner instantly refuted this: "you can run the VLA on IL inputs and get the reference actions btw". Grant had to pivot to the true structural reason: state distribution (the Critic needs to evaluate the VLA's specific wobbles and recoveries, not just golden human paths).
- **Where they ended:** The learner recognized the pivot but was out of time. "i'll have to come back to this."
- **Evidence level:** strong

### Algorithm 1 Logic & Action Selection
- **Question:** Is the executed action from the human, VLA, or policy? "i feel like... reference action would be human when it's intervention. but the action actions would always be from the policy right ?"
- **Where they started:** Assumed that in an RL algorithm, the executed action must always come from the RL policy.
- **What unlocked it:** Delineating Line 9 (what motors execute for safety/success) from Line 11 (what the loss function targets for BC regularization).
- **Where they ended:** "yep that makes sense."
- **Evidence level:** wobbly

### Surfaced Misconceptions
- **Notation Overload:** Consistently reading math equations too literally. Assumed sum boundaries applied globally, read network inputs as direct values, and assumed the loss target mirrored the dropout mask.
- **Algorithm vs Real World:** Assumed RL algorithms always execute their own policy, missing the necessary physical safety overrides for real-world robotics (executing VLA during warmup or human interventions).

### Open Threads
- The Chunking Boundary Problem / off-policy firewall (parked early in the session).
- Why the Critic desperately needs to see the VLA's imperfect "wobbles" (state distribution) rather than just perfect offline IL data.
- Equation (2) unconditioned terms when $\beta = 1$.
- Line-by-line mapping of `compute_loss_critic`.

### Style Signals
- **Adversarial fact-checking:** Will actively fact-check explanations. If given a weak or hand-wavy argument (e.g., "it's too hard to generate VLA actions offline"), they will instantly call it out with a valid technical workaround.
- **Needs code to ground math:** Vague math explanations don't land as well as saying "Here are the 3 lines of PyTorch." When shown the code, they immediately extract the relevant physical meaning (e.g., catching that the variance is fixed).