import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAI } from '../services/aiService';

export default function AIChatBubble({ lang, t, apiKey, contextRef, setShowSettings }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'system_display', content: t.chat_welcome }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    
    const formatMarkdown = (text) => {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // escape
            .replace(/&lt;mark&gt;/g, "<mark style='background:#ffdb58;padding:0 3px;border-radius:3px;font-weight:bold'>")
            .replace(/&lt;\/mark&gt;/g, "</mark>") // unescape mark
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left:15px">$1</li>')
            .replace(/\n/g, '<br/>');
    };

    const toggleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!Speech) return;
            const rec = new Speech();
            rec.lang = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
            rec.continuous = false;
            rec.interimResults = true;
            
            rec.onresult = (e) => {
                let current = "";
                for (let i = 0; i < e.results.length; i++) {
                    current += e.results[i][0].transcript;
                }
                setInput(current); // Live preview inside the input text
            };
            
            rec.onend = () => setIsListening(false);
            
            rec.start();
            recognitionRef.current = rec;
            setIsListening(true);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Reset welcome message when language changes
    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && prev[0].role === 'system_display') {
                return [{ role: 'system_display', content: t.chat_welcome }];
            }
            return prev;
        });
    }, [lang, t.chat_welcome]);

    const sendMessage = async () => {
        const msg = input.trim();
        if (!msg) return;

        if (!apiKey) {
            setMessages(prev => [...prev, { role: 'system_display', content: t.chat_no_key }]);
            setShowSettings(true);
            return;
        }

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setIsTyping(true);

        try {
            const context = contextRef?.current || '';
            const chatMessages = messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content }));
            chatMessages.push({ role: 'user', content: msg });

            const response = await chatWithAI(chatMessages, context, apiKey, lang);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'system_display', content: t.chat_error }]);
        }
        setIsTyping(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chat-window"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    >
                        <div className="chat-header">
                            <h3>✨ {t.chat_title}</h3>
                            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`chat-msg ${msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'ai' : 'system'}`}
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                >
                                </div>
                            ))}
                            {isTyping && (
                                <div className="chat-typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t.chat_placeholder}
                                disabled={isTyping}
                            />
                            <button
                                className={`chat-send-btn ${isListening ? 'listening' : ''}`}
                                onClick={toggleListen}
                                style={{ background: isListening ? '#ff7675' : 'transparent', color: isListening ? 'white' : 'var(--text-dark)', boxShadow: 'none' }}
                                title="Parler à l'IA"
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button
                                className="chat-send-btn"
                                onClick={sendMessage}
                                disabled={isTyping || !input.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                className="chat-bubble-trigger"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </motion.button>
        </>
    );
}
