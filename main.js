
// main.js 
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const os = require('os');
const tmp = require('path').join;
const wav = require('wav');

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

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

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
        // window.webContents.openDevTools({ mode: 'detach' });
    }
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

ipcMain.handle('gemini-tts', async(_evt, text) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [
            { 
                parts: [
                    { text: text }
                ] 
            }
        ],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: 'Kore'
                    }
                }
            }
        }
    });

    const { candidates } = response;
    if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error("TTS returned no candidates");
    }

    const { content } = candidates[0];
    if (!content || !Array.isArray(content.parts) || content.parts.length === 0) {
        throw new Error("TTS candidate has no parts");
    }

    // base64 encoded data 
    const base64_chunk =  content.parts[0].inlineData.data;
    const pcm_chunk = Buffer.from(base64_chunk, 'base64');

    const tmpPath = tmp(os.tmpdir(), `tts-${Date.now()}.wav`);
    await new Promise((res, rej) => {
        const writer = new wav.FileWriter(tmpPath, {
        channels: 1,
        sampleRate: 24000,
        bitDepth: 16
        });
        writer.on('finish', res);
        writer.on('error', rej);
        writer.write(pcm_chunk);
        writer.end();
    });

    return tmpPath;
});

ipcMain.handle('fetch-article', async (_evt, url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`); 
    const html = await response.text(); 

    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    return article?.textContent || ''; 
}); 

ipcMain.handle('delete-tts-file', (_evt, filePath) => {
    fs.unlink(filePath, err => {
      if (err) console.error('Failed to delete TTS file:', err);
    });
  });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
