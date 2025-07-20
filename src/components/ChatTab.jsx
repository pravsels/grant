import React, { useState, useRef, useEffect } from 'react';

export default function ChatTab() {
  const [messages, setMessages] = useState([]);   // { role: 'user'|'assistant', content: string }
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messageListRef = useRef(null); 

  // register onChunk callback once 
  useEffect(() => {
    const onChunk = (chunk) => {
      if (chunk === null) {
        // end of stream
        setIsStreaming(false);
        return;
      }

      if (chunk instanceof Error) {
        // error came through—log and stop streaming, but don't render the Error object
        console.error('Chat error:', chunk);
        setIsStreaming(false);
        return;
      }
      
      setMessages(prevMsgs => {
        // chunk just coming in for the first time 
        if (prevMsgs[prevMsgs.length - 1]?.role !== 'assistant') {
          return [...prevMsgs, { role: 'assistant', content: chunk }];
        }

        const copy = [...prevMsgs];
        copy[copy.length - 1].content += chunk;
        return copy; 
      });

    };

    // register callback 
    window.electron.onChatStream(onChunk);

  }, []); // ← empty deps → run once at mount

  // auto-scroll to bottom when messages change 
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight; 
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    // append user message 
    setMessages(prevMsgs => [...prevMsgs, { role: 'user', content: text }]);
    setInputText('');
    
    // setTimeout(() => setIsStreaming(false), 500);
    window.electron.startChat([
      ...messages,
      { role: 'user', content: text }
    ]);
    // set stream to get ready 
    setIsStreaming(true);
  };

  const handleDrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      console.log('File dropped : ', file.name);
      // TODO: logic for sending text file, image, PDF 
    }
  };

  return (
    <div 
      style={{ 
          flexGrow: 1,
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
         }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Message history pane */}
      <div 
        ref={messageListRef}
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '1rem',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.length === 0 ? (
          <div style={{
                        color: '#999', 
                        display: 'flex',
                        alignItems: 'center',     // centers vertically 
                        justifyContent: 'center', // centers horizontally 
                        height: '100%'
                      }}
          >
            nothing to show
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#dcf8c6' : '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                margin: '0.25rem 0',
                maxWidth: '70%',
                userSelect: 'none'
              }}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>
      
      {/* Input area */}
      <div
        style={{
          display: 'flex',
          padding: '0.75rem',
          borderTop: '1px solid #ddd',
          gap: '0.5rem',
          background: '#fff'
        }}
      >
        <textarea 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
          style={{
            flexGrow: 1,
            resize: 'none',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !inputText.trim()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: '#e0e0e0',
            color: '#333',
            cursor: isStreaming || !inputText ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>

    </div>
  );
}
