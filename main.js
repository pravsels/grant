
// main.js 
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function createWindow() {
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });
    // load html 
    window.loadFile(path.join(__dirname, 'index.html'));

    window.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.on('gemini-chat-start', async (event, messages) => {
    try {
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        }));
        
        const currentMessage = messages[messages.length - 1];
        
        // Create chat with history
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash-lite',
            history: history
        });
        
        const stream = await chat.sendMessageStream({
            message: currentMessage.content 
        });

        // forward chunks to renderer as they arrive 
        for await (const chunk of stream) {
            event.sender.send('gemini-chat-chunk', chunk);
        }
        
        // when the stream ends, inform the renderer 
        event.sender.send('gemini-chat-end');

    } catch (err) {
        event.sender.send('gemini-chat-error', err.message);
    }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
