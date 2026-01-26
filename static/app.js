function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = {
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        success: 'bi-check-circle-fill',
        info: 'bi-info-circle-fill'
    };
    
    toast.innerHTML = `
        <i class="bi ${icons[type]} toast-icon ${type}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close"><i class="bi bi-x"></i></button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    };
    
    closeBtn.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class HiloApp {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.projectId = null;
        this.chunkIndex = 0;
        this.state = 'stopped'; // stopped, recording, paused
        this.startTime = null;
        this.startTimePerf = null; // performance.now() at start
        this.pausedElapsed = 0;
        this.timerInterval = null;
        this.savedName = null;
        this.pendingChunks = 0;
        this.chunkDuration = 5; // default, loaded from server
        this.isCapturingPhoto = false;
        this.photos = []; // Photo history

        this.btnStart = document.getElementById('btn-start');
        this.btnPause = document.getElementById('btn-pause');
        this.btnPhoto = document.getElementById('btn-photo');
        this.btnPhotoMobile = document.getElementById('btn-photo-mobile');
        this.btnSwitchCamera = document.getElementById('btn-switch-camera');
        this.facingMode = 'user'; // 'user' (frontal) o 'environment' (trasera)
        this.longPressTimer = null;
        this.longPressDuration = 500; // ms para activar pause
        
        // Modal de confirmación
        this.stopModal = document.getElementById('stop-modal');
        this.modalFinish = document.getElementById('modal-finish');
        this.modalDiscard = document.getElementById('modal-discard');
        this.modalContinue = document.getElementById('modal-continue');
        this.stopModalTitle = document.getElementById('stop-modal-title');
        this.stopModalSubtitle = document.getElementById('stop-modal-subtitle');
        this.delayValueEl = document.getElementById('photo-delay');
        this.btnDelayMinus = document.getElementById('delay-minus');
        this.btnDelayPlus = document.getElementById('delay-plus');
        this.photoDelay = 3; // default value
        this.stylizeToggle = document.getElementById('stylize-toggle');
        this.stylizePhotos = true; // default
        this.serverTimeOffset = 0;
        this.projectStartAtMs = null;
        this.recordingLimitSeconds = null;
        this.recordingTotalSeconds = null;
        this.sessionLimitTimer = null;
        this.sessionLimitReached = false;
        this.noMinutesTimer = null;
        this.btnSettings = document.getElementById('btn-settings');
        this.photoConfig = document.getElementById('photo-config');
        this.nameTag = document.getElementById('name-tag');
        this.nameInputConfig = document.getElementById('name-input-config');
        this.projectInput = document.getElementById('project-input');
        this.isEditingName = false;
        this.statusEl = document.getElementById('status');
        this.timerEl = document.getElementById('timer');
        this.mobileTimerEl = document.getElementById('mobile-timer');
        this.transcriptEl = document.getElementById('transcript');
        this.videoEl = document.getElementById('preview');
        this.photoHistoryEl = document.getElementById('photo-history');
        this.noMinutesModal = document.getElementById('no-minutes-modal');
        this.noMinutesTitle = document.getElementById('no-minutes-title');
        this.noMinutesSubtitle = document.getElementById('no-minutes-subtitle');
        this.noMinutesCountdown = document.getElementById('no-minutes-countdown');
        this.noMinutesClose = document.getElementById('no-minutes-close');

        this.init();
    }

    async init() {
        // Click normal para start/stop
        this.btnStart.addEventListener('click', (e) => {
            this.requestFullscreenOnMobile();
            if (!this.longPressTriggered) {
                this.toggleStartStop();
            }
            this.longPressTriggered = false;
        });
        
        // Long-press para pause (touch)
        this.btnStart.addEventListener('touchstart', (e) => this.startLongPress(e), { passive: true });
        this.btnStart.addEventListener('touchend', () => this.cancelLongPress());
        this.btnStart.addEventListener('touchcancel', () => this.cancelLongPress());
        
        // Long-press para pause (mouse)
        this.btnStart.addEventListener('mousedown', (e) => this.startLongPress(e));
        this.btnStart.addEventListener('mouseup', () => this.cancelLongPress());
        this.btnStart.addEventListener('mouseleave', () => this.cancelLongPress());
        
        this.btnPause.addEventListener('click', () => this.togglePause());
        this.btnPhoto.addEventListener('click', () => this.capturePhoto());
        
        // Botón foto mobile
        if (this.btnPhotoMobile) {
            this.btnPhotoMobile.addEventListener('click', () => this.capturePhoto());
        }

        // Botón cambiar cámara
        if (this.btnSwitchCamera) {
            this.btnSwitchCamera.addEventListener('click', () => this.switchCamera());
        }

        // Modal de confirmación
        this.modalFinish.addEventListener('click', () => this.finishRecording());
        this.modalDiscard.addEventListener('click', () => this.discardRecording());
        this.modalContinue.addEventListener('click', () => this.continueRecording());
        if (this.noMinutesClose) {
            this.noMinutesClose.addEventListener('click', () => this.hideNoMinutesModal());
        }
        if (this.noMinutesModal) {
            this.noMinutesModal.addEventListener('click', (e) => {
                if (e.target === this.noMinutesModal) {
                    this.hideNoMinutesModal();
                }
            });
        }
        this.btnDelayMinus.addEventListener('click', () => this.adjustDelay(-1));
        this.btnDelayPlus.addEventListener('click', () => this.adjustDelay(1));
        if (this.stylizeToggle) {
            this.stylizeToggle.addEventListener('change', () => this.toggleStylize());
        }
        this.btnSettings.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettingsPanel();
        });

        // Cerrar config al hacer click fuera
        document.addEventListener('click', (e) => {
            if (this.photoConfig.classList.contains('visible')) {
                if (!this.photoConfig.contains(e.target) && !this.btnSettings.contains(e.target)) {
                    this.closeSettingsPanel();
                }
            }
        });

        // Etiqueta de nombre clickeable (desktop)
        this.nameTag.addEventListener('click', () => this.startEditingName());

        // Input de nombre en config (mobile)
        this.nameInputConfig.addEventListener('input', () => this.onNameConfigInput());
        this.nameInputConfig.addEventListener('blur', () => this.saveNameFromConfig());
        this.nameInputConfig.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.nameInputConfig.blur();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        this.loadPhotoDelay();
        this.loadName();
        this.loadStylizePreference();

        this.updateOrientationClasses();
        window.addEventListener('orientationchange', () => this.updateOrientationClasses());
        window.addEventListener('resize', () => this.updateOrientationClasses());
        if (screen.orientation && screen.orientation.addEventListener) {
            screen.orientation.addEventListener('change', () => this.updateOrientationClasses());
        }
        
        // Load config from server
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            this.chunkDuration = config.chunk_duration || 5;
            console.log(`Chunk duration: ${this.chunkDuration}s`);
        } catch (err) {
            console.warn('Could not load config, using defaults');
        }
    }


    updateOrientationClasses() {
        const body = document.body;
        if (!body) return;

        const isMobile = window.innerWidth <= 900;
        const isLandscape = isMobile && window.matchMedia('(orientation: landscape)').matches;
        body.classList.toggle('is-landscape', isLandscape);
        if (!isLandscape) {
            body.classList.remove('landscape-left', 'landscape-right');
            return;
        }

        let angle = 0;
        if (screen.orientation && typeof screen.orientation.angle === 'number') {
            angle = screen.orientation.angle;
        } else if (typeof window.orientation === 'number') {
            angle = window.orientation;
        }

        let isLeft = false;
        let isRight = false;

        if (screen.orientation && typeof screen.orientation.type === 'string') {
            if (screen.orientation.type.includes('landscape-primary')) {
                isLeft = true;
            } else if (screen.orientation.type.includes('landscape-secondary')) {
                isRight = true;
            }
        }

        if (!isLeft && !isRight) {
            const normalized = ((angle % 360) + 360) % 360;
            if (normalized === 90) {
                isLeft = true;
            } else if (normalized === 270) {
                isRight = true;
            }
        }

        if (!isLeft && !isRight) {
            isLeft = true;
        }

        body.classList.toggle('landscape-left', isLeft);
        body.classList.toggle('landscape-right', isRight);

        this.applyLandscapeControlSpacing(isLandscape);
    }

    applyLandscapeControlSpacing(isLandscape) {
        const mainControls = document.querySelector('.main-controls');
        if (!mainControls) return;
        if (isLandscape) {
            mainControls.style.gap = 'clamp(16px, 4vw, 32px)';
        } else {
            mainControls.style.gap = '';
        }
    }

    updateMirrorState() {
        if (!this.videoEl) return;
        const shouldMirror = this.facingMode === 'user';
        this.videoEl.classList.toggle('mirror', shouldMirror);
    }

    handleKeyboard(e) {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (this.state !== 'stopped') {
                    this.togglePause();
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (this.state !== 'stopped' && !this.isCapturingPhoto) {
                    this.capturePhoto();
                }
                break;
            case 'Escape':
                e.preventDefault();
                // Close any open overlay
                document.getElementById('stop-confirmation')?.remove();
                break;
        }
    }

    // Photo history
    addPhotoToHistory(dataUrl, photoId) {
        this.photos.push({ dataUrl, photoId, time: Date.now() });
        this.renderPhotoHistory();
    }

    renderPhotoHistory() {
        if (!this.photoHistoryEl) return;

        this.photoHistoryEl.innerHTML = this.photos.map((p, i) => `
            <div class="photo-thumb" title="Foto ${i + 1}">
                <img src="${p.dataUrl}" alt="Foto ${i + 1}">
                <span class="photo-thumb-num">${i + 1}</span>
            </div>
        `).join('');

        // Scroll to end
        this.photoHistoryEl.scrollLeft = this.photoHistoryEl.scrollWidth;
    }

    clearPhotoHistory() {
        this.photos = [];
        if (this.photoHistoryEl) {
            this.photoHistoryEl.innerHTML = '';
        }
    }

    toggleStartStop() {
        if (this.state === 'stopped') {
            this.requestFullscreenOnMobile();
            this.start();
        } else {
            // Pausar y mostrar modal de confirmación
            if (this.state === 'recording') {
                this.togglePause(); // Pausar primero
            }
            this.showStopModal();
        }
    }

    showStopModal() {
        if (this.stopModalTitle) {
            this.stopModalTitle.textContent = '¿Qué quieres hacer?';
        }
        if (this.stopModalSubtitle) {
            this.stopModalSubtitle.textContent = 'La grabación está pausada';
        }
        if (this.modalContinue) {
            this.modalContinue.style.display = '';
        }
        this.stopModal.style.display = 'flex';
    }

    hideStopModal() {
        this.stopModal.style.display = 'none';
    }

    showLimitModal() {
        if (this.stopModalTitle) {
            this.stopModalTitle.textContent = 'Te quedaste sin minutos';
        }
        if (this.stopModalSubtitle) {
            this.stopModalSubtitle.textContent = 'Puedes procesar o descartar esta grabación';
        }
        if (this.modalContinue) {
            this.modalContinue.style.display = 'none';
        }
        this.stopModal.style.display = 'flex';
    }

    startSessionLimitWatch() {
        if (!this.recordingLimitSeconds || !this.projectStartAtMs) return;
        if (this.sessionLimitTimer) {
            clearInterval(this.sessionLimitTimer);
        }

        this.sessionLimitTimer = setInterval(() => {
            if (this.sessionLimitReached || this.state === 'stopped') return;
            const serverNow = Date.now() + this.serverTimeOffset;
            const limitAt = this.projectStartAtMs + (this.recordingLimitSeconds * 1000);
            if (serverNow >= limitAt) {
                this.sessionLimitReached = true;
                if (this.state === 'recording') {
                    this.togglePause();
                }
                this.showLimitModal();
            }
        }, 3000);
    }

    clearSessionLimitWatch() {
        if (this.sessionLimitTimer) {
            clearInterval(this.sessionLimitTimer);
            this.sessionLimitTimer = null;
        }
        this.sessionLimitReached = false;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    formatCountdown(msRemaining) {
        const totalMinutes = Math.max(0, Math.floor(msRemaining / 60000));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        return parts.join(' ');
    }

    showNoMinutesModal(resetAtIso) {
        if (!this.noMinutesModal) return;
        if (this.noMinutesTitle) {
            this.noMinutesTitle.textContent = 'Sin minutos disponibles';
        }
        if (this.noMinutesSubtitle) {
            this.noMinutesSubtitle.textContent = 'Te quedaste sin minutos de grabación.';
        }
        if (this.noMinutesTimer) {
            clearInterval(this.noMinutesTimer);
            this.noMinutesTimer = null;
        }

        const updateCountdown = () => {
            if (!this.noMinutesCountdown) return;
            if (!resetAtIso) {
                this.noMinutesCountdown.textContent = 'Tu admin debe resetear tu cuota.';
                return;
            }
            const resetAt = Date.parse(resetAtIso);
            if (Number.isNaN(resetAt)) {
                this.noMinutesCountdown.textContent = 'Tu admin debe resetear tu cuota.';
                return;
            }
            const remainingMs = resetAt - (Date.now() + this.serverTimeOffset);
            if (remainingMs <= 0) {
                this.noMinutesCountdown.textContent = 'Ya puedes grabar.';
                if (this.noMinutesTimer) {
                    clearInterval(this.noMinutesTimer);
                    this.noMinutesTimer = null;
                }
                return;
            }
            const formatted = this.formatCountdown(remainingMs);
            this.noMinutesCountdown.textContent = `Se reinicia en ${formatted}`;
        };

        updateCountdown();
        if (resetAtIso) {
            this.noMinutesTimer = setInterval(updateCountdown, 60000);
        }

        this.noMinutesModal.style.display = 'flex';
    }

    hideNoMinutesModal() {
        if (!this.noMinutesModal) return;
        if (this.noMinutesTimer) {
            clearInterval(this.noMinutesTimer);
            this.noMinutesTimer = null;
        }
        this.noMinutesModal.style.display = 'none';
    }

    async finishRecording() {
        this.hideStopModal();
        this.showFinalizingOverlay();
        await this.stop();
    }

    async discardRecording() {
        this.hideStopModal();
        await this.cancelRecording();
    }

    continueRecording() {
        this.hideStopModal();
        // Queda pausado, el usuario debe presionar START/play para continuar
        showToast('Grabación pausada. Presiona play para continuar.', 'info', 3000);
    }

    async cancelRecording() {
        // Detener todo sin procesar
        this.state = 'stopped';
        this.stopTimer();
        this.stopChunkCycle();
        this.mediaRecorder = null;
        this.audioStream = null;

        // Detener cámara
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoEl.srcObject = null;
        }

        // Eliminar proyecto del servidor
        if (this.projectId) {
            try {
                await fetch(`/api/project/${this.projectId}`, {
                    method: 'DELETE'
                });
            } catch (err) {
                console.warn('Error deleting project:', err);
            }
            this.projectId = null;
        }

        // Resetear UI
        this.projectInput.disabled = false;
        this.nameInputConfig.disabled = false;
        this.transcriptEl.textContent = '';
        this.clearPhotoHistory();
        this.exitFullscreen();
        this.clearSessionLimitWatch();
        this.recordingLimitSeconds = null;
        this.recordingTotalSeconds = null;
        this.updateUI();

        showToast('Grabación descartada', 'info', 3000);
    }

    requestFullscreenOnMobile() {
        const minSide = Math.min(window.innerWidth, window.innerHeight);
        if (minSide > 900) return;

        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    async switchCamera() {
        if (!this.stream) return;

        // Cambiar facing mode
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

        try {
            // Detener video track actual (mantener audio)
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
            }

            // Obtener nuevo video track con la otra cámara
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode },
                audio: false
            });

            // Reemplazar video track
            const newVideoTrack = newStream.getVideoTracks()[0];
            this.stream.removeTrack(videoTrack);
            this.stream.addTrack(newVideoTrack);

            // Actualizar video element
            this.videoEl.srcObject = this.stream;
            this.updateMirrorState();

        } catch (err) {
            console.error('Error switching camera:', err);
            // Revertir facing mode si falla
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
            showToast('No se pudo cambiar de cámara', 'error');
        }
    }

    // Edición de nombre inline (desktop)
    startEditingName() {
        if (this.isEditingName || this.state !== 'stopped') return;
        
        this.isEditingName = true;
        this.nameTag.classList.add('editing');
        this.nameTag.classList.remove('placeholder');
        
        const currentName = this.savedName || '';
        this.nameTag.innerHTML = `
            <input type="text" class="name-tag-input" 
                   value="${currentName}" 
                   placeholder="Nombre" 
                   maxlength="20"
                   autofocus>
        `;
        
        const input = this.nameTag.querySelector('.name-tag-input');
        input.focus();
        input.select();
        
        input.addEventListener('blur', () => this.finishEditingName(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.finishEditingName(this.savedName || '');
            }
        });
    }

    finishEditingName(value) {
        if (!this.isEditingName) return;
        
        this.isEditingName = false;
        this.nameTag.classList.remove('editing');
        
        const name = value.trim().toUpperCase();
        this.savedName = name || null;
        
        if (name) {
            localStorage.setItem('hilo_name', name);
        } else {
            localStorage.removeItem('hilo_name');
        }
        
        this.updateNameTagDisplay();
        this.nameInputConfig.value = name;
    }

    // Input de nombre en config (mobile)
    onNameConfigInput() {
        const name = this.nameInputConfig.value.trim().toUpperCase();
        this.nameInputConfig.value = name;
        this.savedName = name || null;
        this.updateNameTagDisplay();
    }

    saveNameFromConfig() {
        const name = this.nameInputConfig.value.trim().toUpperCase();
        this.savedName = name || null;
        
        if (name) {
            localStorage.setItem('hilo_name', name);
        } else {
            localStorage.removeItem('hilo_name');
        }
        
        this.updateNameTagDisplay();
    }

    updateNameTagDisplay() {
        if (this.savedName) {
            this.nameTag.classList.remove('placeholder');
            this.nameTag.innerHTML = `
                <span class="name-tag-text">${this.savedName}</span>
                <i class="bi bi-pencil-fill name-tag-icon"></i>
            `;
        } else {
            this.nameTag.classList.add('placeholder');
            this.nameTag.innerHTML = `
                <span class="name-tag-text">Nombre</span>
                <i class="bi bi-pencil-fill name-tag-icon"></i>
            `;
        }
    }

    loadName() {
        const saved = localStorage.getItem('hilo_name');
        if (saved) {
            this.savedName = saved;
            this.nameInputConfig.value = saved;
        }
        this.updateNameTagDisplay();
    }

    loadPhotoDelay() {
        const saved = localStorage.getItem('hilo_photo_delay');
        if (saved !== null) {
            const val = parseInt(saved, 10);
            if (!isNaN(val) && val >= 0 && val <= 10) {
                this.photoDelay = val;
            }
        }
        this.updateDelayDisplay();
    }

    adjustDelay(delta) {
        this.photoDelay = Math.max(0, Math.min(10, this.photoDelay + delta));
        this.updateDelayDisplay();
        localStorage.setItem('hilo_photo_delay', this.photoDelay.toString());
    }

    updateDelayDisplay() {
        this.delayValueEl.textContent = this.photoDelay;
    }

    getPhotoDelay() {
        return this.photoDelay;
    }

    loadStylizePreference() {
        if (!this.stylizeToggle) {
            this.stylizePhotos = false;
            return;
        }
        const saved = localStorage.getItem('hilo_stylize_photos');
        if (saved !== null) {
            this.stylizePhotos = saved === 'true';
        }
        this.stylizeToggle.checked = this.stylizePhotos;
    }

    toggleStylize() {
        if (!this.stylizeToggle) {
            this.stylizePhotos = false;
            return;
        }
        this.stylizePhotos = this.stylizeToggle.checked;
        localStorage.setItem('hilo_stylize_photos', this.stylizePhotos.toString());
    }

    toggleSettingsPanel() {
        this.photoConfig.classList.toggle('visible');
        this.btnSettings.classList.toggle('active');
    }

    closeSettingsPanel() {
        this.photoConfig.classList.remove('visible');
        this.btnSettings.classList.remove('active');
    }

    startLongPress(e) {
        if (this.state === 'stopped') return;
        
        this.longPressTriggered = false;
        this.longPressTimer = setTimeout(() => {
            this.longPressTriggered = true;
            this.togglePause();
            // Vibración táctil si está disponible
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, this.longPressDuration);
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    async start() {
        // Validate name
        if (!this.savedName) {
            showToast('Ingresa un nombre primero', 'warning');
            // En mobile, abrir el panel de config
            if (window.innerWidth <= 700) {
                this.photoConfig.classList.add('visible');
                this.btnSettings.classList.add('active');
                this.nameInputConfig.focus();
            } else {
                this.startEditingName();
            }
            return;
        }

        if (!this.projectInput.value.trim()) {
            showToast('Ingresa un nombre para el proyecto', 'warning');
            this.projectInput.focus();
            return;
        }

        try {
            // 1. Primero verificar y obtener cámara/micrófono ANTES de crear el proyecto
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Cámara no disponible.', 'error', 8000);
                return;
            }

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode },
                audio: true
            });

            // Setup audio recording
            this.audioStream = new MediaStream(this.stream.getAudioTracks());
            this.mimeType = this.findSupportedMimeType();
            
            if (!this.mimeType) {
                // Detener stream si no hay soporte de audio
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
                showToast('Navegador no soporta grabación de audio', 'error');
                return;
            }

            // 2. Ahora que tenemos cámara, crear el proyecto
            const projectRes = await fetch('/api/project/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: this.projectInput.value.trim(),
                    participant_name: this.savedName
                })
            });
            const projectData = await projectRes.json();
            
            if (!projectData.ok) {
                // Detener stream si falla la creación del proyecto
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
                if (projectData.recording_remaining_seconds === 0) {
                    this.showNoMinutesModal(projectData.recording_reset_at);
                } else {
                    showToast(`Error creando proyecto: ${projectData.error}`, 'error');
                }
                return;
            }

            this.projectId = projectData.project_id;
            this.hideNoMinutesModal();
            this.projectStartAtMs = projectData.recording_started_at ? Date.parse(projectData.recording_started_at) : null;
            const serverNow = projectData.server_now ? Date.parse(projectData.server_now) : null;
            if (serverNow) {
                this.serverTimeOffset = serverNow - Date.now();
            }
            this.recordingLimitSeconds = projectData.recording_remaining_seconds ?? null;
            this.recordingTotalSeconds = projectData.recording_total_seconds ?? null;
            this.sessionLimitReached = false;
            this.chunkIndex = 0;
            console.log('Project created:', this.projectId);

            // 3. Iniciar grabación
            this.videoEl.srcObject = this.stream;
            this.updateMirrorState();

            this.state = 'recording';
            this.startTime = Date.now();
            this.startTimePerf = performance.now();
            this.pausedElapsed = 0;
            this.transcriptEl.textContent = '';
            this.projectInput.disabled = true;
            this.nameInputConfig.disabled = true;

            // Clear photo history
            this.clearPhotoHistory();

            this.updateUI();
            this.startTimer();
            this.startChunkCycle();
            this.startSessionLimitWatch();

        } catch (err) {
            console.error('Error starting:', err);
            // Limpiar stream si hubo error
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            showToast('Error al iniciar. Verifica permisos de cámara/micrófono.', 'error');
        }
    }

    findSupportedMimeType() {
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus'
        ];
        
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Using mime type:', type);
                return type;
            }
        }
        return null;
    }

    startChunkCycle() {
        const intervalMs = this.chunkDuration * 1000;
        
        this.chunkCycleInterval = setInterval(() => {
            if (this.state === 'recording') {
                this.recordOneChunk();
            }
        }, intervalMs);
        
        // Start first chunk immediately
        this.recordOneChunk();
    }

    stopChunkCycle() {
        if (this.chunkCycleInterval) {
            clearInterval(this.chunkCycleInterval);
            this.chunkCycleInterval = null;
        }
        
        // Return a promise that resolves when current chunk finishes
        return new Promise((resolve) => {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                let resolved = false;
                const timeoutId = setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    console.warn('Final chunk timeout, continuing without last chunk');
                    resolve();
                }, 3000);

                // Set up a one-time listener for when recording finishes
                const originalOnStop = this.mediaRecorder.onstop;
                this.mediaRecorder.onstop = async (e) => {
                    if (originalOnStop) await originalOnStop(e);
                    // Wait a bit for sendChunk to complete
                    await this.waitForPendingChunks();
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                try {
                    this.mediaRecorder.requestData();
                } catch (err) {
                    console.warn('requestData failed:', err);
                }
                this.mediaRecorder.stop();
            } else {
                // No active recorder, wait for pending chunks
                this.waitForPendingChunks().then(resolve);
            }
        });
    }

    waitForPendingChunks() {
        return new Promise((resolve) => {
            const check = () => {
                if (this.pendingChunks <= 0) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    recordOneChunk() {
        if (!this.audioStream || this.state !== 'recording') return;

        const chunks = [];
        const recorder = new MediaRecorder(this.audioStream, {
            mimeType: this.mimeType,
            audioBitsPerSecond: 64000
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstop = async () => {
            if (chunks.length > 0) {
                const blob = new Blob(chunks, { type: this.mimeType });
                if (blob.size > 500) {
                    await this.sendChunk(blob);
                }
            }
        };

        recorder.start();
        this.mediaRecorder = recorder;

        // Stop slightly before next cycle to get complete file
        const recordMs = (this.chunkDuration * 1000) - 500;
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, recordMs);
    }

    async sendChunk(blob) {
        if (!this.projectId) return;
        
        const currentIndex = this.chunkIndex++;
        this.pendingChunks++;
        
        console.log(`Sending chunk ${currentIndex}, size: ${blob.size}`);

        const formData = new FormData();
        formData.append('project_id', this.projectId);
        formData.append('chunk_index', currentIndex.toString());
        formData.append('file', blob, `chunk_${currentIndex}.webm`);

        try {
            const response = await fetch('/api/audio/chunk', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            this.pendingChunks--;

            if (data.ok && data.text) {
                this.appendTranscript(data.text);
            } else if (!data.ok) {
                console.warn('Chunk error:', data.error);
                if (data.error && data.error.includes('ffmpeg')) {
                    showToast('ffmpeg no instalado', 'error', 8000);
                } else if (data.error && data.error.toLowerCase().includes('tiempo de grabación')) {
                    this.sessionLimitReached = true;
                    if (this.state === 'recording') {
                        this.togglePause();
                    }
                    this.showLimitModal();
                }
            }
        } catch (err) {
            this.pendingChunks--;
            console.error('Error sending chunk:', err);
        }
    }

    appendTranscript(text) {
        if (!text.trim()) return;
        
        if (this.transcriptEl.textContent) {
            this.transcriptEl.textContent += ' ';
        }
        this.transcriptEl.textContent += text.trim();
        this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
    }

    togglePause() {
        if (this.state === 'recording') {
            this.state = 'paused';
            this.pausedElapsed = Date.now() - this.startTime;
            this.stopTimer(false);
            this.stopChunkCycle();
        } else if (this.state === 'paused') {
            this.requestFullscreenOnMobile();
            this.state = 'recording';
            this.startTime = Date.now() - this.pausedElapsed;
            this.startTimePerf = performance.now() - this.pausedElapsed;
            this.startTimer();
            this.startChunkCycle();
        }
        this.updateUI();
    }

    async stop() {
        this.state = 'stopped';
        this.stopTimer();
        this.updateUI();
        this.exitFullscreen();
        this.clearSessionLimitWatch();
        this.recordingLimitSeconds = null;
        this.recordingTotalSeconds = null;

        this.statusEl.textContent = 'Procesando último chunk...';

        // Wait for current chunk to finish recording and processing
        await this.stopChunkCycle();
        this.mediaRecorder = null;
        this.audioStream = null;

        // Stop tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoEl.srcObject = null;
        }

        // Notify backend and start job
        if (this.projectId) {
            try {
                const res = await fetch('/api/project/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        project_id: this.projectId,
                        participant_name: this.savedName || 'ACTOR',
                        project_name: this.projectInput.value.trim(),
                        stylize_photos: this.stylizePhotos
                    })
                });
                
                const data = await res.json();
                
                if (data.ok) {
                    this.hideFinalizingOverlay();
                    this.showStopConfirmation();
                } else {
                    this.hideFinalizingOverlay();
                    showToast(data.error || 'Error al procesar', 'error');
                }
            } catch (err) {
                this.hideFinalizingOverlay();
                console.warn('Error stopping project:', err);
                showToast('Error de conexión', 'error');
            }
            this.projectId = null;
        }

        // Re-enable inputs
        this.projectInput.disabled = false;
        this.nameInputConfig.disabled = false;

        this.updateUI();
    }

    showStopConfirmation() {
        const overlay = document.createElement('div');
        overlay.id = 'stop-confirmation';
        overlay.className = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-card">
                <div class="stop-icon">
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <h2>¡Grabación guardada!</h2>
                <p>Puedes ver el estado de tu guion en la sección de Proyectos.</p>
                <div class="stop-actions">
                    <a href="/projects" class="btn-result primary">
                        <i class="bi bi-folder2-open"></i>
                        Ir a Proyectos
                    </a>
                    <button class="btn-result secondary" onclick="document.getElementById('stop-confirmation').remove()">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    showFinalizingOverlay() {
        const existing = document.getElementById('finalizing-overlay');
        if (existing) {
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = 'finalizing-overlay';
        overlay.className = 'processing-overlay finalizing-overlay';
        overlay.innerHTML = `
            <div class="processing-card">
                <div class="processing-spinner"></div>
                <h2>Procesando último chunk</h2>
                <p>No cierres esta ventana todavía</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideFinalizingOverlay() {
        const overlay = document.getElementById('finalizing-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    async capturePhoto() {
        if (this.state === 'stopped' || this.isCapturingPhoto) return;
        
        this.isCapturingPhoto = true;
        this.btnPhoto.disabled = true;

        const delay = this.getPhotoDelay();
        if (delay > 0) {
            await this.showCountdown(delay);
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.videoEl.videoWidth;
        canvas.height = this.videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoEl, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // Calculate timestamp
        const tMs = Math.round(performance.now() - this.startTimePerf);

        const photoId = generateUUID();

        this.showFlash();

        try {
            const res = await fetch('/api/photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: this.projectId,
                    photo_id: photoId,
                    t_ms: tMs,
                    data_url: dataUrl
                })
            });

            const data = await res.json();

            if (data.ok) {
                showToast('Foto capturada', 'success', 2000);
                this.addPhotoToHistory(dataUrl, photoId);
            } else {
                showToast(data.error || 'Error al guardar foto', 'error');
                if (data.error && data.error.toLowerCase().includes('tiempo de grabación')) {
                    this.sessionLimitReached = true;
                    if (this.state === 'recording') {
                        this.togglePause();
                    }
                    this.showLimitModal();
                }
            }
        } catch (err) {
            console.error('Error sending photo:', err);
            showToast('Error al enviar foto', 'error');
        }

        this.isCapturingPhoto = false;
        this.btnPhoto.disabled = this.state === 'stopped';
    }

    showCountdown(seconds) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'countdown-overlay';
            overlay.innerHTML = `<div class="countdown-number">${seconds}</div>`;
            document.body.appendChild(overlay);

            const numberEl = overlay.querySelector('.countdown-number');
            let count = seconds;

            const tick = () => {
                if (count > 0) {
                    numberEl.textContent = count;
                    numberEl.classList.remove('countdown-pop');
                    void numberEl.offsetWidth; // Trigger reflow
                    numberEl.classList.add('countdown-pop');
                    count--;
                    setTimeout(tick, 1000);
                } else {
                    overlay.remove();
                    resolve();
                }
            };

            tick();
        });
    }

    showFlash() {
        const flash = document.createElement('div');
        flash.className = 'photo-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
    }

    showProcessingOverlay() {
        this.hideProcessingOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'processing-overlay';
        overlay.className = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-card">
                <div class="processing-spinner"></div>
                <h2>Procesando...</h2>
                <p>Generando tu guion con IA</p>
                <div class="processing-link" style="display: none;">
                    <a href="#" target="_blank" class="btn-result">
                        <i class="bi bi-box-arrow-up-right"></i>
                        Ver resultado
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    updateProcessingOverlay(resultUrl, projectId) {
        const overlay = document.getElementById('processing-overlay');
        if (!overlay) return;

        const linkContainer = overlay.querySelector('.processing-link');
        const link = overlay.querySelector('.btn-result');
        
        link.href = resultUrl;
        linkContainer.style.display = 'block';

        // Start polling for status
        this.pollJobStatus(projectId, resultUrl);
    }

    async pollJobStatus(projectId, resultUrl) {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/project/${projectId}/status`);
                const data = await res.json();

                if (data.ok) {
                    if (data.status === 'done') {
                        this.hideProcessingOverlay();
                        showToast('¡Guion generado!', 'success');
                        window.open(resultUrl, '_blank');
                    } else if (data.status === 'error') {
                        this.hideProcessingOverlay();
                        showToast(data.error || 'Error al generar guion', 'error');
                    } else {
                        // Still processing, check again
                        setTimeout(checkStatus, 2000);
                    }
                }
            } catch (err) {
                console.warn('Polling error:', err);
                setTimeout(checkStatus, 3000);
            }
        };

        setTimeout(checkStatus, 2000);
    }

    hideProcessingOverlay() {
        const overlay = document.getElementById('processing-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    updateUI() {
        this.btnPause.disabled = this.state === 'stopped';
        this.btnPhoto.disabled = this.state === 'stopped' || this.isCapturingPhoto;
        if (this.btnPhotoMobile) {
            this.btnPhotoMobile.disabled = this.state === 'stopped' || this.isCapturingPhoto;
        }
        if (this.btnSwitchCamera) {
            this.btnSwitchCamera.disabled = this.state === 'stopped';
        }

        // Actualizar icono y texto de pause/resume
        const pauseIcon = this.btnPause.querySelector('.btn-icon-mobile');
        const pauseText = this.btnPause.querySelector('.btn-text-desktop');
        if (this.state === 'paused') {
            if (pauseIcon) pauseIcon.className = 'bi bi-play-fill btn-icon-mobile';
            if (pauseText) pauseText.textContent = 'RESUME';
            this.btnPause.classList.add('paused');
        } else {
            if (pauseIcon) pauseIcon.className = 'bi bi-pause-fill btn-icon-mobile';
            if (pauseText) pauseText.textContent = 'PAUSA';
            this.btnPause.classList.remove('paused');
        }

        // Actualizar icono y texto de start/stop
        const startIcon = this.btnStart.querySelector('.btn-icon-mobile');
        const startText = this.btnStart.querySelector('.btn-text-desktop');
        if (this.state === 'stopped') {
            if (startIcon) startIcon.className = 'bi bi-play-fill btn-icon-mobile';
            if (startText) startText.textContent = 'START';
            this.btnStart.classList.remove('recording');
            document.body.classList.remove('is-recording');
        } else {
            if (startIcon) startIcon.className = 'bi bi-stop-fill btn-icon-mobile';
            if (startText) startText.textContent = 'STOP';
            this.btnStart.classList.add('recording');
            document.body.classList.add('is-recording');
        }

        // Actualizar indicador de estado (desktop)
        this.statusEl.className = 'status';
        
        if (this.state === 'recording') {
            this.statusEl.textContent = 'REC';
            this.statusEl.classList.add('recording');
        } else if (this.state === 'paused') {
            this.statusEl.textContent = 'PAUSA';
            this.statusEl.classList.add('paused');
        } else {
            this.statusEl.textContent = '';
        }

        const body = document.body;
        if (body) {
            const isLandscape = body.classList.contains('is-landscape');
            this.applyLandscapeControlSpacing(isLandscape);
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.startTime) return;
            const elapsed = Date.now() - this.startTime;
            const elapsedSeconds = Math.floor(elapsed / 1000);
            const elapsedStr = this.formatTime(elapsedSeconds);
            let display = elapsedStr;
            if (this.recordingLimitSeconds !== null && this.recordingLimitSeconds !== undefined) {
                const remainingSeconds = Math.max(
                    0,
                    this.recordingLimitSeconds - elapsedSeconds
                );
                const remainingStr = this.formatTime(remainingSeconds);
                display = `${elapsedStr} - ${remainingStr}`;
            }
            this.timerEl.textContent = display;
            if (this.mobileTimerEl) this.mobileTimerEl.textContent = display;
        }, 100);
    }

    stopTimer(reset = true) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (reset) {
            this.timerEl.textContent = '00:00';
            if (this.mobileTimerEl) this.mobileTimerEl.textContent = '00:00';
        }
    }
}

export { showToast, generateUUID, HiloApp };
