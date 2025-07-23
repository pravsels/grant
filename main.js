
// main.js 
require('dotenv').config();

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const fs = require('fs');
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system_prompt.txt'), 'utf-8');

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

    const template = [
          ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),

        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },

        {
            label: 'View',
            submenu: [
                { role: 'zoomIn',  accelerator: 'CommandOrControl+=' },
                { role: 'zoomOut', accelerator: 'CommandOrControl+-' },
                { role: 'resetZoom', accelerator: 'CommandOrControl+0' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

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
            config: {
                systemInstruction: systemPrompt,
            },
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
