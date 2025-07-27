
import React, { useRef, useEffect, useState } from 'react';

export default function ReaderTab(
  {
    url, setUrl,
    loading, setLoading,
    sentences, setSentences,
    currentIndex, setCurrentIndex,
    isPlaying, setIsPlaying
  }
) {
  const urlInputRef = useRef(null);
  const playingRef = useRef(isPlaying);
  const audioCache = useRef(new Map());
  const [isTtsReady, setIsTtsReady] = useState(false);

  const [showOverlay, setShowOverlay] = useState(false);
  const hideTimer = useRef(null);

  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Sync ref whenever isPlaying changes:
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const element = document.getElementById(`sentence-${currentIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    if (sentences.length === 0) return;

    // Reset readiness
    setIsTtsReady(false);
  
    // If already cached, we’re ready immediately
    if (audioCache.current.has(currentIndex)) {
      setIsTtsReady(true);
      return;
    }
  
    // Otherwise, fetch & cache
    window.electron.generateTTSFile(sentences[currentIndex])
      .then(p => {
        audioCache.current.set(currentIndex, {
          audio: new Audio(`file://${p}`),
          path: p
        });
        setIsTtsReady(true);
      })
      .catch(console.error);

  }, [currentIndex, sentences]);

 function toggleConversationMode() {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsConversationMode(cm => !cm);
 }

  // fetch article from the internet 
  async function fetchArticle() {
    if (!url.trim()) return; 
    setLoading(true);

    try {
      const text = await window.electron.fetchArticle(url);
      if (!text) throw new Error('No article content');

      const sentences = splitSentences(text);
      setSentences(sentences);
      setCurrentIndex(0);
    } catch (err) {
      console.log(err);
      alert(`Error fetching the article: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // split into sentences 
  function splitSentences(text) {
    return text
      .replace(/\r?\n+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0);
  }

  // play next sentence 
  async function playSentence(sentenceIndex) {
    if (sentenceIndex >= sentences.length) {
      setIsPlaying(false);
      return;
    }
  
    try {
      // Pull cache entry (might be undefined)
      const entry = audioCache.current.get(sentenceIndex);
      if (!entry) {
        console.warn(`No cached audio for sentence ${sentenceIndex}, bailing`);
        setIsPlaying(false);
        return;
      }

      let audio, filePath;
      ({ audio, path: filePath } = entry);
  
      // Prefetch next
      const next = sentenceIndex + 1;
      if (next < sentences.length && !audioCache.current.has(next)) {
        window.electron.generateTTSFile(sentences[next])
          .then(p => {
            const a2 = new Audio(`file://${p}`);
            audioCache.current.set(next, { audio: a2, path: p });
          })
          .catch(console.error);
      }
  
      // On end: advance and cleanup
      audio.onended = () => {
        setCurrentIndex(i => {
          const nextIdx = i + 1;
          if (playingRef.current) playSentence(nextIdx);
          return nextIdx;
        });
        // delete regardless of cache hit or miss
        window.electron.deleteTTSFile(filePath);
        audioCache.current.delete(sentenceIndex);
      };
  
      // Play!
      audio.play();
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  }

  // highlight already read and currently reading text in different ways 
  function highlightedText({ sentences, currentIndex }) {
    return (
      <div className="article-text" 
           style={{ 
                    flex: 1, 
                    maxWidth: '80ch',
                    overflowY: 'auto',   // enable scrolling
                    zIndex: 0
                  }}
      >
        {
          sentences.map((sentence, index) => {
            const classname = index  < currentIndex ? 'sentence-read' : 
                              index === currentIndex ? 'sentence-current' : 
                              'sentence-unread';

            return (
              <span 
                key={index} 
                id={`sentence-${index}`}
                className={classname}
              >
                {sentence}{' '}
              </span>
            );
          })
        }
      </div>
    );
  }

  // other handlers: onPlay, onPause, onStop 

  function onPlay() {
    if (isPlaying === false) {
      setIsPlaying(true);
      playSentence(currentIndex);
    } else {
      speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }

  function handleMouseEnter() {
    setShowOverlay(true);

    // storing and clearing timeout by id so we're not setting of too many
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowOverlay(false), 3000);
  }

  return (
    <div className="reader-tab" 
         style={{ flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: 0,
                }}
    >

      {/* aritcle display box  */}
      <div className="reader-container"
           onMouseMove={handleMouseEnter}
           onMouseLeave={() => {
            clearTimeout(hideTimer.current);
            setShowOverlay(false);
           }}
           style={{ position: 'relative', 
                    flex: 1, 
                    display: 'flex',
                    overflow: 'hidden',
                    flexDirection: 'column',
                    minHeight: 0
                  }}
      >
          {isConversationMode && (
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5
                }}
              >
                <button
                  onMouseDown={() => { setIsRecording(r => !r); }}
                  onMouseUp={() => { setIsRecording(r => !r); }}
                  style={{
                    padding: '1rem',
                    borderRadius: '50%',
                    border: 'none',
                    background: isRecording ? 'red' : '#e0e0e0',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1.5rem'
                  }}
                >
                  {isRecording ? '🛑' : '🎤'}
                </button>
              </div>
        )}

        <div style={{ 
                      position: 'relative', 
                      flex: 1,
                      overflowY: 'auto',
                      zIndex: 0 }}>
          {highlightedText({ sentences, currentIndex })}
        </div>

        {showOverlay && !isConversationMode && isTtsReady &&
          (<button
            onClick={onPlay}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.3,
              padding: '0.75rem',
              borderRadius: '50%',
              border: 'none',
              background: '#000',
              color: '#fff',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.3}
          >
            {isPlaying ? '⏸' : '▶️'}
          </button>)
       }
      </div>
      
      {/* URL input box  */}
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
          ref={urlInputRef}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !loading) {
              e.preventDefault();
              fetchArticle();
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
        <button onClick={toggleConversationMode}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: '#e0e0e0',
                  color: '#333',
                  cursor: loading || !url ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease'
                }}
        >
          {isConversationMode ? 'Stop Talking' : 'Start Talking'}
        </button>
        <button
          onClick={fetchArticle}
          disabled={loading || !url.trim()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: '#e0e0e0',
            color: '#333',
            cursor: loading || !url ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {loading ? '...' : 'Fetch'}
        </button>
      </div>
      
    </div>
  );
}
