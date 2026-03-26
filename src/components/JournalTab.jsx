import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Sparkles, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportJournalToPDF } from '../services/exportService';
import { analyzeJournal } from '../services/aiService';

export default function JournalTab({ lang, t, apiKey, setModal, setShowSettings, chatContextRef }) {
    const [pages, setPages] = useState(() => JSON.parse(localStorage.getItem('cs_journal') || '[]'));
    const [currentPage, setCurrentPage] = useState(0);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const contentRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('cs_journal', JSON.stringify(pages));
    }, [pages]);

    // Update chat context
    useEffect(() => {
        if (chatContextRef && pages.length > 0 && pages[currentPage]) {
            const page = pages[currentPage];
            chatContextRef.current = `Journal - ${page.title} (${page.date}): ${(page.content || '').replace(/<[^>]*>/g, ' ')}`;
        }
    }, [pages, currentPage, chatContextRef]);

    // Sync contentEditable when page changes
    useEffect(() => {
        if (contentRef.current && pages[currentPage]) {
            contentRef.current.innerHTML = pages[currentPage].content || '';
        }
    }, [currentPage, pages.length]);

    const addPage = () => {
        const today = new Date().toISOString().split('T')[0];
        const newPage = {
            id: Date.now(),
            title: `${t.journal_page} ${pages.length + 1}`,
            date: today,
            content: ''
        };
        setPages(prev => [...prev, newPage]);
        setDirection(1);
        setCurrentPage(pages.length);
    };

    const updatePage = (field, value) => {
        setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, [field]: value } : p));
    };

    const deletePage = () => {
        setModal({
            type: 'confirm',
            title: t.journal_delete_page,
            message: t.journal_delete_page_msg,
            onConfirm: () => {
                setPages(prev => prev.filter((_, i) => i !== currentPage));
                if (currentPage > 0) setCurrentPage(currentPage - 1);
            }
        });
    };

    const goToPage = (newPage) => {
        if (newPage < 0 || newPage >= pages.length) return;
        setDirection(newPage > currentPage ? 1 : -1);
        setCurrentPage(newPage);
    };

    const handleAnalyze = async () => {
        if (!apiKey) return setShowSettings(true);
        if (pages.length === 0) return;
        setLoading(true);
        try {
            const plainPages = pages.map(p => ({
                ...p,
                content: (p.content || '').replace(/<[^>]*>/g, ' ').trim()
            }));
            const res = await analyzeJournal(plainPages, apiKey, lang);
            setAnalysis(res);
        } catch (e) {
            setModal({ type: 'alert', title: t.ai_error, message: e.message });
        }
        setLoading(false);
    };

    const page = pages[currentPage];

    return (
        <div className="tab-content">
            <div className="journal-container">
                <div className="journal-header">
                    <h2>📖 {t.journal_title}</h2>
                    <div className="journal-actions">
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={addPage}>
                            <Plus size={16} /> <span style={{ fontSize: '0.85rem' }}>{t.journal_add_page}</span>
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem' }} onClick={handleAnalyze} disabled={loading || pages.length === 0}>
                            {loading ? "..." : <Sparkles size={16} />} <span style={{ fontSize: '0.85rem' }}>{t.journal_analyze}</span>
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem' }} onClick={() => exportJournalToPDF(pages, lang)} disabled={pages.length === 0}>
                            <Download size={16} /> <span style={{ fontSize: '0.85rem' }}>{t.journal_export_pdf}</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {analysis && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="summary-box"
                            style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '0.8rem', padding: '1rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '0.4rem', fontSize: '0.9rem', marginTop: 0 }}>{t.ai_summary}</h4>
                                <button
                                    onClick={() => setAnalysis(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.5, padding: 0 }}
                                >×</button>
                            </div>
                            <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>{analysis}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="journal-book">
                    {pages.length === 0 ? (
                        <div className="journal-empty">
                            <BookOpen size={56} />
                            <p>{t.journal_no_pages}</p>
                        </div>
                    ) : page ? (
                        <>
                            <div key={page.id} className={direction > 0 ? 'page-enter' : 'page-enter-reverse'} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                <div className="journal-page-header">
                                    <input
                                        className="page-title"
                                        type="text"
                                        value={page.title}
                                        onChange={(e) => updatePage('title', e.target.value)}
                                        placeholder={t.journal_day_title}
                                    />
                                    <input
                                        className="page-date"
                                        type="date"
                                        value={page.date}
                                        onChange={(e) => updatePage('date', e.target.value)}
                                    />
                                    <button className="toolbar-btn" style={{ color: '#ef4444' }} onClick={deletePage}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="page-divider" />
                                <div
                                    className="journal-content"
                                    ref={contentRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={(e) => updatePage('content', e.currentTarget.innerHTML)}
                                    data-placeholder={t.journal_placeholder}
                                />
                            </div>

                            <div className="journal-navigation">
                                <button
                                    className="nav-arrow"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 0}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <span className="page-indicator">
                                    {t.journal_page} {currentPage + 1} {t.journal_of} {pages.length}
                                </span>
                                <button
                                    className="nav-arrow"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === pages.length - 1}
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
