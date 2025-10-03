
import React, { useRef, useEffect, useState } from 'react';
import Bubble from './Bubble';

export default function ChatTab(
  {
    messages, setMessages,
    inputText, setInputText,
    isStreaming, setIsStreaming
  }) {
  const messageListRef = useRef(null);
  const textInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]); 

  // function that loads an image asynchronously and gives it a unique id, name and url 
  const fileToDataUrl = (file) => (
    new Promise((resolve, reject) => {
      const r = new FileReader();

      r.onerror = () => reject(r.error);  // if reading fails, reject the promise 
      r.onload = () =>                    // when reading finishes 
        resolve({
          id: crypto.randomUUID(),        // unique id for preview 
          name: file.name,                // original filename 
          mime: file.type,                // e.g. "image/png"
          dataUrl: r.result               // "data:image/png;base64,AAAA..."
        }); 

        r.readAsDataURL(file);
    })
  );

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
    if (!text && attachments.length === 0) return;

    const parts = attachments.length ? [
      ...(text ? [{ text }] : []),
      ...attachments.map(a => ({
        inlineData: {
          mimeType: a.mime || 'image/png',
          data: String(a.dataUrl).split(',')[1],
        }
      }))
    ] : (text ? [{ text }] : []);
    
    // Store the user message with parts
    const userMessage = { 
      role: 'user', 
      content: text,
      ...(parts.length > 0 && { parts })  // Only add parts if they exist
    };
    
    setMessages(prevMsgs => [...prevMsgs, userMessage]);
    setInputText('');
    
    // Send ALL messages including the new one
    window.electron.startChat([...messages, userMessage]);

    // clear attachments after send 
    setAttachments([]); 
    // set stream to get ready 
    setIsStreaming(true);
    // focus back on textbox 
    textInputRef.current?.focus();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return; 
    const items = await Promise.all(files.map(fileToDataUrl));
    setAttachments(prev => [...prev, ...items]);
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
                          flex: 1,
                          fontFamily: 'Georgia, serif',
                          fontSize: '1.125rem'
                        }}
            >
              ready to explore ? 
            </div>
          ) : (
            messages.map((msg, idx) => (
              <Bubble key={idx} role={msg.role} content={msg.content} />
            ))
          )}
        </div>
      </div>
      
      {/* attachment previews */}
      {!!attachments.length && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          padding: '8px 12px 0', alignItems: 'center'
        }}>
          {attachments.map(a => (
            <div key={a.id} style={{
              width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
              border: '1px solid #ddd', position: 'relative', background: '#fff'
            }}>
              <img src={a.dataUrl} alt={a.name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              <button
                onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                title="Remove"
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  border: 'none', background: '#000', color: '#fff',
                  cursor: 'pointer', lineHeight: '22px', fontSize: 12
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

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
          disabled={isStreaming || (!inputText.trim() && attachments.length === 0)}
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
