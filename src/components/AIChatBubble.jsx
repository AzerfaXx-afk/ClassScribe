import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAI } from '../services/aiService';

export default function AIChatBubble({ lang, t, apiKey, contextRef, setShowSettings }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'system_display', content: t.chat_welcome }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

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
                                >
                                    {msg.content}
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
