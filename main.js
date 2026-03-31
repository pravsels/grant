// main.js 
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const soulPrompt = fs.readFileSync(path.join(__dirname, 'soul.md'), 'utf-8');
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system_prompt.txt'), 'utf-8');
const fullSystemInstruction = `${soulPrompt}\n\n${systemPrompt}`;
const sessionFilesByTab = new Map();
const MIN_TRANSCRIPT_WORDS = 100;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function padNumber(value, length = 2) {
  return String(value).padStart(length, '0');
}

function getSessionsRoot() {
  return path.join(__dirname, 'sessions');
}

function formatDayFolder(date) {
  return `${date.getDate()}${monthNames[date.getMonth()]}${date.getFullYear()}`;
}

function formatTimestampFile(date) {
  return `${padNumber(date.getHours())}-${padNumber(date.getMinutes())}-${padNumber(date.getSeconds())}-${padNumber(date.getMilliseconds(), 3)}.txt`;
}

function getOrCreateSessionFile(tabId) {
  const existingPath = sessionFilesByTab.get(tabId);
  if (existingPath) return existingPath;

  const now = new Date();
  const dayFolder = path.join(getSessionsRoot(), formatDayFolder(now));
  fs.mkdirSync(dayFolder, { recursive: true });

  let filePath = path.join(dayFolder, formatTimestampFile(now));
  let counter = 1;

  while (fs.existsSync(filePath)) {
    filePath = path.join(dayFolder, `${formatTimestampFile(now).replace('.txt', '')}-${counter}.txt`);
    counter += 1;
  }

  sessionFilesByTab.set(tabId, filePath);
  return filePath;
}

function formatAttachments(attachments = []) {
  if (!attachments.length) return [];

  return [
    'Attachments:',
    ...attachments.map(file => {
      if (file.path) {
        return `- ${file.name} (${file.path})`;
      }
      return `- ${file.name}`;
    }),
    ''
  ];
}

function countWords(text = '') {
  const trimmed = String(text).trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatTranscript(messages, assistantContent = '', errorMessage = '') {
  const transcriptMessages = [...messages];

  if (assistantContent) {
    transcriptMessages.push({ role: 'assistant', content: assistantContent });
  }

  if (errorMessage) {
    transcriptMessages.push({ role: 'system', content: `Error: ${errorMessage}` });
  }

  const lines = transcriptMessages.flatMap((message, index) => {
    const speaker = message.role === 'user'
      ? 'Learner'
      : message.role === 'assistant'
        ? 'Grant'
        : 'System';

    const content = message.content ? String(message.content).trimEnd() : '';

    return [
      `${speaker}`,
      '',
      ...formatAttachments(message.attachments),
      ...(content ? [content] : ['[No text content]']),
      '',
      ...(index < transcriptMessages.length - 1 ? ['----------------------------------------', ''] : [])
    ];
  });

  return `${lines.join('\n').trimEnd()}\n`;
}

function getTranscriptWordCount(messages, assistantContent = '') {
  const transcriptMessages = [...messages];

  if (assistantContent) {
    transcriptMessages.push({ role: 'assistant', content: assistantContent });
  }

  return transcriptMessages.reduce((total, message) => {
    if (message.role !== 'user' && message.role !== 'assistant') {
      return total;
    }

    return total + countWords(message.content);
  }, 0);
}

function saveSessionTranscript(tabId, messages, assistantContent = '', errorMessage = '') {
  const existingPath = sessionFilesByTab.get(tabId);
  const wordCount = getTranscriptWordCount(messages, assistantContent);

  if (!existingPath && wordCount < MIN_TRANSCRIPT_WORDS) {
    return;
  }

  const filePath = getOrCreateSessionFile(tabId);
  const transcript = formatTranscript(messages, assistantContent, errorMessage);
  fs.writeFileSync(filePath, transcript, 'utf-8');
}

function getChunkText(chunk) {
  const parts = chunk?.candidates?.[0]?.content?.parts || [];
  return parts
    .map(part => part?.text || '')
    .join('');
}

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

// Helper to get mime type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.heic': return 'image/heic';
    case '.heif': return 'image/heif';
    case '.zip': return 'application/zip';
    case '.pdf': return 'application/pdf';
    case '.json': return 'application/json';
    case '.csv': return 'text/csv';
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.png': return 'image/png';
    case '.jpg': 
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'text/plain'; 
  }
}

// Helper to read file as base64
function getFilePart(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    return {
      inlineData: {
        data: fileData.toString('base64'),
        mimeType
      }
    };
  } catch (e) {
    console.error(`Failed to read file ${filePath}:`, e);
    return null;
  }
}

ipcMain.on('gemini-chat-start', async (event, { messages, tabId }) => {
    let assistantResponse = '';
    try {
        // Map messages to history with attachments
        const history = [];
        
        // Process all previous messages (excluding the last one which is "current")
        const previousMessages = messages.slice(0, -1);
        
        for (const msg of previousMessages) {
            const parts = [];
            if (msg.content) {
                parts.push({ text: msg.content });
            }
            if (msg.attachments && Array.isArray(msg.attachments)) {
                for (const att of msg.attachments) {
                    const filePart = getFilePart(att.path);
                    if (filePart) parts.push(filePart);
                }
            }
            
            // Important: A message must have at least one part
            if (parts.length > 0) {
                history.push({
                    role: msg.role === 'assistant' ? 'model' : msg.role,
                    parts
                });
            }
        }
        
        const currentMessageMsg = messages[messages.length - 1];
        const currentParts = [];
        if (currentMessageMsg.content) {
            currentParts.push({ text: currentMessageMsg.content });
        }
        if (currentMessageMsg.attachments && Array.isArray(currentMessageMsg.attachments)) {
            for (const att of currentMessageMsg.attachments) {
                 const filePart = getFilePart(att.path);
                 if (filePart) currentParts.push(filePart);
            }
        }
        
        if (currentParts.length === 0) {
             throw new Error("Message must have content or attachments");
        }

        // Persist the conversation from the first user turn onward.
        saveSessionTranscript(tabId, messages);

        // Create chat with history
        const chat = ai.chats.create({
            model: 'gemini-3.1-pro-preview',
            config: {
                systemInstruction: fullSystemInstruction,
            },
            history: history
        });
        
        // Send current message
        // Note: sendMessageStream expects the content directly (string or Part[])
        const stream = await chat.sendMessageStream({
            message: currentParts
        });

        // forward chunks to renderer as they arrive 
        for await (const chunk of stream) {
            const chunkText = getChunkText(chunk);
            if (chunkText) {
                assistantResponse += chunkText;
                saveSessionTranscript(tabId, messages, assistantResponse);
            }
            event.sender.send('gemini-chat-chunk', { chunk, tabId });
        }

        saveSessionTranscript(tabId, messages, assistantResponse);
        
        // when the stream ends, inform the renderer 
        event.sender.send('gemini-chat-end', { tabId });

    } catch (err) {
        if (messages && tabId) {
            saveSessionTranscript(tabId, messages, assistantResponse, err.message);
        }
        console.error(err);
        event.sender.send('gemini-chat-error', { error: err.message, tabId });
    }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
