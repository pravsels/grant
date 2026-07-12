# Installing Grant

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
