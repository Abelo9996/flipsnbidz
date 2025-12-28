// AI Chatbot Frontend Logic
class ChatbotClient {
    constructor() {
        this.isOpen = false;
        this.conversationHistory = [];
        this.init();
    }

    init() {
        // DOM Elements
        this.toggle = document.getElementById('chatbot-toggle');
        this.window = document.getElementById('chatbot-window');
        this.minimize = document.getElementById('chatbot-minimize');
        this.form = document.getElementById('chatbot-form');
        this.input = document.getElementById('chatbot-input');
        this.messages = document.getElementById('chatbot-messages');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.badge = document.getElementById('chat-badge');

        // Event Listeners
        this.toggle.addEventListener('click', () => this.toggleChat());
        this.minimize.addEventListener('click', () => this.toggleChat());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Load conversation history from localStorage
        this.loadHistory();

        // Auto-show welcome message after 3 seconds if first visit
        if (!localStorage.getItem('chatbot_visited')) {
            setTimeout(() => {
                this.badge.classList.remove('hidden');
                localStorage.setItem('chatbot_visited', 'true');
            }, 3000);
        } else {
            this.badge.classList.add('hidden');
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.toggle.classList.toggle('active');
        this.window.classList.toggle('active');
        
        if (this.isOpen) {
            this.input.focus();
            this.badge.classList.add('hidden');
            this.scrollToBottom();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.input.value.trim();
        if (!message) return;

        // Add user message to UI
        this.addMessage(message, 'user');
        
        // Clear input
        this.input.value = '';
        
        // Show typing indicator
        this.showTyping();

        try {
            // Send message to backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: this.conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            
            // Hide typing indicator
            this.hideTyping();
            
            // Add bot response to UI
            this.addMessage(data.reply, 'bot');

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: data.reply }
            );

            // Save to localStorage
            this.saveHistory();

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTyping();
            this.addMessage(
                'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or contact us directly at (626) 944-3190 or flipsnbidz@gmail.com.',
                'bot'
            );
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Convert markdown-like formatting to HTML
        const formattedContent = this.formatMessage(content);
        contentDiv.innerHTML = formattedContent;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        
        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(text) {
        // Escape HTML to prevent XSS (but preserve intended formatting)
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // Split into lines for processing
        const lines = text.split('\n');
        const formatted = [];
        let inList = false;
        let inNumberedList = false;
        let inCodeBlock = false;
        let codeBlockContent = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Handle code blocks (```language or ```)
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End code block
                    formatted.push(`<pre><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    // Start code block
                    inCodeBlock = true;
                }
                continue;
            }

            // If in code block, collect lines
            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Handle inline code `code`
            line = line.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Handle bold **text**
            line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Handle italic *text*
            line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // Handle headers (### Header)
            if (line.match(/^#{1,6}\s+(.+)$/)) {
                const level = line.match(/^(#{1,6})/)[1].length;
                const text = line.replace(/^#{1,6}\s+/, '');
                formatted.push(`<h${Math.min(level + 2, 6)}>${text}</h${Math.min(level + 2, 6)}>`);
                continue;
            }

            // Handle numbered lists (1. Item)
            if (line.match(/^\d+\.\s+(.+)$/)) {
                const text = line.replace(/^\d+\.\s+/, '');
                if (!inNumberedList) {
                    formatted.push('<ol>');
                    inNumberedList = true;
                }
                if (inList) {
                    formatted.push('</ul>');
                    inList = false;
                }
                formatted.push(`<li>${text}</li>`);
                continue;
            } else if (inNumberedList && !line.match(/^\d+\.\s+(.+)$/)) {
                formatted.push('</ol>');
                inNumberedList = false;
            }

            // Handle bullet points (- Item or * Item)
            if (line.match(/^[-*]\s+(.+)$/)) {
                const text = line.replace(/^[-*]\s+/, '');
                if (!inList) {
                    formatted.push('<ul>');
                    inList = true;
                }
                if (inNumberedList) {
                    formatted.push('</ol>');
                    inNumberedList = false;
                }
                formatted.push(`<li>${text}</li>`);
                continue;
            } else if (inList && !line.match(/^[-*]\s+(.+)$/)) {
                formatted.push('</ul>');
                inList = false;
            }

            // Handle horizontal rules (---)
            if (line.trim() === '---' || line.trim() === '***') {
                formatted.push('<hr>');
                continue;
            }

            // Handle blockquotes (> text)
            if (line.match(/^>\s+(.+)$/)) {
                const text = line.replace(/^>\s+/, '');
                formatted.push(`<blockquote>${text}</blockquote>`);
                continue;
            }

            // Regular line - convert URLs to links
            if (line.trim()) {
                line = line.replace(
                    /(https?:\/\/[^\s<]+)/g,
                    '<a href="$1" target="_blank" rel="noopener">$1</a>'
                );
                formatted.push(`<p>${line}</p>`);
            } else {
                // Empty line creates spacing
                formatted.push('<br>');
            }
        }

        // Close any open lists
        if (inList) formatted.push('</ul>');
        if (inNumberedList) formatted.push('</ol>');

        return formatted.join('');
    }

    showTyping() {
        this.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('active');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messages.scrollTop = this.messages.scrollHeight;
        }, 100);
    }

    saveHistory() {
        // Keep only last 10 messages to avoid storage issues
        const recentHistory = this.conversationHistory.slice(-10);
        localStorage.setItem('chatbot_history', JSON.stringify(recentHistory));
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('chatbot_history');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.conversationHistory = [];
        }
    }

    clearHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('chatbot_history');
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatbotClient();
    });
} else {
    new ChatbotClient();
}
