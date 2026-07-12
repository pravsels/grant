# Grant

An app where the AI never does anything for you. 

It helps you learn and understand things deeply. 

## What are some things it's good for ? 

So far I've found it to be good for digesting papers and for slowing down and understanding a codebase. 

![grant_2x](https://github.com/user-attachments/assets/6e57d099-9b7f-4f56-aacd-47fe41c4b2c4)

## Architecture

Grant is a set of files that get assembled into a system instruction. This repo ships one harness for it, but any agent harness can be Grant by assembling the same files the same way.

- **Identity — `soul.md`.** Who Grant is. Always loaded.
- **Skill — `skills/<name>.md`.** What Grant does in a session. Exactly one skill is active at a time; they don't combine. The default is `tutor.md`. A message that starts with `/<name>` (e.g. `/distill`) switches the session to that skill for the rest of its life; an unrecognized name stays on `tutor`. Adding a skill means adding a file.
- **Learner profile — `learner.md`.** Appended to the instruction under the `tutor` skill so Grant knows who it's teaching. Other skills omit it.

### Sessions

Each conversation is a session, saved to `sessions/<YYYY-MM-DD_D-Month-YYYY>/<timestamp>.md` once it passes 100 words. Renaming a transcript sets its topic — that name becomes the framing when it's summarized.

### Memory

When a session ends (tab close, app quit, or as a safety net on next launch), one `gemini-3.1-pro-preview` call produces:

- A **summary** beside the transcript (`<name>.summary.md`) — what changed in the learner: threads, evidence, misconceptions, open questions.
- A rewritten **`learner.md`** — a single bounded profile, and the only memory carried into the next session.

Edit `learner.md` by hand to correct or pin things; watch the terminal for `[summary] ...` lines.
