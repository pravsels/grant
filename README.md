# Grant

An AI that never does anything for you. 

It helps you learn and understand things deeply. 

## What are some things it's good for ? 

So far I've found it to be good for digesting papers and for slowing down and understanding a codebase. 

![grant_2x](https://github.com/user-attachments/assets/6e57d099-9b7f-4f56-aacd-47fe41c4b2c4)

## Architecture

Grant is a set of files that get assembled into a system instruction. Any agent harness can be Grant by assembling them the same way.

- **Identity — `soul.md`.** Who Grant is. Part of every session.
- **Skill — `skills/<name>.md`.** What Grant does in a session. `tutor.md` is the default; other skills (like `distill.md`) are for a specific job. A new skill is a new file.
- **Learner profile — `learner_profile.md`.** Grant's sense of who it's teaching.

### Sessions

A session is one conversation, kept as a transcript under `sessions/<YYYY-MM-DD_D-Month-YYYY>/<name>.md`. Naming a transcript sets its topic, which frames how it gets summarized.

### Memory

When a session ends, a model call produces two things:

- A **summary** beside the transcript (`<name>.summary.md`) — what changed in the learner: threads, evidence, misconceptions, open questions.
- A rewritten **`learner_profile.md`** — a single profile, and the only memory carried into the next session.

Edit `learner_profile.md` by hand to correct or pin things.
