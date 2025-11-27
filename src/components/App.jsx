import React, { useRef, useEffect, useState } from 'react';
import Bubble from './Bubble';

export default function App() {
    // State: list of tabs
    // Each tab: { id, messages: [], inputText: '', isStreaming: false, attachments: [] }
    const [tabs, setTabs] = useState([
      { id: 1, title: 'New Chat', messages: [], inputText: '', isStreaming: false, attachments: [] }
    ]);
    
    const [activeTabId, setActiveTabId] = useState(1);

    const messageListRef = useRef(null);
    const textInputRef = useRef(null);
  
    // register global IPC listener once
    useEffect(() => {
      const onEvent = (payload) => {
        const { type, tabId } = payload;

        setTabs(currentTabs => {
          return currentTabs.map(tab => {
            if (tab.id !== tabId) return tab;

            if (type === 'end') {
              return { ...tab, isStreaming: false };
            }
            if (type === 'error') {
              // Show error as a system message or log
              console.error('Chat error:', payload.error);
              const errorMsg = { role: 'model', content: `Error: ${payload.error.message || payload.error}` };
              return { ...tab, messages: [...tab.messages, errorMsg], isStreaming: false };
            }
            if (type === 'chunk') {
              const chunk = payload.chunk;
              let chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!chunkText) return tab;

              const msgs = tab.messages;
              // if last message is assistant, append. else add new assistant bubble
              if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                const newMsgs = [...msgs];
                newMsgs[newMsgs.length - 1].content += chunkText;
                return { ...tab, messages: newMsgs };
              } else {
                return { ...tab, messages: [...msgs, { role: 'assistant', content: chunkText }] };
              }
            }
            return tab;
          });
        });
      };
  
      // register callback 
      window.electron.onChatStream(onEvent);
    }, []); 

    // get current active tab object
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    // auto-scroll when active tab's messages change
    useEffect(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight; 
      }
    }, [activeTab.messages, activeTabId]);

    // Focus input on tab switch
    useEffect(() => {
      textInputRef.current?.focus();
    }, [activeTabId]);

    const handleSend = () => {
      const text = activeTab.inputText.trim();
      const atts = activeTab.attachments || [];
      
      if (!text && atts.length === 0) return;

      // Optimistically update UI
      const newMsg = { role: 'user', content: text, attachments: atts };
      const updatedMsgs = [...activeTab.messages, newMsg];
      
      setTabs(current => current.map(t => 
        t.id === activeTabId 
          ? { 
              ...t, 
              messages: updatedMsgs, 
              inputText: '', 
              attachments: [], // clear attachments after sending
              isStreaming: true, 
              title: t.messages.length === 0 ? (text.slice(0, 20) || 'File Attachment') : t.title 
            }
          : t
      ));

      // Send strict objects to IPC (strip any DOM/File specific non-serializable stuff if needed)
      // But File.path is a string, so it should be fine.
      // However, let's make sure we are sending a clean object
      const serializableMsgs = updatedMsgs.map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments ? m.attachments.map(a => ({ name: a.name, path: a.path, type: a.type })) : []
      }));

      window.electron.startChat(
        serializableMsgs,
        activeTabId
      );
    };

    const createTab = () => {
      const newId = Date.now();
      setTabs(prev => [
        ...prev, 
        { id: newId, title: 'New Chat', messages: [], inputText: '', isStreaming: false, attachments: [] }
      ]);
      setActiveTabId(newId);
    };

    const closeTab = (e, idToClose) => {
      e.stopPropagation(); // prevent clicking the tab itself
      if (tabs.length === 1) {
        // Don't close the last tab, just reset it
        setTabs([{ id: Date.now(), title: 'New Chat', messages: [], inputText: '', isStreaming: false, attachments: [] }]);
        return;
      }
      
      const newTabs = tabs.filter(t => t.id !== idToClose);
      setTabs(newTabs);
      
      // If we closed the active tab, switch to the last one
      if (activeTabId === idToClose) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
    };

    const updateInput = (val) => {
      setTabs(current => current.map(t => 
        t.id === activeTabId ? { ...t, inputText: val } : t
      ));
    };

    const handleDrop = (e) => {
      e.preventDefault();
      // Use the Electron webUtils API if available, or standard File.path
      const files = Array.from(e.dataTransfer.files).map(f => {
        // In newer Electron versions with contextIsolation, f.path might be empty unless we use webUtils
        // But since we have a simple setup, let's check if we can get the path.
        // If f.path is missing, we need to expose webUtils.getPathForFile via preload.
        return {
          name: f.name,
          path: window.electron.getFilePath ? window.electron.getFilePath(f) : f.path,
          type: f.type
        };
      });
      
      if (files.length === 0) return;

      setTabs(current => current.map(t => 
        t.id === activeTabId 
          ? { ...t, attachments: [...(t.attachments || []), ...files] }
          : t
      ));
    };

    const removeAttachment = (index) => {
      setTabs(current => current.map(t => {
        if (t.id !== activeTabId) return t;
        const newAtts = [...t.attachments];
        newAtts.splice(index, 1);
        return { ...t, attachments: newAtts };
      }));
    };

    return (
        <div className="app-container">
            {/* Top Tab Bar */}
            <div className="tab-bar">
              {tabs.map(tab => (
                <div 
                  key={tab.id}
                  className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span className="tab-title">{tab.title}</span>
                  <button 
                    className="tab-close"
                    onClick={(e) => closeTab(e, tab.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="new-tab-btn" onClick={createTab}>+</button>
            </div>

            <main 
              className="chat-container"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
                <div className="message-list" ref={messageListRef}>
                    <div className="message-list-inner">
                    {activeTab.messages.length === 0 ? (
                        <div className="empty-state">
                            ready to explore ? 
                        </div>
                    ) : (
                        activeTab.messages.map((msg, idx) => (
                        <Bubble 
                            key={idx} 
                            role={msg.role} 
                            content={msg.content} 
                            attachments={msg.attachments}
                        />
                        ))
                    )}
                    </div>
                </div>
                
                <div className="input-area-wrapper">
                  {/* Attachments Preview */}
                  {activeTab.attachments && activeTab.attachments.length > 0 && (
                    <div className="attachments-list">
                      {activeTab.attachments.map((file, idx) => (
                        <div key={idx} className="attachment-pill">
                          <span className="attachment-name">{file.name}</span>
                          <button className="attachment-remove" onClick={() => removeAttachment(idx)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="input-area">
                      <textarea 
                          className="chat-input"
                          ref={textInputRef}
                          value={activeTab.inputText}
                          onChange={e => updateInput(e.target.value)}
                          placeholder="Message..."
                          rows={1}
                          onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey && !activeTab.isStreaming) {
                              e.preventDefault();
                              handleSend();
                              }
                          }}
                      />
                      <button
                          className="send-button"
                          onClick={handleSend}
                          disabled={activeTab.isStreaming || (!activeTab.inputText.trim() && (!activeTab.attachments || activeTab.attachments.length === 0))}
                      >
                          {activeTab.isStreaming ? '...' : 'Send'}
                      </button>
                  </div>
                </div>
            </main>
        </div>
    );
}
