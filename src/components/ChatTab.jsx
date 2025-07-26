
import React, { useRef, useEffect } from 'react';
import Bubble from './Bubble';

export default function ChatTab(
  {
    messages, setMessages,
    inputText, setInputText,
    isStreaming, setIsStreaming
  }) {
  const messageListRef = useRef(null);
  const textInputRef = useRef(null);

  // register onChunk callback once 
  useEffect(() => {
    const onChunk = (chunk) => {
      if (chunk === null) {
        // end of stream
        setIsStreaming(false);
        return;
      }

      if (chunk instanceof Error) {
        // stop streaming and don't render the Error object 
        console.error('Chat error:', chunk);
        setIsStreaming(false);
        return;
      }

      let chunkText = '';
      try {
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content) {
          const parts = chunk.candidates[0].content.parts;
          if (parts && parts[0] && parts[0].text) {
            chunkText = parts[0].text;
          }
        }
      } catch (error) {
        console.error('Error parsing chunk:', error);
        return;
      }

      // Only proceed if we have actual text content
      if (!chunkText) return;
      
      setMessages(prevMsgs => {
        // chunk just coming in for the first time 
        if (prevMsgs[prevMsgs.length - 1]?.role !== 'assistant') {
          return [...prevMsgs, { role: 'assistant', content: chunkText }];
        }

        const copy = [...prevMsgs];
        copy[copy.length - 1].content += chunkText;
        return copy; 
      });

    };

    // register callback 
    window.electron.onChatStream(onChunk);

    textInputRef.current?.focus();

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
    // focus back on textbox 
    textInputRef.current?.focus();
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
          flex: 1,
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0
         }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Message history pane */}
      <div 
        ref={messageListRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '1rem',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center' 
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '120ch', 
            display: 'flex',
            flex: 1,
            flexDirection: 'column'
          }}
        >
          {messages.length === 0 ? (
            <div style={{
                          color: '#999', 
                          display: 'flex',
                          alignItems: 'center',     // centers vertically 
                          justifyContent: 'center', // centers horizontally 
                          height: '100%',
                          flex: 1 
                        }}
            >
              nothing to show
            </div>
          ) : (
            messages.map((msg, idx) => (
              <Bubble key={idx} role={msg.role} content={msg.content} />
            ))
          )}
        </div>
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
          ref={textInputRef}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
              e.preventDefault();
              handleSend();
            }
          }}
          style={{
            flex: 1,
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
