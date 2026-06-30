// main.js 
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { formatDayFolder, padNumber } = require('./sessionPaths');

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
const learnerProfilePath = path.join(__dirname, 'learner.md');
const sessionFilesByTab = new Map();
const systemInstructionByTab = new Map();
const MIN_TRANSCRIPT_WORDS = 100;
const SUMMARIZATION_MODEL = 'gemini-3.1-pro-preview';

function buildSystemInstruction() {
  let learnerProfile = '';
  try {
    learnerProfile = fs.readFileSync(learnerProfilePath, 'utf-8').trim();
  } catch (_) { /* file may not exist yet */ }

  const profileBlock = learnerProfile
    ? `\n\n## What you know about this learner\n\n${learnerProfile}`
    : '';

  return `${soulPrompt}\n\n${systemPrompt}${profileBlock}`;
}

// One snapshot per tab. learner.md is read on the first message of a session
// and held fixed for the rest of that session. soul.md and system_prompt.txt
// are already module-level constants; they're effectively snapshotted at app start.
function getSystemInstructionFor(tabId) {
  const cached = systemInstructionByTab.get(tabId);
  if (cached) return cached;
  const fresh = buildSystemInstruction();
  systemInstructionByTab.set(tabId, fresh);
  return fresh;
}

function getSessionsRoot() {
  return path.join(__dirname, 'sessions');
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

function topicHintFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function summaryPathFor(transcriptPath) {
  return transcriptPath.replace(/\.txt$/, '.summary.md');
}

function buildSummarizationPrompt({ transcript, learnerProfile, topicHint }) {
  const profileBlock = learnerProfile && learnerProfile.trim()
    ? learnerProfile.trim()
    : '(empty — this is the first session)';

  return `You just finished a tutoring session as Grant. Produce two outputs.

CONTEXT
The learner named this session: "${topicHint}"
Treat this as the learner's own framing — it may or may not match what actually happened.

CURRENT learner.md:
${profileBlock}

TRANSCRIPT:
${transcript}

OUTPUT 1 — summary_md (markdown)

Do NOT produce a list of topics covered. Topic lists are forbidden.

For each meaningful thread in the session, write:
- The question, in the learner's own framing.
- Where they started (prior model / misconception).
- What unlocked it (the framing, example, or picture that worked).
- Where they ended (what they can now predict, sketch, or teach back).
- Evidence level: strong | wobbly | unverified
    strong     — predicted a new case, taught it back, or transferred it
    wobbly     — restated it, but not tested on transfer
    unverified — they nodded; no real signal (be honest)

Then add sections:
- Surfaced misconceptions
- Open threads (questions raised but not closed)
- Style signals from this session

OUTPUT 2 — learner_md (markdown, will overwrite the file)

Rewrite learner.md integrating what is genuinely new. Keep under ~1500 words.
Maintain these sections:
- Current focus
- What you've internalized  (only items with strong evidence)
- Open threads / things to revisit
- Misconceptions seen
- Style notes

Prune what is stale or superseded. Do not pad. Be specific, not generic.

Return as JSON: { "summary_md": "...", "learner_md": "..." }`;
}

function relPath(p) {
  return path.relative(__dirname, p);
}

async function summarizeSession(transcriptPath) {
  const transcript = fs.readFileSync(transcriptPath, 'utf-8');
  const rel = relPath(transcriptPath);

  if (countWords(transcript) < MIN_TRANSCRIPT_WORDS) {
    console.log(`[summary] skip: ${rel} (under ${MIN_TRANSCRIPT_WORDS} words)`);
    return;
  }

  let learnerProfile = '';
  try { learnerProfile = fs.readFileSync(learnerProfilePath, 'utf-8'); } catch (_) { /* may not exist */ }

  const prompt = buildSummarizationPrompt({
    transcript,
    learnerProfile,
    topicHint: topicHintFromPath(transcriptPath),
  });

  console.log(`[summary] start: ${rel}`);
  const t0 = Date.now();

  const response = await ai.models.generateContent({
    model: SUMMARIZATION_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          summary_md: { type: 'string' },
          learner_md: { type: 'string' },
        },
        required: ['summary_md', 'learner_md'],
      },
    },
  });

  const { summary_md, learner_md } = JSON.parse(response.text);
  fs.writeFileSync(summaryPathFor(transcriptPath), summary_md, 'utf-8');
  fs.writeFileSync(learnerProfilePath, learner_md, 'utf-8');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[summary] done:  ${rel} (${elapsed}s, learner.md updated)`);
}

async function summarizeIfNeeded(transcriptPath) {
  if (fs.existsSync(summaryPathFor(transcriptPath))) return;
  try {
    await summarizeSession(transcriptPath);
  } catch (err) {
    console.error(`[summary] FAIL: ${relPath(transcriptPath)} —`, err.message || err);
  }
}

async function sweepUnsummarized() {
  const root = getSessionsRoot();
  if (!fs.existsSync(root)) return;

  const dayDirs = fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(root, d.name));

  // Collect all transcripts across folders and sort chronologically by birth time
  // so learner.md evolves in the order the sessions actually happened.
  const all = [];
  for (const dir of dayDirs) {
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.txt'))) {
      const full = path.join(dir, f);
      all.push({ full, birth: fs.statSync(full).birthtimeMs });
    }
  }
  all.sort((a, b) => a.birth - b.birth);

  const pending = all.filter(t => !fs.existsSync(summaryPathFor(t.full)));
  if (pending.length === 0) {
    console.log(`[summary] sweep: nothing to do (${all.length} session(s) all summarized)`);
    return;
  }
  console.log(`[summary] sweep: ${pending.length} of ${all.length} session(s) need summarizing`);

  for (const { full } of pending) {
    // Skip files currently being written to by a live session.
    const openPaths = new Set(sessionFilesByTab.values());
    if (openPaths.has(full)) {
      console.log(`[summary] sweep: skipping live session ${relPath(full)}`);
      continue;
    }
    await summarizeIfNeeded(full);
  }

  console.log(`[summary] sweep: complete`);
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
                systemInstruction: getSystemInstructionFor(tabId),
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

ipcMain.on('tab-closed', (_event, { tabId }) => {
    const filePath = sessionFilesByTab.get(tabId);
    sessionFilesByTab.delete(tabId);
    systemInstructionByTab.delete(tabId);
    if (filePath && fs.existsSync(filePath)) {
        console.log(`[summary] tab-close: ${relPath(filePath)}`);
        summarizeIfNeeded(filePath);
    }
});

app.on('before-quit', () => {
    const open = [...sessionFilesByTab.values()].filter(p => fs.existsSync(p));
    if (open.length === 0) return;
    console.log(`[summary] quit: summarizing ${open.length} open session(s)`);
    for (const filePath of open) {
        summarizeIfNeeded(filePath);
    }
});

app.whenReady().then(() => {
    createWindow();
    sweepUnsummarized().catch(err => console.error('Sweep failed:', err));
});
app.on('window-all-closed', () => app.quit());
