# Grant

An app where the AI never does anything for you. 

It helps you learn and understand things deeply. 

## What are some things it's good for ? 

So far I've found it to be good for digesting papers and for slowing down and understanding a codebase. 

![grant_2x](https://github.com/user-attachments/assets/6e57d099-9b7f-4f56-aacd-47fe41c4b2c4)

## Sessions

Each tab is a session. Transcripts are saved to `sessions/<DDMonthYYYY>/<timestamp>.txt` once the conversation passes 100 words. Rename a file to indicate its topic — the new name becomes your framing when it's summarized.

## Memory

When a tab closes (or the app quits, or on next launch as a safety net), one Gemini call produces:

- A **summary** next to the transcript (`<name>.summary.md`) capturing what changed in the learner — threads, evidence, misconceptions, open questions.
- An updated **`learner.md`** at the project root — a single bounded profile that is the only memory loaded into Grant's system prompt at the next session.

Hand-edit `learner.md` to correct or pin things. Watch the terminal for `[summary] ...` lines.

## Setting Up 

Download and install NVM:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Start a new shell (open a new tab) and install Node: 
```
nvm install 22
```

Install all the dependencies for this project: 
```
npm install 
```

Please note that currently this app only works with Gemini. You need to create a `.env` file with your API key set as `GEMINI_API_KEY="<your_key>"`.

## Launching

To build and run the app, please use: 
```
npm start
```

## Install as Desktop Application

To create a desktop application that can be installed, please run:
```
npm run dist
```
This will create an installer/package in the `dist/` folder for your platform (`.dmg` on Mac, `.exe` on Windows, etc.).
