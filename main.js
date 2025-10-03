
// main.js 
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}
console.log('GEMINI_API_KEY length:', (process.env.GEMINI_API_KEY || '').length);

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

    if (!app.isPackaged) {
        window.webContents.openDevTools({ mode: 'detach' });
    }
}

const toParts = (m) => {
  // If message already has parts array, use it
  if (Array.isArray(m.parts) && m.parts.length) {
    return m.parts;
  }
  // If there's text content, return it as a part
  if (m.content && m.content.trim()) {
    return [{ text: m.content.trim() }];
  }
  // Otherwise return empty array
  return [];
};

ipcMain.on('gemini-chat-start', async (event, messages) => {
  try {
    console.log('=== RECEIVED MESSAGES ===');
    console.log(JSON.stringify(messages, null, 2));

    const history = messages.slice(0, -1)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: toParts(m),
      }))
      .filter(turn => turn.parts.length > 0);

    console.log('=== HISTORY ===');
    console.log(JSON.stringify(history, null, 2));

    const current = messages[messages.length - 1];
    const parts = current.parts || toParts(current);

    console.log('=== CURRENT PARTS ===');
    console.log(JSON.stringify(parts, null, 2));
    
    if (parts.length === 0) {
      event.sender.send('gemini-chat-error', 'Empty message: no text or attachments.');
      return;
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: { systemInstruction: systemPrompt },
      history,
    });

    console.log('History:', JSON.stringify(history, null, 2));
    console.log('Current parts:', JSON.stringify(parts, null, 2));

    // Just pass the parts array directly
    const stream = await chat.sendMessageStream(parts);

    for await (const chunk of stream) event.sender.send('gemini-chat-chunk', chunk);
    event.sender.send('gemini-chat-end');
  } catch (err) {
    event.sender.send('gemini-chat-error', err?.message || String(err));
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
