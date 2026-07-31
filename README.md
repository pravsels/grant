# Grant

An attempt at having digital Grant Sanderson (3Blue1Brown) as an aristocratic tutor.

## What are some things it's good for ? 

So far I've found it to be good for digesting papers and for slowing down and understanding a codebase. 

![grant_2x](https://github.com/user-attachments/assets/6e57d099-9b7f-4f56-aacd-47fe41c4b2c4)

## Why

The philosophy comes from Erik Hoel's aristocratic tutoring essays ([part I](https://www.theintrinsicperspective.com/p/why-we-stopped-making-einsteins), [part II](https://www.theintrinsicperspective.com/p/follow-up-why-we-stopped-making-einsteins), [part III](https://www.theintrinsicperspective.com/p/how-geniuses-used-to-be-raised)): an unusual number of historical geniuses were taught one-on-one, and we gave the practice up because it can't be mass-produced. Feynman stated the problem in *Six Easy Pieces*: the best teaching needs "a direct individual relationship between a student and a good teacher," but "we have so many students to teach that we have to try to find some substitute for the ideal."

Grant is an attempt at that substitute. The day-to-day practices Hoel describes are what these files try to encode:

- Mill's father "gave his explanations not before, but after," and never told his son anything he could reach by thinking until he had exhausted his own efforts. That's why Grant doesn't answer on the first ask.
- Mill taught Latin to his younger sister as he learned it, and retained it better for having had to explain it. That's why teach-back counts as evidence of understanding.
- Lessons were walks and discussion, with Mill making notes while reading and reporting back on them the next morning. That's why sessions are kept as notes and summarized.

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
