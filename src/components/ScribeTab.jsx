import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Download, Save, Trash2, FileText, Bold, Underline, Italic, AlignLeft, AlignCenter, AlignRight, List, Heading1, Heading2, Palette, Pencil, Eraser } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { exportToPDF } from '../services/exportService';
import { summarizeTranscript } from '../services/aiService';

export default function ScribeTab({ lang, t, apiKey, history, setHistory, setModal, setShowHistory, setShowSettings, chatContextRef }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interim, setInterim] = useState("");
    const [summary, setSummary] = useState(null);
    const [showFormatting, setShowFormatting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [drawMode, setDrawMode] = useState(false);
    const [eraserMode, setEraserMode] = useState(false);
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const baseTranscriptRef = useRef("");
    const lastPosRef = useRef({ x: 0, y: 0 });
    const micStreamRef = useRef(null);
    const hasText = transcript.replace(/<[^>]*>/g, "").trim().length > 0;

    // Keep chat context updated
    useEffect(() => {
        if (chatContextRef) {
            chatContextRef.current = transcript.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }, [transcript, chatContextRef]);

    useEffect(() => {
        if (scrollRef.current && isRecording) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript, interim, isRecording]);

    const speechLocaleMap = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', ar: 'ar-SA' };

    const execCmd = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        scrollRef.current?.focus();
    };

    const handleKeydown = (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveToHistory();
        }
    };

    const saveToHistory = () => {
        if (!transcript) return;
        const entry = { id: Date.now(), date: new Date().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'), text: transcript, summary };
        setHistory(prev => [entry, ...prev]);
        setModal({ type: 'alert', title: t.saved, message: t.saved_msg });
    };

    const stopMicBoost = () => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            stopMicBoost();
        } else {
            const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!Speech) return setModal({ type: 'alert', title: t.browser_incompatible, message: t.browser_incompatible_msg });

            try {
                // Boost OS microphone limit for distant voices
                micStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true, advanced: [{gain: 2.0}] }
                });
            } catch (e) { console.warn("Mic boost not supported", e); }

            // Store the text we had right before recording started in this session
            baseTranscriptRef.current = transcript;

            const rec = new Speech();
            rec.lang = speechLocaleMap[lang] || 'fr-FR';
            rec.continuous = false; // Fix Android duplicate bug: listen sentence by sentence
            rec.interimResults = true;

            rec.onresult = (e) => {
                let curInterim = "";
                let sessionFinalStr = "";
                for (let i = 0; i < e.results.length; i++) {
                    if (e.results[i].isFinal) {
                        sessionFinalStr += e.results[i][0].transcript + " ";
                    } else {
                        curInterim += e.results[i][0].transcript;
                    }
                }
                
                if (sessionFinalStr) {
                    baseTranscriptRef.current = (baseTranscriptRef.current + " " + sessionFinalStr).trim();
                }
                
                const combined = (baseTranscriptRef.current + " " + curInterim).trim();
                setTranscript(combined);
                setInterim(curInterim);
            };

            rec.onerror = () => {};
            rec.onend = () => { 
                if (recognitionRef.current) { 
                    try { rec.start(); } catch(e) {} 
                } 
            };
            rec.start();
            recognitionRef.current = rec;
            setIsRecording(true);
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            stopMicBoost();
        };
    }, []);

    const handleAI = async () => {
        if (!apiKey) return setShowSettings(true);
        setLoading(true);
        try {
            const res = await summarizeTranscript(transcript.replace(/<[^>]*>/g, ' '), apiKey, lang);
            setSummary(res);
        } catch (e) {
            setModal({ type: 'alert', title: t.ai_error, message: e.message });
        }
        setLoading(false);
    };

    // Drawing canvas logic
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        
        if (!canvas.getAttribute('data-init')) {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight || 500;
            canvas.setAttribute('data-init', 'true');
        }

        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#ff7e67';
        ctx.lineWidth = eraserMode ? 20 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = eraserMode ? 'destination-out' : 'source-over';

        if (!drawMode) return;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        };

        const onStart = (e) => {
            e.preventDefault();
            isDrawingRef.current = true;
            lastPosRef.current = getPos(e);
        };

        const onMove = (e) => {
            if (!isDrawingRef.current) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPosRef.current = pos;
        };

        const onEnd = () => { isDrawingRef.current = false; };

        canvas.addEventListener('mousedown', onStart);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onEnd);
        canvas.addEventListener('mouseleave', onEnd);
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);

        return () => {
            canvas.removeEventListener('mousedown', onStart);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseup', onEnd);
            canvas.removeEventListener('mouseleave', onEnd);
            canvas.removeEventListener('touchstart', onStart);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onEnd);
        };
    }, [drawMode, eraserMode]);

    const clearDrawing = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    return (
        <div className="tab-content">
            <div className={`status-header ${isRecording ? 'active' : ''}`}>
                <div className="status-dot"></div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isRecording ? '#2ecc71' : '#b2bec3', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {isRecording ? t.listening : t.ready}
                </span>
            </div>

            <div className="action-bar" style={{ justifyContent: 'center', gap: '0.8rem', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                <button className={`btn icon-btn ${isRecording ? 'btn-danger' : 'btn-primary'}`} onClick={toggleRecording} title={isRecording ? t.stop : t.start}>
                    {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                <button className="btn btn-ghost icon-btn" onClick={handleAI} disabled={loading || !hasText} title={t.analyze}>
                    {loading ? <span style={{fontSize:'10px'}}>...</span> : <Sparkles size={22} />}
                </button>
                <button className="btn btn-ghost icon-btn" onClick={() => exportToPDF(transcript, summary, lang)} disabled={!hasText} title={t.pdf}>
                    <Download size={22} />
                </button>
                <button className="btn btn-ghost icon-btn" onClick={saveToHistory} disabled={!hasText} title={t.save}>
                    <Save size={22} />
                </button>
                <button className={`btn icon-btn ${drawMode && !eraserMode ? 'btn-accent' : 'btn-ghost'}`} onClick={() => { 
                    if (drawMode && !eraserMode) setDrawMode(false); 
                    else { setDrawMode(true); setEraserMode(false); } 
                }} title="Dessiner">
                    <Pencil size={22} />
                </button>
                <button className={`btn icon-btn ${drawMode && eraserMode ? 'btn-accent' : 'btn-ghost'}`} onClick={() => { 
                    if (drawMode && eraserMode) setDrawMode(false); 
                    else { setDrawMode(true); setEraserMode(true); } 
                }} title="Gomme">
                    <Eraser size={22} />
                </button>

                <button className="btn btn-danger icon-btn" disabled={!hasText} onClick={() => {
                    setModal({
                        type: 'confirm',
                        title: t.clear,
                        message: t.clear_msg,
                        onConfirm: () => { setTranscript(""); setSummary(null); clearDrawing(); if (scrollRef.current) scrollRef.current.innerHTML = ""; }
                    });
                }} title={t.clear}><Trash2 size={22} /></button>
            </div>

            <AnimatePresence>
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="summary-box"
                        style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '0.8rem', padding: '1rem' }}
                    >
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.4rem', fontSize: '0.9rem', marginTop: 0 }}>{t.ai_summary}</h4>
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>{summary}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="toolbar-wrapper">
                <div className={`formatting-bar ${showFormatting ? 'expanded' : ''}`}>
                    <button className="toolbar-toggle" onClick={() => setShowFormatting(!showFormatting)} title={t.formatting}>
                        <Palette size={20} />
                    </button>

                    <div className="formatting-tools">
                        <select className="toolbar-select" onChange={(e) => execCmd('fontName', e.target.value)} defaultValue="Quicksand">
                            <option value="Quicksand">{t.font_quicksand}</option>
                            <option value="Comic Sans MS">{t.retro}</option>
                            <option value="Arial">{t.font_arial}</option>
                        </select>

                        <div className="toolbar-divider" />
                        <button className="toolbar-btn" onClick={() => execCmd('formatBlock', '<h1>')} title="H1"><Heading1 size={18} /></button>
                        <button className="toolbar-btn" onClick={() => execCmd('formatBlock', '<h2>')} title="H2"><Heading2 size={18} /></button>
                        <div className="toolbar-divider" />
                        <button className="toolbar-btn" onClick={() => execCmd('bold')} title="B"><Bold size={18} /></button>
                        <button className="toolbar-btn" onClick={() => execCmd('italic')} title="I"><Italic size={18} /></button>
                        <button className="toolbar-btn" onClick={() => execCmd('underline')} title="U"><Underline size={18} /></button>
                        <div className="toolbar-divider" />
                        <button className="toolbar-btn" onClick={() => execCmd('justifyLeft')}><AlignLeft size={18} /></button>
                        <button className="toolbar-btn" onClick={() => execCmd('justifyCenter')}><AlignCenter size={18} /></button>
                        <button className="toolbar-btn" onClick={() => execCmd('justifyRight')}><AlignRight size={18} /></button>
                        <div className="toolbar-divider" />
                        <button className="toolbar-btn" onClick={() => execCmd('insertUnorderedList')}><List size={18} /></button>
                        <input
                            type="color"
                            className="toolbar-btn"
                            style={{ border: 'none', width: '28px', height: '28px', padding: 0, cursor: 'pointer' }}
                            onChange={(e) => execCmd('foreColor', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <div
                    className="transcript-box"
                    ref={scrollRef}
                    contentEditable={!drawMode}
                    onKeyDown={handleKeydown}
                    suppressContentEditableWarning
                    onInput={(e) => setTranscript(e.currentTarget.innerHTML)}
                    onFocus={() => { if (!transcript) scrollRef.current.innerHTML = "<div></div>"; }}
                    style={{ height: '100%', pointerEvents: drawMode ? 'none' : 'auto' }}
                >
                    {transcript ? (
                        <div dangerouslySetInnerHTML={{ __html: transcript + (interim ? ` <span style="opacity:0.5">${interim}</span>` : "") }} />
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '6rem' }} contentEditable={false}>
                            <FileText size={48} style={{ margin: '0 auto 1rem' }} />
                            <p>{t.placeholder}</p>
                        </div>
                    )}
                </div>
                <canvas
                    ref={canvasRef}
                    className={`drawing-overlay ${drawMode ? 'draw-active' : ''}`}
                    style={{ position: 'absolute', inset: 0, borderRadius: '24px', pointerEvents: drawMode ? 'auto' : 'none' }}
                />
            </div>
        </div>
    );
}
