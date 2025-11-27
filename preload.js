const { contextBridge, ipcRenderer } = require('electron');

const callbacks = [];

// forward chunks from main -> all registered callbacks 
ipcRenderer.on('gemini-chat-chunk', (_e, { chunk, tabId }) => {
    callbacks.forEach(cb => cb({ type: 'chunk', chunk, tabId }));
});

// forward end of stream signal -> all registered callbacks 
ipcRenderer.on('gemini-chat-end', (_e, { tabId }) => {
    callbacks.forEach(cb => cb({ type: 'end', tabId }));
});

// forward chat error signal -> all registered callbacks 
ipcRenderer.on('gemini-chat-error', (_e, { error, tabId }) => {
    callbacks.forEach(cb => cb({ type: 'error', error: new Error(error), tabId }));
});

// expose to main world 
contextBridge.exposeInMainWorld('electron', {
    // start a chat stream 
    startChat: (messages, tabId) => ipcRenderer.send('gemini-chat-start', { messages, tabId }),
    // register a handler for incoming chunks / end / error 
    onChatStream: (cb) => {
        callbacks.push(cb);
    }
});
