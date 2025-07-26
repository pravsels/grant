
import React, { useRef, useEffect, useState } from 'react';

export default function ReaderTab(
  {
    url, setUrl,
    loading, setLoading,
    // sentences, setSentences,
    // currentIndex, setCurrentIndex,
    isPlaying, setIsPlaying
  }
) {
  const urlInputRef = useRef(null);
  const ttsRef = useRef(null);
  const playingRef = useRef(isPlaying);

  const [showOverlay, setShowOverlay] = useState(false);
  const hideTimer = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(1);

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

  const [sentences, setSentences] = useState([
    "In many ways, this horse is normal: it stands roughly 14 hands high, has dark eyes hooded by thick lashes, and makes a contented neighing sound when its coat is stroked.",
    "But its blood pulses with venom.",
    "For weeks, this horse has been injected with the diluted venom of snakes, generating an immune response that will be exploited to produce lifesaving antivenom.",
    "A veterinarian inserts a tube into the horse's jugular vein to extract its blood – about 1.5 percent of its body weight – every four weeks.",
    "Each bag of horse blood is worth around $500.",
    "Horses are just one of the many animals we use as chemical factories: there is a veritable Noah's ark of biopharming.",
    "Every year, over 700,000 horseshoe crabs are caught and bled.",
    "Their blood is used to test for contamination in the manufacture of medical equipment and drugs.",
    "The global vaccine industry uses an estimated 600 million chicken eggs a year to produce influenza vaccines.",
    "And we boil between 420 billion and 1 trillion silkworms every year to produce silk.",
    "Some of these practices go back millennia.",
    "On a small coastal spit along the Mediterranean Sea, ancient Phoenicians harvested snails from which they derived a rich-hued pigment known as Tyrian purple.",
    "In a multistep process involving sun-drying and fermenting the gland that produces the color, 12,000 of these mollusks went into every single gram of dye.",
    "The complexity of its production, and therefore rarity of the product, made the dye expensive, costing approximately three troy pounds of gold per pound of dye.",
    "Tyrian purple was reserved for highly selective items such as the toga picta worn by the Roman elite.",
    "Synthetic dyes have long since overtaken the animal-derived production of Tyrian purple.",
    "The same goes for most medicines, including insulin, which today is manufactured biosynthetically inside E. coli bacteria.",
    "But before 1978, insulin was made by harvesting and grinding up the pancreases of dead pigs from slaughterhouses.",
    "Some 24,000 pigs were needed to make just one pound of insulin, which could treat only 750 diabetics annually."
 ]);

  

  // fetch article from the internet 
  async function fetchArticle(url) {
    
  }

  // split into sentences 
  function splitSentences(text) {

  }

  // play next sentence 
  function playSentence(sentenceIndex) {
    if (sentenceIndex >= sentences.length) {
      setIsPlaying(false);
      return; 
    }

    const utter = new SpeechSynthesisUtterance(sentences[sentenceIndex]);

    // callback that happens after this sentence is uttered 
    utter.onend = () => {
      console.log("inside onend, isPlaying : ", isPlaying);
      setCurrentIndex(i => {
        const nextIndex = i + 1; 
        if (playingRef.current) playSentence(nextIndex); 
        return nextIndex; 
      });
    };

    // speak this sentence out  
    speechSynthesis.speak(utter);
  }

  // highlight already read and currently reading text in different ways 
  function highlightedText({ sentences, currentIndex }) {
    return (
      <div className="article-text" style={{ flex: 1, maxWidth: '80ch' }}>
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
                    minHeight: 0
                  }}
      >
        { highlightedText({ sentences, currentIndex }) }

        {showOverlay && 
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
