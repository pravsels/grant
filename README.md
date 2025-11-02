# Grant

An app where the AI never does anything for you. 

It helps you learn and understand things deeply. 

## What are some things it's good for ? 

So far I've found it to be good for digesting papers and for slowing down and understanding a codebase. 

![grant_3x](https://github.com/user-attachments/assets/614d0fd6-40ba-4d83-92a1-ca93e79a357c)


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

## Build to Install as Desktop Application

To create a desktop application that can be installed:
```
npm run dist
```
This will create an installer/package in the `dist/` folder for your platform (`.dmg` on Mac, `.exe` on Windows, etc.).
