import React, { useState } from 'react';
import ReaderTab from './ReaderTab';
import ChatTab from './ChatTab';

export default function App() {
    const [mode, setMode] = useState('reader');
    const [messages, setMessages]     = useState([]);
    const [inputText, setInputText]   = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    return (
        <div 
            className="app-container"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden'
            }}
        >
            
            <nav className="tab-nav">
                <div className="tab-list">
                    <button
                        className={`tab-button ${mode==='reader' ? 'active':''}`}
                        onClick={() => setMode('reader')}
                    >
                        Reader
                    </button>
                    <button
                        className={`tab-button ${mode==='chat' ? 'active':''}`}
                        onClick={() => setMode('chat')}
                    >
                        Chat
                    </button>
                </div>
            </nav>

            <main 
                className="tab-content"
                style={{ 
                        flexGrow: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
            >
                {
                    mode === 'reader' ? <ReaderTab /> : 
                                        <ChatTab messages={messages}
                                                 setMessages={setMessages}
                                                 inputText={inputText}
                                                 setInputText={setInputText}
                                                 isStreaming={isStreaming}
                                                 setIsStreaming={setIsStreaming} 
                                        />
                }
            </main>

        </div>
    );
}
