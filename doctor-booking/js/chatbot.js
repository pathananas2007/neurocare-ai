/**
 * chatbot.js
 * Wellness Forever AI Healthcare Assistant UI & Communication Layer
 * 
 * Features:
 * - Floating trigger button with smooth expand/collapse
 * - Welcome message with suggested prompt chips
 * - Markdown-like text formatter (bold, lists, links)
 * - Emergency symptom detector with urgent guidance
 * - Real-time typing indicator and error retry
 * - Session message history conservation
 * - Safe JWT session detection for authenticated context
 */

(function () {
    // Prevent multiple initializations if script is loaded multiple times
    if (window.WFChatbotInitialized) return;
    window.WFChatbotInitialized = true;

    // Chatbot state
    const state = {
        isOpen: false,
        isLoading: false,
        messages: [],
        lastFailedMessage: null
    };

    const SUGGESTED_PROMPTS = [
        "Help me find a doctor",
        "How do I book an appointment?",
        "How can I cancel or reschedule?",
        "What specialties are available?",
        "Urgent / Emergency care advice"
    ];

    // Build Chatbot DOM
    function injectChatbotHTML() {
        if (document.getElementById('wfChatbotContainer')) return;

        const container = document.createElement('div');
        container.id = 'wfChatbotContainer';
        container.innerHTML = `
            <!-- Floating Launcher Button -->
            <button id="wfChatLauncher" class="wf-chat-launcher" aria-label="Open AI Healthcare Assistant" title="Chat with Aura - AI Healthcare Assistant">
                <span class="wf-chat-launcher-icon">💬</span>
                <span class="wf-chat-launcher-close">✕</span>
                <span class="wf-chat-badge" aria-hidden="true"></span>
            </button>

            <!-- Chatbot Window -->
            <div id="wfChatWindow" class="wf-chat-window" role="dialog" aria-modal="false" aria-label="AI Healthcare Assistant Chat">
                <!-- Header -->
                <header class="wf-chat-header">
                    <div class="wf-chat-header-info">
                        <div class="wf-chat-avatar">
                            <span>⚕️</span>
                            <span class="wf-chat-avatar-status" title="Active"></span>
                        </div>
                        <div class="wf-chat-title-group">
                            <h3>Aura Assistant <span class="wf-chat-ai-pill">AI</span></h3>
                            <p class="wf-chat-subtitle">Wellness Forever Healthcare Guide</p>
                        </div>
                    </div>
                    <div class="wf-chat-header-actions">
                        <button id="wfChatClearBtn" class="wf-chat-btn-icon" title="Reset conversation" aria-label="Reset conversation">🔄</button>
                        <button id="wfChatCloseBtn" class="wf-chat-btn-icon" title="Close chat" aria-label="Close chat">✕</button>
                    </div>
                </header>

                <!-- Healthcare Disclaimer Banner -->
                <div class="wf-chat-safety-banner">
                    <span>🛡️</span>
                    <div>
                        <strong>AI Assistant:</strong> For informational guidance only. In medical emergencies, please call emergency services immediately.
                    </div>
                </div>

                <!-- Chat Body Messages -->
                <div id="wfChatMessages" class="wf-chat-messages">
                    <!-- Dynamic messages render here -->
                </div>

                <!-- Footer Input Area -->
                <footer class="wf-chat-footer">
                    <form id="wfChatForm" class="wf-chat-input-wrapper">
                        <input 
                            type="text" 
                            id="wfChatInput" 
                            class="wf-chat-input" 
                            placeholder="Ask about doctors, specialties, bookings…" 
                            maxlength="450" 
                            autocomplete="off"
                            aria-label="Message to AI Healthcare Assistant"
                        >
                        <button type="submit" id="wfChatSendBtn" class="wf-chat-send-btn" aria-label="Send message" disabled>
                            ➤
                        </button>
                    </form>
                    <div class="wf-chat-disclaimer">
                        Powered by AI • Wellness Forever Healthcare Systems
                    </div>
                </footer>
            </div>
        `;
        document.body.appendChild(container);

        bindEvents();
        sendInitialGreeting();
    }

    // Format Markdown-like text (bold, lists, linebreaks, links) safely
    function formatMessageContent(rawText) {
        if (!rawText) return '';

        // Escape HTML tags to prevent XSS
        let escaped = rawText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Bold: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Links to platform pages
        escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // Split paragraphs or bullet points
        const lines = escaped.split('\n');
        let html = '';
        let inList = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += `<li>${trimmed.substring(2)}</li>`;
            } else if (/^\d+\.\s/.test(trimmed)) {
                if (!inList) {
                    html += '<ol>';
                    inList = true;
                }
                html += `<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`;
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (trimmed.length > 0) {
                    html += `<p>${trimmed}</p>`;
                }
            }
        });

        if (inList) html += '</ul>';
        return html;
    }

    // Format current time
    function getCurrentTime() {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Scroll messages to bottom smoothly
    function scrollToBottom() {
        const msgs = document.getElementById('wfChatMessages');
        if (msgs) {
            msgs.scrollTop = msgs.scrollHeight;
        }
    }

    // Render a new message row
    function appendMessageRow(role, content, time = getCurrentTime(), isEmergency = false) {
        const messagesContainer = document.getElementById('wfChatMessages');
        if (!messagesContainer) return;

        const row = document.createElement('div');
        row.className = `wf-chat-message-row ${role}`;

        if (role === 'bot') {
            row.innerHTML = `
                <div class="wf-chat-bot-mini-avatar">⚕️</div>
                <div class="wf-chat-bubble ${isEmergency ? 'wf-chat-emergency-bubble' : ''}">
                    ${isEmergency ? `
                        <div class="wf-chat-emergency-header">
                            <span>🚨</span> Urgent Emergency Notice
                        </div>
                    ` : ''}
                    <div>${formatMessageContent(content)}</div>
                    <span class="wf-chat-time">${time}</span>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="wf-chat-bubble">
                    <div>${formatMessageContent(content)}</div>
                    <span class="wf-chat-time">${time}</span>
                </div>
            `;
        }

        messagesContainer.appendChild(row);
        scrollToBottom();
    }

    // Render typing indicator
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('wfChatMessages');
        if (!messagesContainer || document.getElementById('wfChatTypingRow')) return;

        const row = document.createElement('div');
        row.id = 'wfChatTypingRow';
        row.className = 'wf-chat-message-row bot';
        row.innerHTML = `
            <div class="wf-chat-bot-mini-avatar">⚕️</div>
            <div class="wf-chat-bubble wf-chat-typing-bubble" aria-label="Aura is thinking">
                <span class="wf-chat-dot"></span>
                <span class="wf-chat-dot"></span>
                <span class="wf-chat-dot"></span>
            </div>
        `;
        messagesContainer.appendChild(row);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const typing = document.getElementById('wfChatTypingRow');
        if (typing) typing.remove();
    }

    // Render error row with retry option
    function showErrorRow(errorMessage, onRetry) {
        const messagesContainer = document.getElementById('wfChatMessages');
        if (!messagesContainer) return;

        removeErrorRow();

        const errRow = document.createElement('div');
        errRow.id = 'wfChatErrorRow';
        errRow.className = 'wf-chat-error-row';
        errRow.innerHTML = `
            <span>⚠️</span>
            <span>${errorMessage}</span>
            <button id="wfChatRetryBtn" class="wf-chat-retry-btn">Retry</button>
        `;
        messagesContainer.appendChild(errRow);
        scrollToBottom();

        const retryBtn = document.getElementById('wfChatRetryBtn');
        if (retryBtn && onRetry) {
            retryBtn.addEventListener('click', () => {
                removeErrorRow();
                onRetry();
            });
        }
    }

    function removeErrorRow() {
        const err = document.getElementById('wfChatErrorRow');
        if (err) err.remove();
    }

    // Send initial welcoming greeting
    function sendInitialGreeting() {
        const messagesContainer = document.getElementById('wfChatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';
        state.messages = [];

        // Check if user is logged in
        let userName = '';
        try {
            const session = localStorage.getItem('wf_session');
            if (session) {
                const parsed = JSON.parse(session);
                userName = parsed.name ? `, ${parsed.name.split(' ')[0]}` : '';
            }
        } catch (e) {}

        const greeting = `Hello${userName}! 👋 I am **Aura**, your Wellness Forever Healthcare Guide.\n\nHow can I support you today? You can ask me to find a doctor by specialty, guide you through booking or cancelling appointments, or answer questions about our clinic services.`;

        appendMessageRow('bot', greeting);

        // Append suggested quick prompt chips
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'wf-chat-suggestions';
        SUGGESTED_PROMPTS.forEach(promptText => {
            const chip = document.createElement('button');
            chip.className = 'wf-chat-chip';
            chip.textContent = promptText;
            chip.addEventListener('click', () => {
                handleUserSendMessage(promptText);
            });
            chipsContainer.appendChild(chip);
        });

        messagesContainer.appendChild(chipsContainer);
        scrollToBottom();
    }

    // Emergency symptom pre-check (Client safety guard)
    function checkEmergencyKeywords(text) {
        const lower = text.toLowerCase();
        const emergencyKeywords = [
            'heart attack', 'chest pain', 'cannot breathe', 'difficulty breathing',
            'severe bleeding', 'stroke', 'unconscious', 'poisoning', 'choking'
        ];
        return emergencyKeywords.some(kw => lower.includes(kw));
    }

    // Handle user message dispatch
    async function handleUserSendMessage(userText) {
        if (!userText || userText.trim().length === 0 || state.isLoading) return;

        const cleanText = userText.trim();
        removeErrorRow();

        // Check emergency
        const isEmergency = checkEmergencyKeywords(cleanText);

        // Append user bubble
        appendMessageRow('user', cleanText);
        state.messages.push({ role: 'user', content: cleanText });

        // Clear input
        const input = document.getElementById('wfChatInput');
        const sendBtn = document.getElementById('wfChatSendBtn');
        if (input) input.value = '';
        if (sendBtn) sendBtn.disabled = true;

        if (isEmergency) {
            appendMessageRow(
                'bot',
                `**IMMEDIATE EMERGENCY WARNING:**\n\nYour query mentions severe symptoms. Please **do not wait for an online appointment**. Call local emergency services (112 / 102 in India or 911) or proceed immediately to the nearest hospital casualty emergency ward.`,
                getCurrentTime(),
                true
            );
        }

        // Show typing indicator
        showTypingIndicator();
        state.isLoading = true;

        try {
            // Send request to dedicated backend /api/chat
            let response;
            if (typeof ChatAPI !== 'undefined' && ChatAPI.sendMessage) {
                response = await ChatAPI.sendMessage(state.messages);
            } else {
                // Fallback direct fetch if api.js wasn't loaded beforehand
                const token = (function () {
                    try {
                        const s = localStorage.getItem('wf_session');
                        return s ? JSON.parse(s).token : null;
                    } catch (e) { return null; }
                })();

                // Dynamic base url resolution matching api.js
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:5000/api'
                    : 'https://dr-appointment-omby.onrender.com/api';

                const res = await fetch(`${baseUrl}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ messages: state.messages })
                });

                response = await res.json();
                if (!res.ok) throw new Error(response.message || 'Unable to connect to AI server');
            }

            removeTypingIndicator();

            if (response && response.reply) {
                appendMessageRow('bot', response.reply);
                state.messages.push({ role: 'assistant', content: response.reply });
            } else {
                throw new Error('Received an unexpected reply format.');
            }

        } catch (err) {
            console.error('Chatbot error:', err);
            removeTypingIndicator();
            state.lastFailedMessage = cleanText;

            const friendlyError = err.message || 'Something went wrong while reaching the AI assistant.';
            showErrorRow(friendlyError, () => {
                if (state.lastFailedMessage) {
                    handleUserSendMessage(state.lastFailedMessage);
                }
            });
        } finally {
            state.isLoading = false;
        }
    }

    // Toggle chat modal window
    function toggleChat(open = null) {
        const shouldOpen = open !== null ? open : !state.isOpen;
        state.isOpen = shouldOpen;

        const launcher = document.getElementById('wfChatLauncher');
        const windowEl = document.getElementById('wfChatWindow');
        const badge = document.querySelector('.wf-chat-badge');

        if (launcher) launcher.classList.toggle('is-active', state.isOpen);
        if (windowEl) windowEl.classList.toggle('is-open', state.isOpen);

        if (state.isOpen) {
            if (badge) badge.style.display = 'none';
            setTimeout(() => {
                const input = document.getElementById('wfChatInput');
                if (input) input.focus();
                scrollToBottom();
            }, 250);
        }
    }

    // Event listeners
    function bindEvents() {
        const launcher = document.getElementById('wfChatLauncher');
        const closeBtn = document.getElementById('wfChatCloseBtn');
        const clearBtn = document.getElementById('wfChatClearBtn');
        const form = document.getElementById('wfChatForm');
        const input = document.getElementById('wfChatInput');
        const sendBtn = document.getElementById('wfChatSendBtn');

        if (launcher) launcher.addEventListener('click', () => toggleChat());
        if (closeBtn) closeBtn.addEventListener('click', () => toggleChat(false));

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                sendInitialGreeting();
            });
        }

        if (input && sendBtn) {
            input.addEventListener('input', () => {
                sendBtn.disabled = input.value.trim().length === 0;
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (input) handleUserSendMessage(input.value);
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                toggleChat(false);
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatbotHTML);
    } else {
        injectChatbotHTML();
    }
})();
