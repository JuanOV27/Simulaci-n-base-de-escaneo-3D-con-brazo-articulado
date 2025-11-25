class KairosChat {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.messagesContainer = document.getElementById('messages');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.chatForm = document.getElementById('chatForm');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.messagesWrapper = document.querySelector('.messages-wrapper');

        this.messageCountEl = document.getElementById('messageCount');
        this.sessionTimeEl = document.getElementById('sessionTime');

        this.logoInput = document.getElementById('logoInput');
        this.logoImage = document.getElementById('logoImage');
        this.logoPlaceholder = document.getElementById('logoPlaceholder');
        this.logoUploadLabel = document.querySelector('.logo-upload');

        this.voiceBtn = document.getElementById('voiceBtn');
        this.imageBtn = document.getElementById('imageBtn');
        this.imageInput = document.getElementById('imageInput');

        this.messageCount = 0;
        this.sessionStartTime = Date.now();
        this.isListening = false;
        this.selectedImage = null;
        this.isFirstMessage = true;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
        if (this.recognition) {
            this.setupSpeechRecognition();
        }

        this.initEventListeners();
        this.loadChatHistory();
        this.loadLogoImage();
        this.startSessionTimer();
        this.updateStats();
    }

    /* ---------------------------
       RECONOCIMIENTO DE VOZ
    ---------------------------- */
    setupSpeechRecognition() {
        this.recognition.lang = 'es-ES';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.voiceBtn) this.voiceBtn.classList.add('listening');
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            this.messageInput.value = transcript;
        };

        this.recognition.onerror = () => {
            this.isListening = false;
            if (this.voiceBtn) this.voiceBtn.classList.remove('listening');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.voiceBtn) this.voiceBtn.classList.remove('listening');
        };
    }

    /* ---------------------------
       EVENTOS
    ---------------------------- */
    initEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearChat());

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage(e);
            }
        });

        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleVoiceInput();
            });
        }

        if (this.imageBtn) {
            this.imageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.imageInput.click();
            });
        }

        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleImageSelect(file);
                }
            });
        }

        if (this.logoUploadLabel) {
            this.logoUploadLabel.addEventListener('click', () => {
                this.logoInput.click();
            });
        }

        if (this.logoInput) {
            this.logoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imageData = event.target.result;
                        this.logoImage.src = imageData;
                        this.logoImage.style.display = 'block';
                        this.logoPlaceholder.style.display = 'none';
                        localStorage.setItem('kairosLogo', imageData);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // evento global para remover preview de imagen
        document.body.addEventListener('removeImage', () => {
            const preview = document.querySelector('.image-preview-container');
            if (preview) preview.remove();
            this.selectedImage = null;
        });
    }

    /* ---------------------------
       VOZ
    ---------------------------- */
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('Tu navegador no soporta reconocimiento de voz');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.messageInput.value = '';
            this.recognition.start();
        }
    }

    /* ---------------------------
       IMAGENES
    ---------------------------- */
    handleImageSelect(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.showImagePreview();
        };
        reader.readAsDataURL(file);
    }

    showImagePreview() {
        let previewContainer = document.querySelector('.image-preview-container');
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.className = 'image-preview-container';
            this.messageInput.parentElement.insertBefore(previewContainer, this.messageInput.nextSibling);
        }

        previewContainer.innerHTML = `
            <div class="image-preview">
                <img src="${this.selectedImage}" alt="Preview">
                <button type="button" class="image-preview-close" data-remove-image>×</button>
            </div>
        `;

        previewContainer.querySelector('[data-remove-image]').addEventListener('click', () => {
            document.body.dispatchEvent(new CustomEvent('removeImage'));
        });
    }

    /* ---------------------------
       LOGO
    ---------------------------- */
    loadLogoImage() {
        const savedLogo = localStorage.getItem('kairosLogo');
        if (savedLogo && this.logoImage) {
            this.logoImage.src = savedLogo;
            this.logoImage.style.display = 'block';
            if (this.logoPlaceholder) this.logoPlaceholder.style.display = 'none';
        }
    }

    /* ---------------------------
       UTIL: ESCAPAR HTML (por seguridad)
    ---------------------------- */
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* ---------------------------
       PARSEADOR MARKDOWN → HTML (mejor manejo de párrafos)
    ---------------------------- */
    parseMarkdown(text) {
        if (!text) return '';

        // Primero escapar para evitar inyección
        // (si confías en la fuente y quieres permitir HTML crudo, quita escapeHtml)
        const escaped = this.escapeHtml(text);

        // Dividir en párrafos por doble salto
        const paragraphs = escaped.split(/\n{2,}/g).map(p => p.trim());

        const parsed = paragraphs.map(paragraph => {
            let html = paragraph;

            // Negrilla **texto**
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // Itálica *texto* (no capturará lo ya envuelto en <strong> por la orden anterior)
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

            // Listas simples: líneas que empiezan con - o *
            // Convertir líneas en <li>
            if (/^([-*]\s+)/m.test(html)) {
                const items = html.split(/\r?\n/).map(line => line.replace(/^[-*]\s+/, ''));
                const lis = items.map(i => `<li>${i}</li>`).join('');
                return `<ul>${lis}</ul>`;
            }

            // Saltos de línea simples dentro del párrafo -> <br>
            html = html.replace(/\r?\n/g, '<br>');

            return `<p>${html}</p>`;
        });

        return parsed.join('');
    }

    /* ---------------------------
       ENVÍO MENSAJE
    ---------------------------- */
    async handleSendMessage(e) {
        e.preventDefault();

        const message = this.messageInput.value.trim();
        if (!message && !this.selectedImage) return;

        // Añadir mensaje del usuario (renderiza markdown)
        this.addMessage(message || '📸 [Imagen para análisis]', 'user');

        this.messageInput.value = '';

        const previewContainer = document.querySelector('.image-preview-container');
        if (previewContainer) previewContainer.remove();

        if (this.sendBtn) this.sendBtn.disabled = true;
        if (this.loadingSpinner) this.loadingSpinner.style.display = 'block';

        try {
            const payload = { message };
            if (this.selectedImage) payload.image = this.selectedImage;

            const response = await fetch('chat-api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                // parseMarkdown devuelve HTML seguro; lo pasamos para efecto tipográfico
                const html = this.parseMarkdown(data.response);
                this.addMessageWithTypingEffect(html, 'system');
                this.isFirstMessage = false;
            } else {
                this.addMessage('Error: ' + (data.error || 'No se pudo conectar con la API'), 'error');
            }
        } catch (err) {
            console.error(err);
            this.addMessage('Error de conexión. Intenta de nuevo.', 'error');
        } finally {
            if (this.sendBtn) this.sendBtn.disabled = false;
            if (this.loadingSpinner) this.loadingSpinner.style.display = 'none';
            this.updateStats();
            this.selectedImage = null;
        }
    }

    /* ---------------------------
       MENSAJE SIN EFECTO
    ---------------------------- */
    addMessage(text, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        // parseMarkdown transforma a HTML (ya escapado internamente)
        contentEl.innerHTML = this.parseMarkdown(text);

        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = this.getCurrentTime();

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timeEl);

        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
        this.saveChatHistory();
    }

    /* ---------------------------
       MENSAJE CON EFECTO DE ESCRITURA
       (preserva etiquetas: <strong>, <em>, <br>, <p>, <ul>/<li>)
    ---------------------------- */
    addMessageWithTypingEffect(html, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = this.getCurrentTime();

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timeEl);
        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();

        // Construir nodos reales desde el HTML final y animar solo los textNodes
        this.typeFormatted(contentEl, html);
    }

    /**
     * typeFormatted:
     *  - Crea un contenedor temporal, parsea el HTML completo,
     *  - clona la estructura al elemento destino,
     *  - para cada TextNode hace la animación letra a letra.
     */
    typeFormatted(targetEl, html, charDelay = 18, paragraphDelay = 250) {
        // Parsear HTML en un elemento temporal
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Función que procesa un nodo y lo clona al destino,
        // animando los nodos de texto.
        const processNode = (node, destParent, doneCallback) => {
            if (node.nodeType === Node.TEXT_NODE) {
                // Crear nodo vacío y animarlo
                const textNode = document.createTextNode('');
                destParent.appendChild(textNode);

                const text = node.textContent;
                let i = 0;
                const step = () => {
                    if (i <= text.length) {
                        textNode.textContent = text.slice(0, i);
                        i++;
                        this.scrollToBottom();
                        setTimeout(step, charDelay);
                    } else {
                        doneCallback();
                    }
                };
                step();
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Clonar la etiqueta (sin hijos por ahora)
                const el = document.createElement(node.tagName.toLowerCase());
                // Transferir atributos simples si los hay (por seguridad no transferimos todo)
                for (let attr of node.attributes || []) {
                    el.setAttribute(attr.name, attr.value);
                }

                destParent.appendChild(el);

                // Si es <br>, no necesitamos animación de texto
                if (node.tagName.toLowerCase() === 'br') {
                    doneCallback();
                    return;
                }

                // Procesar hijos secuencialmente para mantener orden y pausas entre párrafos
                const children = Array.from(node.childNodes);
                let idx = 0;
                const nextChild = () => {
                    if (idx >= children.length) {
                        // pequeña pausa al final de un párrafo/elemento
                        setTimeout(doneCallback, paragraphDelay);
                        return;
                    }
                    processNode(children[idx], el, () => {
                        idx++;
                        nextChild();
                    });
                };
                nextChild();
            } else {
                // nodos no manejados
                doneCallback();
            }
        };

        // Procesar los hijos del temp en secuencia
        const topChildren = Array.from(temp.childNodes);
        let tIndex = 0;
        const nextTop = () => {
            if (tIndex >= topChildren.length) {
                // terminado
                this.saveChatHistory();
                return;
            }
            processNode(topChildren[tIndex], targetEl, () => {
                tIndex++;
                nextTop();
            });
        };
        nextTop();
    }

    /* ---------------------------
       HISTORIAL
    ---------------------------- */
    saveChatHistory() {
        const messages = [];
        document.querySelectorAll('.message').forEach(msg => {
            const content = msg.querySelector('.message-content').innerHTML;
            const type = msg.classList.contains('user') ? 'user' : 'system';
            messages.push({ type, content });
        });
        localStorage.setItem('kairosChat', JSON.stringify(messages));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('kairosChat');
        if (!saved) return;

        try {
            const messages = JSON.parse(saved);
            this.messagesContainer.innerHTML = '';

            messages.forEach(msg => this.restoreMessage(msg.content, msg.type));
            this.isFirstMessage = false;
        } catch (e) {
            console.error('Error loading chat history:', e);
        }
    }

    restoreMessage(html, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.innerHTML = html;

        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = this.getCurrentTime();

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timeEl);
        this.messagesContainer.appendChild(messageEl);
    }

    /* ---------------------------
       UTILIDADES
    ---------------------------- */
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        if (!this.messagesWrapper) return;
        this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
    }

    updateStats() {
        const userMessages = document.querySelectorAll('.message.user').length;
        if (this.messageCountEl) this.messageCountEl.textContent = userMessages;
    }

    startSessionTimer() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            if (this.sessionTimeEl) this.sessionTimeEl.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    clearChat() {
        if (!confirm('¿Estás seguro de que quieres limpiar el chat?')) return;

        this.messagesContainer.innerHTML = `
            <div class="message system">
                <div class="message-content">
                    <p><strong>Hola, soy Kairos.</strong> Tu asistente especializado en simulación de escaneo 3D con brazo robótico.</p>
                    <p class="message-hint">Puedo ayudarte con:</p>
                    <ul class="hint-list">
                        <li>Calibración y configuración del brazo</li>
                        <li>Parámetros del escaneo 3D</li>
                        <li>Corrección de errores</li>
                        <li>Exportación de nube de puntos</li>
                    </ul>
                </div>
                <span class="message-time">Ahora</span>
            </div>
        `;

        localStorage.removeItem('kairosChat');
        this.isFirstMessage = true;
        this.updateStats();
    }
}

/* ==============================
   Quick question helper
==============================*/
function sendQuickQuestion(question) {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    messageInput.value = question;
    const form = document.getElementById('chatForm');
    if (!form) return;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

/* ==============================
   Inicializar
==============================*/
document.addEventListener('DOMContentLoaded', () => {
    new KairosChat();
});
