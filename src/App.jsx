import React, { useState, useEffect, useRef } from 'react';
import { History, Settings, Trash2, FileText, AlertCircle, CheckCircle2, PenTool, BookOpen, Globe, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations, languageOptions } from './i18n';
import ScribeTab from './components/ScribeTab';
import JournalTab from './components/JournalTab';
import AIChatBubble from './components/AIChatBubble';

export default function App() {
    const [activeTab, setActiveTab] = useState('scribe');
    const [lang, setLang] = useState(() => localStorage.getItem('cs_lang') || 'fr');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('cs_key') || "");
    const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('cs_history') || "[]"));
    const [showHistory, setShowHistory] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [modal, setModal] = useState(null);
    const chatContextRef = useRef('');
    
    // Pull to refresh states
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const isPulling = useRef(false);
    const pullDistanceRef = useRef(0);

    const t = translations[lang] || translations.fr;

    useEffect(() => {
        localStorage.setItem('cs_lang', lang);
    }, [lang]);

    useEffect(() => {
        localStorage.setItem('cs_history', JSON.stringify(history));
    }, [history]);

    // Pull to Refresh logic
    useEffect(() => {
        const handleTouchStart = (e) => {
            if ((window.scrollY === 0 || document.documentElement.scrollTop === 0) && e.touches[0].clientY < 150) {
                isPulling.current = true;
                startY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling.current) return;
            const currentY = e.touches[0].clientY;
            const distance = currentY - startY.current;
            if (distance > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
                pullDistanceRef.current = Math.min(distance, 150);
                setPullDistance(pullDistanceRef.current);
            }
        };

        const handleTouchEnd = () => {
            if (!isPulling.current) return;
            isPulling.current = false;
            
            if (pullDistanceRef.current > 100) {
                setIsRefreshing(true);
                pullDistanceRef.current = 0;
                setPullDistance(0);
                
                setTimeout(() => {
                    window.location.reload();
                }, 1800);
            } else {
                pullDistanceRef.current = 0;
                setPullDistance(0);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    return (
        <div className="app">
            {/* Pull to refresh UI */}
            <div 
                className={`pull-indicator ${pullDistance > 0 && !isRefreshing ? 'visible' : ''}`}
                style={{ transform: `translateY(${Math.min(pullDistance - 50, 20)}px)`, opacity: pullDistance / 100 }}
            >
                <img src="/logo.png" alt="pull" />
            </div>

            <AnimatePresence>
                {isRefreshing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="refresh-overlay"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <img src="/logo.png" alt="ClassScribe" className="refresh-logo" />
                        </motion.div>
                        <h2 className="loading-text">{t.loading_app || "Chargement..."}</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="card">
                {/* Header */}
                <header className="scribe-header">
                    <div className="logo-section">
                        <img src="/logo.png" alt="ClassScribe" />
                        <h1>ClassScribe</h1>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setShowHistory(true)} title={t.history}><History size={18} /></button>
                        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setShowSettings(true)} title={t.settings}><Settings size={18} /></button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-btn ${activeTab === 'scribe' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scribe')}
                    >
                        📝 <span className="tab-label">{t.tab_scribe}</span>
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('journal')}
                    >
                        📖 <span className="tab-label">{t.tab_journal}</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'scribe' ? (
                    <ScribeTab
                        lang={lang}
                        t={t}
                        apiKey={apiKey}
                        history={history}
                        setHistory={setHistory}
                        setModal={setModal}
                        setShowHistory={setShowHistory}
                        setShowSettings={setShowSettings}
                        chatContextRef={chatContextRef}
                    />
                ) : (
                    <JournalTab
                        lang={lang}
                        t={t}
                        apiKey={apiKey}
                        setModal={setModal}
                        setShowSettings={setShowSettings}
                        chatContextRef={chatContextRef}
                    />
                )}
            </div>

            {/* AI Chat Bubble */}
            <AIChatBubble
                lang={lang}
                t={t}
                apiKey={apiKey}
                contextRef={chatContextRef}
                setShowSettings={setShowSettings}
            />

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <div className="modal" onClick={() => setShowHistory(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0 }}>{t.history}</h2>
                                <button className="btn btn-ghost" onClick={() => setShowHistory(false)}>{t.close}</button>
                            </div>
                            {history.length === 0 ? (
                                <p style={{ opacity: 0.5, textAlign: 'center', padding: '3rem' }}>{t.no_history}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {history.map(item => (
                                        <div
                                            key={item.id}
                                            className="summary-box"
                                            style={{ margin: 0, padding: '1.2rem', cursor: 'pointer', background: 'rgba(255,255,255,0.6)', border: '2px solid var(--text-dark)' }}
                                            onClick={() => {
                                                // Load into ScribeTab - we'll use a simple approach
                                                setActiveTab('scribe');
                                                setShowHistory(false);
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '1rem' }}>
                                                    <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                    <input 
                                                        value={item.title || `${t.course_of} ${item.date}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const newHist = [...history];
                                                            const idx = newHist.findIndex(h => h.id === item.id);
                                                            if (idx > -1) {
                                                                newHist[idx] = { ...newHist[idx], title: e.target.value };
                                                                setHistory(newHist);
                                                            }
                                                        }}
                                                        style={{ 
                                                            fontWeight: 600, 
                                                            fontSize: '0.95rem', 
                                                            background: 'transparent', 
                                                            border: 'none', 
                                                            borderBottom: '1px dashed var(--text-dark)', 
                                                            width: '100%', 
                                                            color: 'var(--text-dark)',
                                                            padding: '2px 0'
                                                        }} 
                                                    />
                                                </div>
                                                <button
                                                    className="toolbar-btn"
                                                    style={{ color: '#ef4444' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModal({
                                                            type: 'confirm',
                                                            title: t.delete_confirm,
                                                            message: t.delete_msg,
                                                            onConfirm: () => setHistory(history.filter(h => h.id !== item.id))
                                                        });
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div
                                                style={{ fontSize: '0.85rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}
                                                dangerouslySetInnerHTML={{ __html: item.text }}
                                            />
                                        </div>
                                    ))}
                                    <button className="btn btn-danger" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => {
                                        setModal({
                                            type: 'confirm',
                                            title: t.clear_history_confirm,
                                            message: t.clear_history_msg,
                                            onConfirm: () => setHistory([])
                                        });
                                    }}>
                                        <Trash2 size={16} /> {t.empty_history}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <div className="modal" onClick={() => setShowSettings(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content"
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0 }}>⚙️ {t.settings}</h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', opacity: 0.5, padding: '0.5rem' }}
                                >×</button>
                            </div>

                            {/* Language Section */}
                            <div className="settings-section">
                                <h3><Globe size={18} /> {t.language}</h3>
                                <div className="lang-grid">
                                    {languageOptions.map(opt => (
                                        <button
                                            key={opt.code}
                                            className={`lang-btn ${lang === opt.code ? 'active' : ''}`}
                                            onClick={() => setLang(opt.code)}
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>{opt.flag}</span>
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* API Key Section */}
                            <div className="settings-section">
                                <h3><Key size={18} /> API Key (OpenAI)</h3>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0 0 0.5rem' }}>{t.api_key_msg}</p>
                                <input
                                    type="password"
                                    placeholder={t.api_key_placeholder}
                                    value={apiKey}
                                    onChange={e => {
                                        setApiKey(e.target.value);
                                        localStorage.setItem('cs_key', e.target.value);
                                    }}
                                />
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>{t.ok}</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Modal for Alerts/Confirms */}
            <AnimatePresence>
                {modal && (
                    <div className="modal" onClick={() => setModal(null)} style={{ zIndex: 1000 }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '400px', textAlign: 'center' }}
                        >
                            <div style={{ padding: '1rem' }}>
                                {modal.type === 'confirm' ? (
                                    <AlertCircle size={48} color="var(--primary)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                                ) : (
                                    <CheckCircle2 size={48} color="var(--secondary)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                                )}
                                <h2 style={{ marginBottom: '1rem' }}>{modal.title}</h2>
                                <p style={{ opacity: 0.7, marginBottom: '2rem', lineHeight: '1.6' }}>{modal.message}</p>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    {modal.type === 'confirm' && (
                                        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>{t.cancel}</button>
                                    )}
                                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => {
                                        modal.onConfirm?.();
                                        setModal(null);
                                    }}>{t.ok}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
