
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
    },
    // handler for gemini tts 
    generateTTSFile: (text) => {
        return ipcRenderer.invoke('gemini-tts', text)
    },
    deleteTTSFile: (filePath) => ipcRenderer.invoke('delete-tts-file', filePath),

    fetchArticle: (maybeUrl) => {
        let url;
        try {
          // this will throw if the string isn’t a valid URL
          url = new URL(maybeUrl.trim());
        } catch (err) {
          return Promise.reject(new Error(`"${maybeUrl}" is not a valid URL`));
        }
        // only allow http(s)
        if (!['http:', 'https:'].includes(url.protocol)) {
          return Promise.reject(new Error(`Unsupported protocol: ${url.protocol}`));
        }
        return ipcRenderer.invoke('fetch-article', url.toString());
      }
});

