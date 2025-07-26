import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Document } from 'docx';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [wpm, setWpm] = useState(300);
  const [currentWord, setCurrentWord] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + ' ';
        }
        setText(fullText);
      } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const doc = await Document.load(arrayBuffer);
        const paragraphs = doc.getParagraphs().map(p => p.getText()).join(' ');
        setText(paragraphs);
      }
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying && text) {
      const words = text.split(/\s+/).filter(word => word);
      interval = setInterval(() => {
        if (wordIndex < words.length) {
          setCurrentWord(words[wordIndex]);
          setWordIndex(wordIndex + 1);
        } else {
          setIsPlaying(false);
          setCurrentWord('');
          setWordIndex(0);
        }
      }, 60000 / wpm);
    }
    return () => clearInterval(interval);
  }, [isPlaying, text, wpm, wordIndex]);

  const startReading = () => {
    if (text && !isPlaying) {
      setWordIndex(0);
      setIsPlaying(true);
    }
  };

  const pauseReading = () => setIsPlaying(false);

  const skipForward = () => {
    const words = text.split(/\s+/).filter(word => word);
    const nextSentenceIndex = words.indexOf('.', wordIndex) + 1 || words.length;
    setWordIndex(nextSentenceIndex);
  };

  const skipBackward = () => {
    const words = text.split(/\s+/).filter(word => word);
    let prevSentenceIndex = wordIndex - 1;
    while (prevSentenceIndex > 0 && words[prevSentenceIndex - 1] !== '.') {
      prevSentenceIndex--;
    }
    setWordIndex(prevSentenceIndex);
  };

  return (
    <div className="app">
      <h1>FlashRead</h1>
      <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
      <div>
        <label>WPM: </label>
        <input
          type="number"
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          min="100"
          max="1000"
        />
      </div>
      <div className="controls">
        <button onClick={startReading} disabled={!text || isPlaying}>
          Start
        </button>
        <button onClick={pauseReading} disabled={!isPlaying}>
          Pause
        </button>
        <button onClick={skipBackward} disabled={!text}>
          Back
        </button>
        <button onClick={skipForward} disabled={!text}>
          Forward
        </button>
      </div>
      <div className="rsvp-display">
        {currentWord}
      </div>
    </div>
  );
}

export default App;