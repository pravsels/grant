
const { contextBridge, ipcRenderer } = require('electron');

const callbacks = [];

// forward chunks from main -> all registered callbacks 
ipcRenderer.on('gemini-chat-chunk', (_e, chunk) => {
    callbacks.forEach(cb => cb(chunk));
});

// forward end of stream signal -> all registered callbacks 
ipcRenderer.on('gemini-chat-end', () => {
    callbacks.forEach(cb => cb(null));
});

// forward chat error signal -> all registered callbacks 
ipcRenderer.on('gemini-chat-error', (_e, message) => {
    callbacks.forEach(cb => cb(new Error(message)));
});

// expose to main world 
contextBridge.exposeInMainWorld('electron', {
    // start a chat stream 
    startChat: (messages) => ipcRenderer.send('gemini-chat-start', messages),
    // register a handler for incoming chunks / end / error 
    onChatStream: (cb) => {
        callbacks.push(cb);
    }
});

