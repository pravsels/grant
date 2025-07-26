
import React, { useState } from 'react';
import ReaderTab from './ReaderTab';
import ChatTab from './ChatTab';

export default function App() {
    const [mode, setMode] = useState('reader');

    // chat tab state variables 
    const [messages, setMessages]     = useState([]);
    const [inputText, setInputText]   = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // reader tab state variables 
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [sentences, setSentences] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div 
            className="app-container"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                minHeight: 0
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
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden',
                        minHeight: 0
                      }}
            >
                {
                    mode === 'reader' ? <ReaderTab url={url}
                                                   setUrl={setUrl}
                                                   loading={loading}
                                                   setLoading={setLoading}
                                                   sentences={sentences}
                                                   setSentences={setSentences}
                                                   currentIndex={currentIndex}
                                                   setCurrentIndex={setCurrentIndex}
                                                   isPlaying={isPlaying}
                                                   setIsPlaying={setIsPlaying}
                                        /> : 
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
