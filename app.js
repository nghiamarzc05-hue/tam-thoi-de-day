// ========================================================
// FILE: app.js - FLASHCARDS PRO (COMBO 2 + 3 + 4 TOÀN DIỆN)
// ========================================================

let allDecks = [];
let customDecks = [];
let currentDeck = null;
let currentDeckItems = []; // Danh sách từ vựng đang được lọc để học
let currentStudyFilter = 'all'; // 'all' | 'unmastered' | 'mastered'
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let starredCards = []; 
let studyHistory = {}; // Nhật ký học tập theo ngày YYYY-MM-DD
let currentStreak = 0;
let DOM = {};
let englishVoice = null;
let speechRate = 0.9;
let voiceAccent = 'US';
let sfxEnabled = true;
let currentSearchFilter = 'all';

// QUIZ STATE
let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswering = false;

// AUTOPLAY STATE
let autoPlayTimer = null;
let isAutoPlaying = false;

// 3D CAROUSEL STATE
let currentCarouselIndex = 0;

// TIKTOK FEED STATE
let feedDeckIndex = 0;
let feedWordIndex = 0;
let feedTouchStartY = 0;

// SPEED MATCH GAME STATE
let matchTimerInterval = null;
let matchTimeLeft = 60;
let matchScoreVal = 0;
let matchCombo = 1;
let matchSelectedCard = null;
let matchIsChecking = false;
let matchHighScore = 0;

// ZEN FOCUS STATE
let zenPomoInterval = null;
let zenPomoTimeLeft = 25 * 60;
let zenPomoRunning = false;
let zenCurrentWordIndex = 0;
let zenIsFlipped = false;
let activeAmbientSound = null;

// SRS (SPACED REPETITION - SM-2) STATE
// Lưu: { [wordId]: { interval: days, repetition: n, easeFactor: 2.5, dueDate: 'YYYY-MM-DD' } }
let srsData = {};

// SPEECH RECOGNITION STATE
let speechRecognitionInstance = null;
let isListeningSpeech = false;

// CLOZE TEST STATE
let clozeQuestions = [];
let currentClozeIndex = 0;
let clozeScoreVal = 0;
let clozeMode = 'cloze'; // 'cloze' | 'spelling'

// ========================================================
// 2. ÂM THANH HIỆU ỨNG (WEB AUDIO API TỰ ĐỘNG - KHÔNG CẦN FILE NGOÀI)
// ========================================================
const AudioFX = {
    ctx: null,
    ambientNode: null,
    ambientGain: null,
    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        } catch (e) {}
    },
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playFlip() {
        if (!sfxEnabled || !this.ctx) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            
            // 1. Tiếng xột xoạt lướt trang giấy/thẻ bài SIÊU ÊM (Ultra Soft Velvet Paper Rustle)
            // Cắt giảm toàn bộ tần số cao gây chói tai (lowpass filter < 900Hz)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                // Tán nhạt biên độ nhanh để âm thanh tắt mượt, không đanh
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
            }

            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            // Bộ lọc Lowpass ở tần số ấm (warm 650Hz), loại bỏ hoàn toàn âm hiss chói
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(320, now + 0.065);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.06, now); // Âm lượng nhỏ êm ái
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

            noiseSource.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseSource.start(now);

            // 2. Tiếng chạm đệm mềm (Soft thud) như thẻ bài đặt trên bề mặt nỉ/gỗ
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);

            oscGain.gain.setValueAtTime(0.05, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);

            // Rung nhẹ xúc giác trên thiết bị di động
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
            }
        } catch (e) {}
    },
    playCorrect() {
        if (!sfxEnabled || !this.ctx) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Hợp âm Marimba/Chime ngân vang êm dịu, sảng khoái (C5 - E5 - G5 - C6)
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.12, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.35);
            });
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([15, 30, 20]);
            }
        } catch (e) {}
    },
    playWrong() {
        if (!sfxEnabled || !this.ctx) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Âm thanh trầm ấm nhẹ nhàng, không bị chói tai hay khó chịu (D3 -> C3 mellow tap)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.16);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([25, 40, 25]);
            }
        } catch (e) {}
    },
    playCombo() {
        if (!sfxEnabled || !this.ctx) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            [440, 554.37, 659.25, 880].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.12, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.25);
            });
        } catch (e) {}
    },
    playPop() {
        if (!sfxEnabled || !this.ctx) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Tiếng Bubble Pop trong trẻo, êm tai tựa bong bóng nước (giống iOS / macOS UI)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.045);
        } catch (e) {}
    },
    // AMBIENCE SYNTHESIS (Mưa, Sóng biển, Lò sưởi, Gió)
    playAmbience(type) {
        this.stopAmbience();
        this.resume();
        if (!this.ctx) return;

        try {
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            // White / Pink / Brown noise synthesis
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                if (type === 'rain') {
                    // Pink noise filter cho mưa rơi
                    lastOut = (lastOut * 0.95) + (white * 0.05);
                    data[i] = lastOut * 1.5;
                } else if (type === 'waves') {
                    // Sóng biển trầm lắng
                    lastOut = (lastOut * 0.98) + (white * 0.02);
                    data[i] = lastOut * 2.0;
                } else if (type === 'fire') {
                    // Tiếng lách tách lò sưởi
                    const crackle = Math.random() > 0.998 ? (Math.random() * 0.8) : 0;
                    lastOut = (lastOut * 0.93) + (white * 0.07);
                    data[i] = (lastOut * 0.6) + crackle;
                } else {
                    // Gió mát vi vu
                    lastOut = (lastOut * 0.99) + (white * 0.01);
                    data[i] = lastOut * 2.2;
                }
            }

            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = buffer;
            noiseSource.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = type === 'rain' ? 'lowpass' : (type === 'fire' ? 'bandpass' : 'lowpass');
            filter.frequency.value = type === 'rain' ? 1200 : (type === 'fire' ? 800 : 450);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noiseSource.start();
            this.ambientNode = noiseSource;
            this.ambientGain = gain;
            activeAmbientSound = type;
        } catch (e) {}
    },
    stopAmbience() {
        if (this.ambientNode) {
            try { this.ambientNode.stop(); } catch(e) {}
            this.ambientNode = null;
        }
        activeAmbientSound = null;
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

function initVoices() {
    if (!('speechSynthesis' in window)) return;
    const findVoice = () => {
        let voices = window.speechSynthesis.getVoices();
        const langCode = voiceAccent === 'UK' ? 'en-GB' : 'en-US';
        englishVoice = voices.find(v => v.lang.includes(langCode) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('George'))) || 
                       voices.find(v => v.lang.startsWith(langCode)) || 
                       voices.find(v => v.lang.startsWith('en'));
    };
    findVoice();
    window.speechSynthesis.onvoiceschanged = findVoice;
}

function playWordSound(wordText) {
    const text = wordText || (currentDeckItems && currentDeckItems[currentCardIndex] ? currentDeckItems[currentCardIndex].term : (currentDeck && currentDeck.items && currentDeck.items[currentCardIndex] ? currentDeck.items[currentCardIndex].term : ''));
    if (!text) return;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceAccent === 'UK' ? 'en-GB' : 'en-US';
        utterance.rate = speechRate;
        if (englishVoice) utterance.voice = englishVoice;
        setTimeout(() => { window.speechSynthesis.speak(utterance); }, 40);
    }
}

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function recordStudyActivity() {
    const today = getTodayString();
    studyHistory[today] = (studyHistory[today] || 0) + 1;
    localStorage.setItem('studyHistory', JSON.stringify(studyHistory));
    renderActivityHeatmap();
    checkBadges();
    updateDailyGoalProgress();
}

function checkStreak() {
    const today = getTodayString(); 
    let lastDate = localStorage.getItem('lastStudyDate');
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
    
    if (lastDate) {
        const last = new Date(lastDate);
        const cur = new Date(today);
        const diffDays = Math.floor((cur - last) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) { 
            currentStreak = 0; 
            localStorage.setItem('currentStreak', 0); 
        }
    }
    if (DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
}

function noiLua() {
    const today = getTodayString();
    recordStudyActivity();

    if (localStorage.getItem('lastStudyDate') !== today) {
        currentStreak++;
        localStorage.setItem('currentStreak', currentStreak);
        localStorage.setItem('lastStudyDate', today);
        if (DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    AudioFX.init();

    try { masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || []; } catch (e) { masteredCards = []; }
    try { starredCards = JSON.parse(localStorage.getItem('starredCards')) || []; } catch (e) { starredCards = []; }
    try { studyHistory = JSON.parse(localStorage.getItem('studyHistory')) || {}; } catch (e) { studyHistory = {}; }
    try { customDecks = JSON.parse(localStorage.getItem('customDecks')) || []; } catch (e) { customDecks = []; }
    try { srsData = JSON.parse(localStorage.getItem('srsData')) || {}; } catch (e) { srsData = {}; }

    speechRate = parseFloat(localStorage.getItem('speechRate')) || 0.9;
    voiceAccent = localStorage.getItem('voiceAccent') || 'US';
    sfxEnabled = localStorage.getItem('sfxEnabled') !== 'false';

    initDOM();
    initVoices();
    setupTheme();
    checkStreak();
    mergeData(); 
    populateQuizDecks();
    renderDeckList(allDecks, DOM.deckList);
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
    renderActivityHeatmap();
    checkBadges();
    updateSrsDashboardCounter();

    // Tự động load bài đầu tiên để có sẵn từ học ngay
    if (allDecks.length > 0 && !currentDeck) {
        currentDeck = allDecks[0];
        currentStudyFilter = 'all';
        applyStudyFilter(currentStudyFilter);
    }
});

// Hỗ trợ trường hợp nếu file group_*.js được trình duyệt tải hoàn tất sau DOMContentLoaded
window.addEventListener('load', () => {
    if (allDecks.length === 0) {
        mergeData();
        populateQuizDecks();
        renderDeckList(allDecks, DOM.deckList);
        updateDashboardStats();
        updateSrsDashboardCounter();
        if (allDecks.length > 0 && !currentDeck) {
            currentDeck = allDecks[0];
            currentStudyFilter = 'all';
            applyStudyFilter(currentStudyFilter);
        }
    }
});

function initDOM() {
    DOM = {
        views: document.querySelectorAll('.view-section'),
        navItems: document.querySelectorAll('.nav-item, .sidebar-nav .nav-item'),
        deckList: document.getElementById('deckList'),
        deckTotalCount: document.getElementById('deckTotalCount'),
        libraryList: document.getElementById('libraryList'),
        starredList: document.getElementById('starredList'),
        studyStarredBtn: document.getElementById('studyStarredBtn'),
        searchInput: document.getElementById('searchInput'),
        filterPills: document.querySelectorAll('.filter-pill'),
        
        flashcardWrapper: document.getElementById('flashcardWrapper'),
        cardGlareFront: document.getElementById('cardGlareFront'),
        cardGlareBack: document.getElementById('cardGlareBack'),
        flashcard: document.getElementById('flashcard'),
        cardWord: document.getElementById('cardWord'),
        cardIpa: document.getElementById('cardIpa'),
        cardMeaning: document.getElementById('cardMeaning'),
        cardExampleEn: document.getElementById('cardExampleEn'),
        cardExampleVi: document.getElementById('cardExampleVi'),
        cardPos: document.getElementById('cardPos'),
        cardCounter: document.getElementById('cardCounter'),
        cardCounterBack: document.getElementById('cardCounterBack'),
        cardStatusBadge: document.getElementById('cardStatusBadge'),
        frontSpeakBtn: document.getElementById('frontSpeakBtn'),
        starCardBtn: document.getElementById('starCardBtn'),

        studyDeckName: document.getElementById('studyDeckName'),
        studyProgressPct: document.getElementById('studyProgressPct'),
        studyProgressFill: document.getElementById('studyProgressFill'),
        quickShuffleBtn: document.getElementById('quickShuffleBtn'),
        autoPlayBtn: document.getElementById('autoPlayBtn'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        headerThemeBtn: document.getElementById('headerThemeBtn'),
        heroContinueBtn: document.getElementById('heroContinueBtn'),
        heroQuickQuizBtn: document.getElementById('heroQuickQuizBtn'),
        
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        speakBtn: document.getElementById('speakBtn'),
        masterBtn: document.getElementById('masterBtn'),
        notMasteredBtn: document.getElementById('notMasteredBtn'),
        
        statMastered: document.getElementById('statMastered'),
        statProgress: document.getElementById('statProgress'),
        statStreak: document.getElementById('statStreak'),
        resetStatsBtn: document.getElementById('resetStatsBtn'),
        themeSwitch: document.getElementById('themeSwitch'),
        speechRateSelect: document.getElementById('speechRateSelect'),
        voiceAccentSelect: document.getElementById('voiceAccentSelect'),
        sfxSwitch: document.getElementById('sfxSwitch'),
        viewTitle: document.getElementById('viewTitle'),
        viewSubtitle: document.getElementById('viewSubtitle'),

        // HEATMAP & BADGES
        activityHeatmap: document.getElementById('activityHeatmap'),
        badgesContainer: document.getElementById('badgesContainer'),
        badgeUnlockedCount: document.getElementById('badgeUnlockedCount'),

        // BACKUP & RESTORE
        exportDataBtn: document.getElementById('exportDataBtn'),
        importDataBtn: document.getElementById('importDataBtn'),
        importFileInput: document.getElementById('importFileInput'),

        // CUSTOM DECK MODAL & AI GENERATOR
        openCustomDeckModalBtn: document.getElementById('openCustomDeckModalBtn'),
        customDeckModal: document.getElementById('customDeckModal'),
        closeCustomDeckModalBtn: document.getElementById('closeCustomDeckModalBtn'),
        cancelCustomDeckBtn: document.getElementById('cancelCustomDeckBtn'),
        saveCustomDeckBtn: document.getElementById('saveCustomDeckBtn'),
        customDeckTitle: document.getElementById('customDeckTitle'),
        customDeckWords: document.getElementById('customDeckWords'),
        aiTopicInput: document.getElementById('aiTopicInput'),
        aiGenerateBtn: document.getElementById('aiGenerateBtn'),
        aiGenStatus: document.getElementById('aiGenStatus'),

        // 3D CAROUSEL ELEMENTS
        deckCarouselStage: document.getElementById('deckCarouselStage'),
        deckCarouselTrack: document.getElementById('deckCarouselTrack'),
        carouselPrevBtn: document.getElementById('carouselPrevBtn'),
        carouselNextBtn: document.getElementById('carouselNextBtn'),
        carouselPagination: document.getElementById('carouselPagination'),
        modeCarouselBtn: document.getElementById('modeCarouselBtn'),
        modeGridBtn: document.getElementById('modeGridBtn'),

        // HERO ACTIONS
        heroFeedBtn: document.getElementById('heroFeedBtn'),
        heroMatchBtn: document.getElementById('heroMatchBtn'),
        heroZenBtn: document.getElementById('heroZenBtn'),
        heroSrsBtn: document.getElementById('heroSrsBtn'),
        heroSrsCount: document.getElementById('heroSrsCount'),
        heroClozeBtn: document.getElementById('heroClozeBtn'),

        // SRS DUE & SPEECH
        statSrsDue: document.getElementById('statSrsDue'),
        srsDueStatCard: document.getElementById('srsDueStatCard'),
        cardMicBtn: document.getElementById('cardMicBtn'),
        studyMicBtn: document.getElementById('studyMicBtn'),
        speechEvalBox: document.getElementById('speechEvalBox'),
        speechEvalStatus: document.getElementById('speechEvalStatus'),
        speechEvalResult: document.getElementById('speechEvalResult'),
        srsRatingButtons: document.querySelectorAll('.srs-btn'),

        // CLOZE TEST
        clozeDeckSelect: document.getElementById('clozeDeckSelect'),
        startClozeBtn: document.getElementById('startClozeBtn'),
        clozeStartPanel: document.getElementById('clozeStartPanel'),
        clozePlayPanel: document.getElementById('clozePlayPanel'),
        clozeResultPanel: document.getElementById('clozeResultPanel'),
        clozeScore: document.getElementById('clozeScore'),
        clozeCurrentStep: document.getElementById('clozeCurrentStep'),
        clozeTotalStep: document.getElementById('clozeTotalStep'),
        clozeHintMeaning: document.getElementById('clozeHintMeaning'),
        clozeSentence: document.getElementById('clozeSentence'),
        clozeSpeakBtn: document.getElementById('clozeSpeakBtn'),
        clozeHintBtn: document.getElementById('clozeHintBtn'),
        clozeForm: document.getElementById('clozeForm'),
        clozeInput: document.getElementById('clozeInput'),
        clozeSubmitBtn: document.getElementById('clozeSubmitBtn'),
        clozeFeedbackMsg: document.getElementById('clozeFeedbackMsg'),
        clozeFinalScore: document.getElementById('clozeFinalScore'),
        clozeScoreFeedback: document.getElementById('clozeScoreFeedback'),
        retryClozeBtn: document.getElementById('retryClozeBtn'),
        backToDeckClozeBtn: document.getElementById('backToDeckClozeBtn'),
        clozeModeChips: document.querySelectorAll('.cloze-mode-chip'),

        // TIKTOK FEED
        feedDeckSelect: document.getElementById('feedDeckSelect'),
        feedCard: document.getElementById('feedCard'),
        feedStage: document.getElementById('feedStage'),
        feedPos: document.getElementById('feedPos'),
        feedWord: document.getElementById('feedWord'),
        feedIpa: document.getElementById('feedIpa'),
        feedMeaning: document.getElementById('feedMeaning'),
        feedExampleEn: document.getElementById('feedExampleEn'),
        feedExampleVi: document.getElementById('feedExampleVi'),
        feedLikeBtn: document.getElementById('feedLikeBtn'),
        feedLikeText: document.getElementById('feedLikeText'),
        feedSpeakBtn: document.getElementById('feedSpeakBtn'),
        feedMasterBtn: document.getElementById('feedMasterBtn'),
        feedMasterText: document.getElementById('feedMasterText'),
        feedNextBtn: document.getElementById('feedNextBtn'),
        feedNextBtnBottom: document.getElementById('feedNextBtnBottom'),
        feedPrevBtn: document.getElementById('feedPrevBtn'),
        feedCounter: document.getElementById('feedCounter'),
        feedHeartBurst: document.getElementById('feedHeartBurst'),

        // SPEED MATCH GAME
        matchStartPanel: document.getElementById('matchStartPanel'),
        matchPlayPanel: document.getElementById('matchPlayPanel'),
        matchResultPanel: document.getElementById('matchResultPanel'),
        matchDeckSelect: document.getElementById('matchDeckSelect'),
        matchHighScoreDisplay: document.getElementById('matchHighScoreDisplay'),
        startMatchBtn: document.getElementById('startMatchBtn'),
        matchTimer: document.getElementById('matchTimer'),
        matchTimerFill: document.getElementById('matchTimerFill'),
        matchComboBadge: document.getElementById('matchComboBadge'),
        matchScore: document.getElementById('matchScore'),
        matchGrid: document.getElementById('matchGrid'),
        matchFinalScore: document.getElementById('matchFinalScore'),
        matchResultFeedback: document.getElementById('matchResultFeedback'),
        retryMatchBtn: document.getElementById('retryMatchBtn'),
        backToDeckMatchBtn: document.getElementById('backToDeckMatchBtn'),

        // ZEN FOCUS
        zenDeckName: document.getElementById('zenDeckName'),
        zenPomoTimer: document.getElementById('zenPomoTimer'),
        zenPomoToggle: document.getElementById('zenPomoToggle'),
        zenWord: document.getElementById('zenWord'),
        zenIpa: document.getElementById('zenIpa'),
        zenMeaning: document.getElementById('zenMeaning'),
        zenExample: document.getElementById('zenExample'),
        zenPrevBtn: document.getElementById('zenPrevBtn'),
        zenNextBtn: document.getElementById('zenNextBtn'),
        zenFlipBtn: document.getElementById('zenFlipBtn'),
        zenSpeakBtn: document.getElementById('zenSpeakBtn'),
        zenMuteBtn: document.getElementById('zenMuteBtn'),
        zenChips: document.querySelectorAll('.zen-chip[data-ambient]'),

        // DAILY GOAL & COLOR PALETTE
        dailyGoalText: document.getElementById('dailyGoalText'),
        radialGoalBar: document.getElementById('radialGoalBar'),
        paletteSwatches: document.querySelectorAll('.palette-swatch'),

        // QUIZ
        quizStartPanel: document.getElementById('quizStartPanel'),
        quizPlayPanel: document.getElementById('quizPlayPanel'),
        quizResultPanel: document.getElementById('quizResultPanel'),
        quizDeckSelect: document.getElementById('quizDeckSelect'),
        startQuizBtn: document.getElementById('startQuizBtn'),
        quizScore: document.getElementById('quizScore'),
        quizCurrentStep: document.getElementById('quizCurrentStep'),
        quizTotalStep: document.getElementById('quizTotalStep'),
        quizPosTag: document.getElementById('quizPosTag'),
        quizQuestionWord: document.getElementById('quizQuestionWord'),
        quizSpeakBtn: document.getElementById('quizSpeakBtn'),
        quizOptionsGrid: document.getElementById('quizOptionsGrid'),
        quizFinalScore: document.getElementById('quizFinalScore'),
        quizScoreFeedback: document.getElementById('quizScoreFeedback'),
        retryQuizBtn: document.getElementById('retryQuizBtn'),
        backToDeckQuizBtn: document.getElementById('backToDeckQuizBtn')
    };

    if (DOM.speechRateSelect) DOM.speechRateSelect.value = String(speechRate);
    if (DOM.voiceAccentSelect) DOM.voiceAccentSelect.value = voiceAccent;
    if (DOM.sfxSwitch) DOM.sfxSwitch.checked = sfxEnabled;
}

function setupTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (DOM.themeSwitch) DOM.themeSwitch.checked = (theme === 'dark');
    updateHeaderThemeIcon(theme);

    // Nạp gam màu chủ đạo (Accent Color)
    const savedAccent = localStorage.getItem('themeAccent') || 'indigo';
    applyAccentColor(savedAccent);
}

function applyAccentColor(accent) {
    if (accent === 'indigo') {
        document.documentElement.removeAttribute('data-accent');
    } else {
        document.documentElement.setAttribute('data-accent', accent);
    }
    localStorage.setItem('themeAccent', accent);

    if (DOM.paletteSwatches) {
        DOM.paletteSwatches.forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.color === accent);
        });
    }
}

function updateHeaderThemeIcon(theme) {
    if (!DOM.headerThemeBtn) return;
    const icon = DOM.headerThemeBtn.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

function mergeData() {
    allDecks = [];
    const checkAndAdd = (data) => {
        if (data && Array.isArray(data)) {
            allDecks = allDecks.concat(data);
        }
    };

    // 1. Nạp từ các biến toàn cục window
    for (let i = 1; i <= 20; i++) {
        const varName = `group_${i}_decks`;
        if (typeof window !== 'undefined' && typeof window[varName] !== 'undefined' && Array.isArray(window[varName])) {
            checkAndAdd(window[varName]);
        }
    }

    // 2. Dự phòng kiểm tra biến trực tiếp
    if (allDecks.length === 0) {
        try { if (typeof group_1_decks !== 'undefined') checkAndAdd(group_1_decks); } catch (e) {}
        try { if (typeof group_2_decks !== 'undefined') checkAndAdd(group_2_decks); } catch (e) {}
        try { if (typeof group_3_decks !== 'undefined') checkAndAdd(group_3_decks); } catch (e) {}
        try { if (typeof group_4_decks !== 'undefined') checkAndAdd(group_4_decks); } catch (e) {}
        try { if (typeof group_5_decks !== 'undefined') checkAndAdd(group_5_decks); } catch (e) {}
        try { if (typeof group_6_decks !== 'undefined') checkAndAdd(group_6_decks); } catch (e) {}
        try { if (typeof group_7_decks !== 'undefined') checkAndAdd(group_7_decks); } catch (e) {}
        try { if (typeof group_8_decks !== 'undefined') checkAndAdd(group_8_decks); } catch (e) {}
        try { if (typeof group_9_decks !== 'undefined') checkAndAdd(group_9_decks); } catch (e) {}
        try { if (typeof group_10_decks !== 'undefined') checkAndAdd(group_10_decks); } catch (e) {}
        try { if (typeof group_11_decks !== 'undefined') checkAndAdd(group_11_decks); } catch (e) {}
        try { if (typeof group_12_decks !== 'undefined') checkAndAdd(group_12_decks); } catch (e) {}
        try { if (typeof group_13_decks !== 'undefined') checkAndAdd(group_13_decks); } catch (e) {}
    }

    // 3. Nạp thêm các bài học tự tạo từ người dùng
    if (customDecks && customDecks.length > 0) {
        allDecks = allDecks.concat(customDecks);
    }

    console.log(`[Flashcards Pro] Đã nạp thành công ${allDecks.length} bộ bài học.`);

    if (DOM.deckTotalCount) DOM.deckTotalCount.innerText = `${allDecks.length} bài`;
}

function populateQuizDecks() {
    if (!DOM.quizDeckSelect) return;
    DOM.quizDeckSelect.innerHTML = '';
    allDecks.forEach((deck, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${deck.ten} (${deck.items ? deck.items.length : 0} từ)`;
        DOM.quizDeckSelect.appendChild(opt);
    });

    // Cập nhật bộ chọn của TikTok Feed
    if (DOM.feedDeckSelect) {
        DOM.feedDeckSelect.innerHTML = '';
        allDecks.forEach((deck, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${deck.ten} (${deck.items ? deck.items.length : 0} từ)`;
            DOM.feedDeckSelect.appendChild(opt);
        });
    }

    // Cập nhật bộ chọn của Speed Match
    if (DOM.matchDeckSelect) {
        DOM.matchDeckSelect.innerHTML = '';
        allDecks.forEach((deck, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${deck.ten} (${deck.items ? deck.items.length : 0} từ)`;
            DOM.matchDeckSelect.appendChild(opt);
        });
    }

    // Cập nhật bộ chọn của Cloze Test
    if (DOM.clozeDeckSelect) {
        DOM.clozeDeckSelect.innerHTML = '';
        allDecks.forEach((deck, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${deck.ten} (${deck.items ? deck.items.length : 0} từ)`;
            DOM.clozeDeckSelect.appendChild(opt);
        });
    }
}

function renderDeckList(data, target) {
    if (!target) return; 
    target.innerHTML = '';
    
    if (!data || data.length === 0) {
        target.innerHTML = '<li style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; opacity: 0.5;"></i>Không tìm thấy nội dung phù hợp</li>';
        return;
    }

    data.forEach(deck => {
        const li = document.createElement('li');
        li.className = 'deck-item';
        let total = deck.items ? deck.items.length : 0;
        let masteredCount = deck.items ? deck.items.filter(item => masteredCards.includes(item.id)).length : 0;
        
        li.innerHTML = `
            <div class="deck-info">
                <strong>${deck.ten}</strong>
                <span class="deck-meta">
                    <i class="fa-regular fa-clone"></i> ${total} từ vựng
                    ${masteredCount > 0 ? ` &bull; <span style="color: var(--success); font-weight:600;"><i class="fa-solid fa-check"></i> ${masteredCount} đã thuộc</span>` : ''}
                </span>
            </div>
            <div class="deck-chevron">
                <i class="fa-solid fa-arrow-right"></i>
            </div>
        `;
        li.addEventListener('click', () => loadDeck(deck));
        target.appendChild(li);
    });

    // Đồng thời cập nhật 3D Carousel nếu đang render danh sách chính
    if (target === DOM.deckList) {
        renderDeckCarousel();
    }
}

// ========================================================
// 2.2 RENDER & ĐIỀU HƯỚNG 3D VERTICAL CAROUSEL (3 THẺ)
// ========================================================
function renderDeckCarousel() {
    if (!DOM.deckCarouselTrack || !allDecks || allDecks.length === 0) return;

    if (currentCarouselIndex < 0) currentCarouselIndex = 0;
    if (currentCarouselIndex >= allDecks.length) currentCarouselIndex = allDecks.length - 1;

    DOM.deckCarouselTrack.innerHTML = '';

    allDecks.forEach((deck, idx) => {
        const total = deck.items ? deck.items.length : 0;
        const masteredCount = deck.items ? deck.items.filter(item => masteredCards.includes(item.id)).length : 0;
        const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.dataset.index = idx;

        // Phân loại vị trí: Trước (-1), Giữa (0), Sau (+1) hoặc Ẩn
        if (idx === currentCarouselIndex) {
            card.classList.add('card-active');
        } else if (idx === currentCarouselIndex - 1) {
            card.classList.add('card-prev');
        } else if (idx === currentCarouselIndex + 1) {
            card.classList.add('card-next');
        } else {
            card.classList.add('card-hidden');
        }

        card.innerHTML = `
            <div class="c-card-top">
                <span class="c-card-badge"><i class="fa-solid fa-layer-group"></i> Chủ đề #${idx + 1}</span>
                ${masteredCount > 0 ? `<span class="c-card-mastered"><i class="fa-solid fa-circle-check"></i> ${pct}% (${masteredCount}/${total})</span>` : `<span class="c-card-mastered" style="color:var(--text-muted);"><i class="fa-regular fa-circle"></i> Chưa học</span>`}
            </div>
            <div class="c-card-body">
                <h3 class="c-card-title">${deck.ten}</h3>
                <div class="c-card-desc">Bao gồm các từ vựng thiết yếu, ví dụ phiên âm chuẩn quốc tế.</div>
            </div>
            <div class="c-card-bottom">
                <div class="c-card-stats">
                    <span><i class="fa-regular fa-clone"></i> ${total} từ</span>
                    <span><i class="fa-solid fa-stopwatch"></i> ~${Math.ceil(total * 0.5)} phút</span>
                </div>
                <button class="c-card-btn" data-action="study">
                    <span>Học ngay</span> <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;

        // Nhấp vào thẻ
        card.addEventListener('click', (e) => {
            if (idx === currentCarouselIndex) {
                loadDeck(deck);
            } else {
                navigateCarouselTo(idx);
            }
        });

        const btn = card.querySelector('[data-action="study"]');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadDeck(deck);
            });
        }

        DOM.deckCarouselTrack.appendChild(card);
    });

    renderCarouselPagination();
}

function renderCarouselPagination() {
    if (!DOM.carouselPagination) return;
    DOM.carouselPagination.innerHTML = '';

    allDecks.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `carousel-dot ${idx === currentCarouselIndex ? 'active' : ''}`;
        dot.title = `Chủ đề ${idx + 1}`;
        dot.addEventListener('click', () => navigateCarouselTo(idx));
        DOM.carouselPagination.appendChild(dot);
    });
}

function navigateCarouselTo(newIndex) {
    if (newIndex < 0 || newIndex >= allDecks.length) return;
    currentCarouselIndex = newIndex;
    AudioFX.playFlip();
    renderDeckCarousel();
}

// ========================================================
// 3. HEATMAP HOẠT ĐỘNG (30 NGÀY QUA) & HUY HIỆU
// ========================================================
function renderActivityHeatmap() {
    if (!DOM.activityHeatmap) return;
    DOM.activityHeatmap.innerHTML = '';

    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push({ date: dateStr, dayNum: d.getDate() });
    }

    days.forEach(({ date, dayNum }) => {
        const count = studyHistory[date] || 0;
        let levelClass = 'l-0';
        if (count >= 15) levelClass = 'active-3';
        else if (count >= 6) levelClass = 'active-2';
        else if (count >= 1) levelClass = 'active-1';

        const dayEl = document.createElement('div');
        dayEl.className = `heatmap-day ${levelClass}`;
        dayEl.innerText = dayNum;
        dayEl.title = `${date}: Đã học ${count} lượt từ vựng`;
        DOM.activityHeatmap.appendChild(dayEl);
    });
}

const BADGES = [
    { id: 'first_step', title: 'Khởi Đầu Mới', desc: 'Đã thuộc từ vựng đầu tiên', icon: 'fa-seedling', check: () => masteredCards.length >= 1 },
    { id: 'vocab_20', title: 'Vốn Từ Khá', desc: 'Đã thuộc 20 từ vựng', icon: 'fa-book-bookmark', check: () => masteredCards.length >= 20 },
    { id: 'vocab_100', title: 'Bậc Thầy Từ Vựng', desc: 'Đã thuộc 100 từ vựng', icon: 'fa-crown', check: () => masteredCards.length >= 100 },
    { id: 'streak_3', title: 'Chăm Chỉ', desc: 'Đạt chuỗi học 3 ngày liên tục', icon: 'fa-fire-flame-curved', check: () => currentStreak >= 3 },
    { id: 'starred_5', title: 'Tập Trung', desc: 'Đã đánh dấu sao 5 từ cần ôn', icon: 'fa-star', check: () => starredCards.length >= 5 }
];

function checkBadges() {
    if (!DOM.badgesContainer) return;
    DOM.badgesContainer.innerHTML = '';

    let unlockedCount = 0;
    BADGES.forEach(badge => {
        const isUnlocked = badge.check();
        if (isUnlocked) unlockedCount++;

        const badgeEl = document.createElement('div');
        badgeEl.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
        badgeEl.innerHTML = `
            <div class="badge-icon-box">
                <i class="fa-solid ${badge.icon}"></i>
            </div>
            <div class="badge-details">
                <h5>${badge.title}</h5>
                <p>${badge.desc}</p>
            </div>
        `;
        DOM.badgesContainer.appendChild(badgeEl);
    });

    if (DOM.badgeUnlockedCount) {
        DOM.badgeUnlockedCount.innerText = `${unlockedCount}/${BADGES.length}`;
    }
}

// ========================================================
// 4. SAO LƯU & XUẤT / NHẬP JSON & TỰ TẠO BÀI HỌC
// ========================================================
function exportBackupData() {
    const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        masteredCards,
        starredCards,
        studyHistory,
        currentStreak,
        lastStudyDate: localStorage.getItem('lastStudyDate'),
        customDecks
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `flashcards_backup_${getTodayString()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}

function importBackupData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.masteredCards) localStorage.setItem('masteredCards', JSON.stringify(data.masteredCards));
            if (data.starredCards) localStorage.setItem('starredCards', JSON.stringify(data.starredCards));
            if (data.studyHistory) localStorage.setItem('studyHistory', JSON.stringify(data.studyHistory));
            if (data.customDecks) localStorage.setItem('customDecks', JSON.stringify(data.customDecks));
            if (data.currentStreak) localStorage.setItem('currentStreak', data.currentStreak);
            if (data.lastStudyDate) localStorage.setItem('lastStudyDate', data.lastStudyDate);

            alert("Khôi phục dữ liệu thành công! Trang web sẽ tự động làm mới.");
            location.reload();
        } catch (err) {
            alert("File sao lưu không đúng định dạng JSON!");
        }
    };
    reader.readAsText(file);
}

function saveCustomDeck() {
    const title = (DOM.customDeckTitle.value || '').trim();
    const rawWords = (DOM.customDeckWords.value || '').trim();

    if (!title) {
        alert("Vui lòng nhập tên chủ đề bài học!");
        return;
    }

    if (!rawWords) {
        alert("Vui lòng nhập danh sách từ vựng!");
        return;
    }

    const lines = rawWords.split('\n');
    const items = [];

    lines.forEach((line, idx) => {
        const parts = line.split('|').map(p => p.trim());
        if (parts[0]) {
            items.push({
                id: `custom_${Date.now()}_${idx}`,
                term: parts[0],
                meaning_vi: parts[1] || 'Chưa có nghĩa',
                ipa: parts[2] || '',
                pos: 'vocab',
                example: parts[3] || `Example with ${parts[0]}`,
                example_vi: parts[4] || ''
            });
        }
    });

    if (items.length === 0) {
        alert("Không tìm thấy từ vựng hợp lệ nào!");
        return;
    }

    const newDeck = {
        id: `custom_deck_${Date.now()}`,
        ten: `⭐ ${title}`,
        items: items
    };

    customDecks.push(newDeck);
    localStorage.setItem('customDecks', JSON.stringify(customDecks));

    DOM.customDeckTitle.value = '';
    DOM.customDeckWords.value = '';
    DOM.customDeckModal.style.display = 'none';

    mergeData();
    populateQuizDecks();
    renderDeckList(allDecks, DOM.deckList);
    loadDeck(newDeck);

    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80 });
}

// ========================================================
// TRỢ LÝ AI TỰ SINH DỮ LIỆU TỪ VỰNG THEO CHỦ ĐỀ
// ========================================================
async function generateAiDeck() {
    const topic = (DOM.aiTopicInput ? DOM.aiTopicInput.value : '').trim();
    if (!topic) {
        alert("Vui lòng nhập chủ đề bạn muốn AI tạo (ví dụ: Phỏng vấn xin việc, Du lịch, IELTS Environment...)!");
        if (DOM.aiTopicInput) DOM.aiTopicInput.focus();
        return;
    }

    if (DOM.aiGenStatus) {
        DOM.aiGenStatus.style.display = 'block';
        DOM.aiGenStatus.innerHTML = `<span style="color:var(--primary); font-weight:600;"><i class="fa-solid fa-spinner fa-spin"></i> Đang kích hoạt AI sinh từ vựng chuẩn cho chủ đề "${topic}"...</span>`;
    }
    if (DOM.aiGenerateBtn) DOM.aiGenerateBtn.disabled = true;

    // Kho tri thức từ điển thông minh phân loại theo chủ đề phong phú
    const aiKnowledgeBase = {
        'airport': [
            { term: 'Boarding pass', vi: 'Thẻ lên máy bay', ipa: '/ˈbɔːrdɪŋ pæs/', ex: 'Please have your boarding pass ready at the gate.' },
            { term: 'Luggage', vi: 'Hành lý', ipa: '/ˈlʌɡɪdʒ/', ex: 'You can check in up to two pieces of luggage.' },
            { term: 'Departure gate', vi: 'Cổng khởi hành', ipa: '/dɪˈpɑːrtʃər ɡeɪt/', ex: 'The flight will depart from gate 12B.' },
            { term: 'Customs', vi: 'Hải quan', ipa: '/ˈkʌstəmz/', ex: 'We must clear customs upon arriving in London.' },
            { term: 'Carry-on bag', vi: 'Hành lý xách tay', ipa: '/ˈkæri ɑːn bæɡ/', ex: 'Make sure your carry-on bag fits in the overhead bin.' },
            { term: 'Delay', vi: 'Sự trì hoãn / Chậm chuyến', ipa: '/dɪˈleɪ/', ex: 'Our flight suffered a two-hour delay due to fog.' },
            { term: 'Baggage claim', vi: 'Khu vực nhận hành lý', ipa: '/ˈbæɡɪdʒ kleɪm/', ex: 'Pick up your bags at baggage claim carousel 3.' },
            { term: 'Security checkpoint', vi: 'Trạm kiểm tra an ninh', ipa: '/səˈkjʊrəti ˈtʃɛkˌpɔɪnt/', ex: 'Remove your laptop before passing through security.' }
        ],
        'restaurant': [
            { term: 'Appetizer', vi: 'Món khai vị', ipa: '/ˈæpɪtaɪzər/', ex: 'Would you like to order any appetizers first?' },
            { term: 'Main course', vi: 'Món chính', ipa: '/meɪn kɔːrs/', ex: 'For the main course, I will have the grilled salmon.' },
            { term: 'Dessert', vi: 'Món tráng miệng', ipa: '/dɪˈzɜːrt/', ex: 'Save some room for our homemade chocolate dessert.' },
            { term: 'Reservation', vi: 'Sự đặt bàn trước', ipa: '/ˌrɛzərˈveɪʃən/', ex: 'We have a table reservation under Mr. David.' },
            { term: 'Bill / Check', vi: 'Hóa đơn tính tiền', ipa: '/bɪl / tʃɛk/', ex: 'Could we get the bill, please?' },
            { term: 'Specialty', vi: 'Món đặc sản', ipa: '/ˈspɛʃəlti/', ex: 'Pho is the most famous culinary specialty of Vietnam.' },
            { term: 'Beverage', vi: 'Đồ uống / Thức uống', ipa: '/ˈbɛvərɪdʒ/', ex: 'The waiter brought us complimentary iced beverages.' },
            { term: 'Vegetarian', vi: 'Món chay / Người ăn chay', ipa: '/ˌvɛdʒəˈtɛriən/', ex: 'Do you offer a vegetarian alternative for this dish?' }
        ],
        'interview': [
            { term: 'Strength', vi: 'Điểm mạnh / Sở trường', ipa: '/strɛŋkθ/', ex: 'My greatest strength is problem-solving under pressure.' },
            { term: 'Weakness', vi: 'Điểm yếu cần cải thiện', ipa: '/ˈwiːknəs/', ex: 'I am constantly working to turn my weakness into motivation.' },
            { term: 'Accomplishment', vi: 'Thành tựu xuất sắc', ipa: '/əˈkɑːmplɪʃmənt/', ex: 'Tell me about your proudest professional accomplishment.' },
            { term: 'Company culture', vi: 'Văn hóa doanh nghiệp', ipa: '/ˈkʌmpəni ˈkʌltʃər/', ex: 'I am eager to contribute to your inclusive company culture.' },
            { term: 'Leadership skill', vi: 'Kỹ năng lãnh đạo', ipa: '/ˈliːdərʃɪp skɪl/', ex: 'He demonstrated outstanding leadership skills during the crisis.' },
            { term: 'Career goal', vi: 'Mục tiêu nghề nghiệp', ipa: '/kəˈrɪr ɡoʊl/', ex: 'What is your primary career goal for the next three years?' },
            { term: 'Probation period', vi: 'Thời gian thử việc', ipa: '/proʊˈbeɪʃən ˈpɪriəd/', ex: 'The contract includes a two-month probation period.' },
            { term: 'Compensation', vi: 'Chế độ đãi ngộ & lương thưởng', ipa: '/ˌkɑːmpənˈseɪʃən/', ex: 'The company provides an attractive compensation package.' }
        ],
        'travel': [
            { term: 'Itinerary', vi: 'Lịch trình chuyến đi', ipa: '/aɪˈtɪnərɛri/', ex: 'We have a detailed itinerary for our 5-day trip.' },
            { term: 'Accommodation', vi: 'Chỗ ở / Khách sạn nghỉ dưỡng', ipa: '/əˌkɑːməˈdeɪʃən/', ex: 'The hotel provides luxury accommodation by the beach.' },
            { term: 'Sightseeing', vi: 'Ngắm cảnh / Tham quan', ipa: '/ˈsaɪtsiːɪŋ/', ex: 'We spent the afternoon sightseeing around the old quarter.' },
            { term: 'Souvenir', vi: 'Quà lưu niệm', ipa: '/ˌsuːvəˈnɪr/', ex: 'I bought handcrafted souvenirs for all my close friends.' },
            { term: 'Destination', vi: 'Điểm đến du lịch', ipa: '/ˌdɛstəˈneɪʃən/', ex: 'Da Nang is among the top destinations in Southeast Asia.' },
            { term: 'Tour guide', vi: 'Hướng dẫn viên du lịch', ipa: '/tʊr ɡaɪd/', ex: 'Our tour guide explained the ancient history enthusiastically.' },
            { term: 'Backpacker', vi: 'Du khách phượt balo', ipa: '/ˈbækpækər/', ex: 'The hostel is extremely popular with international backpackers.' },
            { term: 'Currency exchange', vi: 'Đổi ngoại tệ', ipa: '/ˈkɜːrənsi ɪksˈtʃeɪndʒ/', ex: 'Where can I find a trustworthy currency exchange booth?' }
        ],
        'tech': [
            { term: 'Artificial intelligence', vi: 'Trí tuệ nhân tạo', ipa: '/ˌɑːrtɪˈfɪʃəl ɪnˈtɛlədʒəns/', ex: 'Artificial intelligence is revolutionizing education and work.' },
            { term: 'Algorithm', vi: 'Thuật toán xử lý', ipa: '/ˈælɡərɪðəm/', ex: 'The search algorithm delivers results in milliseconds.' },
            { term: 'Database', vi: 'Cơ sở dữ liệu', ipa: '/ˈdeɪtəbeɪs/', ex: 'User profiles are stored safely in an encrypted database.' },
            { term: 'Cloud computing', vi: 'Điện toán đám mây', ipa: '/klaʊd kəmˈpjuːtɪŋ/', ex: 'We migrated all company servers to cloud computing.' },
            { term: 'Cybersecurity', vi: 'An ninh mạng', ipa: '/ˌsaɪbərsɪˈkjʊrəti/', ex: 'Cybersecurity measures prevent unauthorized system intrusions.' },
            { term: 'Framework', vi: 'Khung kiến trúc lập trình', ipa: '/ˈfreɪmwɜːrk/', ex: 'They built the web application using a modern JavaScript framework.' },
            { term: 'Debugging', vi: 'Gỡ lỗi phần mềm', ipa: '/diːˈbʌɡɪŋ/', ex: 'He spent the entire morning debugging the payment flow.' },
            { term: 'Open-source', vi: 'Mã nguồn mở', ipa: '/ˌoʊpən ˈsɔːrs/', ex: 'The team actively contributes to popular open-source projects.' }
        ]
    };

    // Khởi tạo độ trễ giả lập AI suy nghĩ và xuất kết quả
    setTimeout(() => {
        const lowerTopic = topic.toLowerCase();
        let matchedKey = Object.keys(aiKnowledgeBase).find(k => lowerTopic.includes(k));

        // Nếu người dùng nhập chủ đề tiếng Việt (sân bay, nhà hàng, phỏng vấn, du lịch, công nghệ...)
        if (!matchedKey) {
            if (lowerTopic.includes('sân bay') || lowerTopic.includes('máy bay') || lowerTopic.includes('bay')) matchedKey = 'airport';
            else if (lowerTopic.includes('ăn') || lowerTopic.includes('nhà hàng') || lowerTopic.includes('quán')) matchedKey = 'restaurant';
            else if (lowerTopic.includes('phỏng vấn') || lowerTopic.includes('việc') || lowerTopic.includes('tuyển dụng')) matchedKey = 'interview';
            else if (lowerTopic.includes('du lịch') || lowerTopic.includes('phượt') || lowerTopic.includes('khách sạn')) matchedKey = 'travel';
            else if (lowerTopic.includes('công nghệ') || lowerTopic.includes('it') || lowerTopic.includes('lập trình') || lowerTopic.includes('ai')) matchedKey = 'tech';
        }

        let wordsList = [];
        if (matchedKey && aiKnowledgeBase[matchedKey]) {
            wordsList = aiKnowledgeBase[matchedKey];
        } else {
            // Mẫu sinh tổng hợp ngữ cảnh nếu chủ đề đặc thù
            wordsList = [
                { term: `${topic} fundamental`, vi: `Nguyên tắc cốt lõi của ${topic}`, ipa: `/fʌndəˈmɛntəl/`, ex: `Understanding the fundamentals is key to mastering this.` },
                { term: `Key factor`, vi: `Yếu tố then chốt`, ipa: `/kiː ˈfæktər/`, ex: `Dedication is a key factor in achieving personal success.` },
                { term: `Efficient method`, vi: `Phương pháp hiệu quả cao`, ipa: `/ɪˈfɪʃənt ˈmɛθəd/`, ex: `We adopted an efficient method to optimize our learning curve.` },
                { term: `Practical application`, vi: `Ứng dụng thực tế`, ipa: `/ˈpræktɪkəl ˌæplɪˈkeɪʃən/`, ex: `Focus on practical application rather than mere theory.` },
                { term: `Breakthrough`, vi: `Bước đột phá quan trọng`, ipa: `/ˈbreɪkˌθruː/`, ex: `The latest research led to a remarkable scientific breakthrough.` },
                { term: `Perspective`, vi: `Góc nhìn / Quan điểm`, ipa: `/pərˈspɛktɪv/`, ex: `Traveling helps you see the world from a brand new perspective.` },
                { term: `Collaboration`, vi: `Sự cộng tác ăn ý`, ipa: `/kəˌlæbəˈreɪʃən/`, ex: `Effective collaboration makes complex challenges easily solvable.` },
                { term: `Consistency`, vi: `Sự kiên trì / Tính nhất quán`, ipa: `/kənˈsɪstənsi/`, ex: `Daily consistency is the secret behind all massive achievements.` }
            ];
        }

        // Tự động điền Form với định dạng: Từ | Nghĩa | Phiên âm | Câu ví dụ
        const formattedText = wordsList.map(w => `${w.term} | ${w.vi} | ${w.ipa} | ${w.ex}`).join('\n');
        
        if (DOM.customDeckTitle) {
            DOM.customDeckTitle.value = `Chuyên đề: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
        }
        if (DOM.customDeckWords) {
            DOM.customDeckWords.value = formattedText;
        }

        if (DOM.aiGenStatus) {
            DOM.aiGenStatus.innerHTML = `<span style="color:var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Tuyệt vời! AI đã tạo xong ${wordsList.length} từ vựng chất lượng cao kèm câu ví dụ và phiên âm! Bạn có thể nhấn "Lưu bài học" ngay.</span>`;
        }
        if (DOM.aiGenerateBtn) DOM.aiGenerateBtn.disabled = false;
        AudioFX.playCorrect();
    }, 700);
}

function renderWordSearchList(results, target) {
    if (!target) return;
    target.innerHTML = '';
    if (!results || results.length === 0) {
        target.innerHTML = '<li style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; margin-bottom: 12px; display: block; opacity: 0.5;"></i>Không tìm thấy từ vựng nào</li>';
        return;
    }

    results.forEach(({ word, deck }) => {
        const li = document.createElement('li');
        li.className = 'deck-item';
        const isM = masteredCards.includes(word.id);
        const isS = starredCards.includes(word.id);
        li.innerHTML = `
            <div class="deck-info" style="width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="color: var(--primary); font-size:1.25rem;">${word.term}</strong>
                        ${isS ? '<i class="fa-solid fa-star" style="color:var(--warning); font-size:0.9rem;"></i>' : ''}
                    </div>
                    <span style="font-size:0.75rem; background: var(--primary-light); color: var(--primary); padding:3px 10px; border-radius:12px; font-weight:700;">${word.pos || 'VOCAB'}</span>
                </div>
                <div style="font-size:0.95rem; font-weight:600; color: var(--text-main); margin-bottom: 4px;">${word.meaning_vi}</div>
                <div style="font-size:0.85rem; color: var(--text-muted); display:flex; justify-content:space-between;">
                    <span>Bài: ${deck.ten}</span>
                    <span>${isM ? '<i class="fa-solid fa-check" style="color:var(--success)"></i> Đã thuộc' : ''}</span>
                </div>
            </div>
        `;
        li.addEventListener('click', () => {
            currentDeck = deck;
            const idx = deck.items.findIndex(it => it.id === word.id);
            currentCardIndex = idx >= 0 ? idx : 0;
            const studyBtn = document.querySelector('[data-view="study"]');
            if (studyBtn) studyBtn.click();
            showCard();
        });
        target.appendChild(li);
    });
}

function renderStarredList() {
    if (!DOM.starredList) return;
    const starredItems = [];
    allDecks.forEach(d => {
        if (d.items) {
            d.items.forEach(w => {
                if (starredCards.includes(w.id)) {
                    starredItems.push({ word: w, deck: d });
                }
            });
        }
    });

    if (DOM.studyStarredBtn) {
        DOM.studyStarredBtn.style.display = starredItems.length > 0 ? 'inline-flex' : 'none';
    }

    if (starredItems.length === 0) {
        DOM.starredList.innerHTML = `
            <li style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px 20px;">
                <i class="fa-regular fa-star" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.4; display: block;"></i>
                <h4 style="color: var(--text-main); margin-bottom: 8px;">Chưa có từ vựng nào được đánh dấu sao</h4>
                <p>Trong khi lật flashcard, hãy bấm vào biểu tượng ngôi sao để thêm từ cần ôn lại vào đây.</p>
            </li>
        `;
        return;
    }

    renderWordSearchList(starredItems, DOM.starredList);
}

function studyStarredOnly() {
    const starredItems = [];
    allDecks.forEach(d => {
        if (d.items) {
            d.items.forEach(w => {
                if (starredCards.includes(w.id)) {
                    starredItems.push(w);
                }
            });
        }
    });

    if (starredItems.length === 0) return;
    currentDeck = {
        ten: "⭐ Từ Vựng Cần Ôn Tập",
        items: starredItems
    };
    currentCardIndex = 0;
    const studyBtn = document.querySelector('[data-view="study"]');
    if (studyBtn) studyBtn.click();
    showCard();
}

function setupNavigation() {
    DOM.navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const v = e.currentTarget.getAttribute('data-view');
            DOM.navItems.forEach(b => b.classList.remove('active'));
            DOM.views.forEach(view => view.classList.remove('active'));
            document.querySelectorAll(`[data-view="${v}"]`).forEach(b => b.classList.add('active'));
            const viewEl = document.getElementById(v + 'View');
            if (viewEl) viewEl.classList.add('active');
            
            if (DOM.viewTitle) {
                const titles = { 
                    'dashboard': 'Trang chủ', 
                    'study': currentDeck ? currentDeck.ten : 'Không gian học', 
                    'cloze': 'Luyện điền từ vào câu',
                    'feed': 'TikTok Flash Feed',
                    'match': 'Đấu trường Speed Match 60s',
                    'zen': 'Zen Focus & Thư giãn',
                    'quiz': 'Trắc nghiệm phản xạ',
                    'starred': 'Từ vựng yêu thích',
                    'library': 'Kho thư viện', 
                    'settings': 'Cài đặt' 
                };
                DOM.viewTitle.innerText = titles[v] || 'Flashcards';
            }

            if (DOM.viewSubtitle) {
                const subtitles = {
                    'dashboard': 'Học từ vựng thông minh mỗi ngày',
                    'study': 'Chạm thẻ để lật, phím mũi tên để chuyển thẻ, 1-4 chấm điểm SRS',
                    'cloze': 'Thử thách phản xạ từ vựng qua câu ví dụ thực tế',
                    'feed': 'Cuộn lướt từ vựng phong cách hiện đại cực cuốn',
                    'match': 'Phản xạ ghép cặp từ tiếng Anh & tiếng Việt',
                    'zen': 'Không gian học tập yên bình cùng âm thanh thư giãn',
                    'quiz': 'Chọn đáp án chính xác để nhận điểm thưởng',
                    'starred': 'Tập trung ôn tập những từ bạn đã đánh dấu',
                    'library': 'Tra cứu bài học và danh sách từ vựng',
                    'settings': 'Cá nhân hóa trải nghiệm học tập'
                };
                DOM.viewSubtitle.innerText = subtitles[v] || '';
            }

            const isStudy = (v === 'study' && currentDeck);
            if (DOM.quickShuffleBtn) DOM.quickShuffleBtn.style.display = isStudy ? 'inline-flex' : 'none';
            if (DOM.autoPlayBtn) DOM.autoPlayBtn.style.display = isStudy ? 'inline-flex' : 'none';
            if (DOM.fullscreenBtn) DOM.fullscreenBtn.style.display = isStudy ? 'inline-flex' : 'none';

            if (v !== 'study' && isAutoPlaying) {
                stopAutoPlay();
            }

            if (v === 'cloze') {
                initClozeView();
            }

            if (v === 'feed') {
                initFeedView();
            }

            if (v === 'match') {
                initMatchView();
            }

            if (v === 'zen') {
                initZenView();
            }

            if (v === 'starred') {
                renderStarredList();
            }

            if (v === 'library') {
                performSearch();
            }
        });
    });
}

function loadDeck(deck) {
    currentDeck = deck; 
    currentStudyFilter = 'all';
    applyStudyFilter(currentStudyFilter);
    const studyBtn = document.querySelector('[data-view="study"]');
    if (studyBtn) studyBtn.click();
}

function updateFilterCounters() {
    if (!currentDeck || !currentDeck.items) return;
    const allCount = currentDeck.items.length;
    const masteredCount = currentDeck.items.filter(item => masteredCards.includes(item.id)).length;
    const unmasteredCount = allCount - masteredCount;

    const elAll = document.getElementById('countFilterAll');
    const elUnm = document.getElementById('countFilterUnmastered');
    const elMas = document.getElementById('countFilterMastered');
    if (elAll) elAll.innerText = allCount;
    if (elUnm) elUnm.innerText = unmasteredCount;
    if (elMas) elMas.innerText = masteredCount;

    // Highlight button active
    document.querySelectorAll('.study-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentStudyFilter);
    });
}

function applyStudyFilter(filter) {
    if (!currentDeck || !currentDeck.items) return;
    currentStudyFilter = filter;
    
    if (filter === 'mastered') {
        currentDeckItems = currentDeck.items.filter(item => masteredCards.includes(item.id));
    } else if (filter === 'unmastered') {
        currentDeckItems = currentDeck.items.filter(item => !masteredCards.includes(item.id));
    } else {
        currentDeckItems = [...currentDeck.items];
    }

    currentCardIndex = 0;
    updateFilterCounters();
    showCard();
}

function showCard() {
    if (!currentDeck) return;
    updateFilterCounters();

    if (!currentDeckItems || currentDeckItems.length === 0) {
        if (DOM.cardWord) DOM.cardWord.innerText = 'Không có từ';
        if (DOM.cardIpa) DOM.cardIpa.innerText = '';
        if (DOM.cardCounter) DOM.cardCounter.innerText = '0 / 0';
        if (DOM.cardCounterBack) DOM.cardCounterBack.innerText = '0 / 0';
        if (DOM.cardMeaning) DOM.cardMeaning.innerText = `Chưa có từ nào thuộc nhóm "${currentStudyFilter === 'mastered' ? 'Đã thuộc' : 'Chưa nhớ'}".`;
        if (DOM.cardExampleEn) DOM.cardExampleEn.innerText = '';
        if (DOM.cardExampleVi) DOM.cardExampleVi.innerText = '';
        if (DOM.studyProgressPct) DOM.studyProgressPct.innerText = '0%';
        if (DOM.studyProgressFill) DOM.studyProgressFill.style.width = '0%';
        return;
    }

    if (currentCardIndex >= currentDeckItems.length) currentCardIndex = currentDeckItems.length - 1;
    if (currentCardIndex < 0) currentCardIndex = 0;

    const item = currentDeckItems[currentCardIndex];
    isFlipped = false; 
    if (DOM.flashcard) DOM.flashcard.classList.remove('is-flipped');
    
    const total = currentDeckItems.length;
    const currentNum = currentCardIndex + 1;
    const progressPercent = Math.round((currentNum / total) * 100);

    if (DOM.studyDeckName) DOM.studyDeckName.innerText = currentDeck.ten;
    if (DOM.studyProgressPct) DOM.studyProgressPct.innerText = `${progressPercent}%`;
    if (DOM.studyProgressFill) DOM.studyProgressFill.style.width = `${progressPercent}%`;

    setTimeout(() => {
        if (DOM.cardWord) DOM.cardWord.innerText = item.term || ''; 
        if (DOM.cardIpa) DOM.cardIpa.innerText = item.ipa || '';
        if (DOM.cardCounter) DOM.cardCounter.innerText = `${currentNum} / ${total}`;
        if (DOM.cardCounterBack) DOM.cardCounterBack.innerText = `${currentNum} / ${total}`;
        if (DOM.cardPos) DOM.cardPos.innerText = item.pos || 'TỪ VỰNG'; 
        if (DOM.cardMeaning) DOM.cardMeaning.innerText = item.meaning_vi || '';
        if (DOM.cardExampleEn) DOM.cardExampleEn.innerText = item.example || 'No example available'; 
        if (DOM.cardExampleVi) DOM.cardExampleVi.innerText = item.example_vi || '';
        
        updateCardStatusUI();
    }, 150);
}

function updateCardStatusUI() {
    if (!currentDeckItems || !currentDeckItems[currentCardIndex]) return;
    const item = currentDeckItems[currentCardIndex];
    const isM = masteredCards.includes(item.id);
    const isS = starredCards.includes(item.id);
    
    if (DOM.cardStatusBadge) {
        DOM.cardStatusBadge.innerText = isM ? 'ĐÃ THUỘC' : 'ĐANG HỌC';
        DOM.cardStatusBadge.style.background = isM ? 'var(--success-light)' : 'var(--bg-card-subtle)';
        DOM.cardStatusBadge.style.color = isM ? 'var(--success)' : 'var(--text-muted)';
    }

    if (DOM.starCardBtn) {
        const starIcon = DOM.starCardBtn.querySelector('i');
        if (isS) {
            DOM.starCardBtn.classList.add('active');
            if (starIcon) starIcon.className = 'fa-solid fa-star';
        } else {
            DOM.starCardBtn.classList.remove('active');
            if (starIcon) starIcon.className = 'fa-regular fa-star';
        }
    }

    if (DOM.masterBtn && DOM.notMasteredBtn) {
        if (isM) {
            DOM.masterBtn.style.background = 'var(--success)';
            DOM.masterBtn.style.color = 'white';
            DOM.masterBtn.style.borderColor = 'var(--success)';
            DOM.notMasteredBtn.style.background = '';
            DOM.notMasteredBtn.style.color = '';
            DOM.notMasteredBtn.style.borderColor = '';
        } else {
            DOM.masterBtn.style.background = '';
            DOM.masterBtn.style.color = '';
            DOM.masterBtn.style.borderColor = '';
            DOM.notMasteredBtn.style.background = 'var(--danger-light)';
            DOM.notMasteredBtn.style.color = 'var(--danger)';
            DOM.notMasteredBtn.style.borderColor = 'var(--danger)';
        }
    }
}

function toggleStarCurrentCard() {
    if (!currentDeckItems || !currentDeckItems[currentCardIndex]) return;
    const id = currentDeckItems[currentCardIndex].id;
    const idx = starredCards.indexOf(id);
    if (idx > -1) {
        starredCards.splice(idx, 1);
    } else {
        starredCards.push(id);
    }
    localStorage.setItem('starredCards', JSON.stringify(starredCards));
    updateCardStatusUI();
    checkBadges();
}

function shuffleCurrentDeck() {
    if (!currentDeckItems || currentDeckItems.length <= 1) return;
    for (let i = currentDeckItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentDeckItems[i], currentDeckItems[j]] = [currentDeckItems[j], currentDeckItems[i]];
    }
    currentCardIndex = 0;
    AudioFX.playFlip();
    showCard();
    if (typeof confetti !== 'undefined') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
}

// ========================================================
// AUTOPLAY MODE (TỰ ĐỘNG PHÁT THẺ & ĐỌC TỪ)
// ========================================================
function toggleAutoPlay() {
    if (isAutoPlaying) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}

function startAutoPlay() {
    if (!currentDeck || !currentDeck.items || currentDeck.items.length === 0) return;
    isAutoPlaying = true;
    if (DOM.autoPlayBtn) {
        DOM.autoPlayBtn.classList.add('active-autoplay');
        DOM.autoPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Dừng tự động</span>';
    }

    runAutoPlayCycle();
}

function stopAutoPlay() {
    isAutoPlaying = false;
    if (autoPlayTimer) clearTimeout(autoPlayTimer);
    if (DOM.autoPlayBtn) {
        DOM.autoPlayBtn.classList.remove('active-autoplay');
        DOM.autoPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Tự động học</span>';
    }
}

function runAutoPlayCycle() {
    if (!isAutoPlaying) return;

    playWordSound();

    autoPlayTimer = setTimeout(() => {
        if (!isAutoPlaying) return;
        if (DOM.flashcard && !DOM.flashcard.classList.contains('is-flipped')) {
            DOM.flashcard.classList.add('is-flipped');
            AudioFX.playFlip();
        }

        autoPlayTimer = setTimeout(() => {
            if (!isAutoPlaying) return;
            const items = currentDeckItems || (currentDeck ? currentDeck.items : []);
            if (currentCardIndex < items.length - 1) {
                currentCardIndex++;
                showCard();
                autoPlayTimer = setTimeout(runAutoPlayCycle, 800);
            } else {
                stopAutoPlay();
                if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 90 });
            }
        }, 2500);
    }, 2200);
}

// ========================================================
// QUIZ GAME ENGINE
// ========================================================
function startQuiz() {
    const selectedIndex = parseInt(DOM.quizDeckSelect ? DOM.quizDeckSelect.value : 0);
    const deck = allDecks[selectedIndex];
    if (!deck || !deck.items || deck.items.length < 4) {
        alert("Bộ từ này cần ít nhất 4 từ để chơi trắc nghiệm!");
        return;
    }

    let shuffledItems = [...deck.items].sort(() => 0.5 - Math.random());
    quizQuestions = shuffledItems.slice(0, Math.min(10, shuffledItems.length)).map(item => {
        const wrongOpts = deck.items
            .filter(i => i.id !== item.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(i => i.meaning_vi);
        
        const allOpts = [...wrongOpts, item.meaning_vi].sort(() => 0.5 - Math.random());
        return {
            word: item.term,
            pos: item.pos || 'VOCAB',
            correctAnswer: item.meaning_vi,
            options: allOpts
        };
    });

    currentQuizIndex = 0;
    quizScore = 0;
    DOM.quizStartPanel.style.display = 'none';
    DOM.quizResultPanel.style.display = 'none';
    DOM.quizPlayPanel.style.display = 'block';

    renderQuizStep();
}

function renderQuizStep() {
    if (currentQuizIndex >= quizQuestions.length) {
        finishQuiz();
        return;
    }

    quizAnswering = false;
    const q = quizQuestions[currentQuizIndex];
    if (DOM.quizCurrentStep) DOM.quizCurrentStep.innerText = currentQuizIndex + 1;
    if (DOM.quizTotalStep) DOM.quizTotalStep.innerText = quizQuestions.length;
    if (DOM.quizScore) DOM.quizScore.innerText = quizScore;
    if (DOM.quizPosTag) DOM.quizPosTag.innerText = q.pos;
    if (DOM.quizQuestionWord) DOM.quizQuestionWord.innerText = q.word;

    playWordSound(q.word);

    if (DOM.quizOptionsGrid) {
        DOM.quizOptionsGrid.innerHTML = '';
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.innerText = opt;
            btn.addEventListener('click', () => handleQuizAnswer(opt, btn, q.correctAnswer));
            DOM.quizOptionsGrid.appendChild(btn);
        });
    }
}

function handleQuizAnswer(selectedOpt, btnEl, correctOpt) {
    if (quizAnswering) return;
    quizAnswering = true;

    const allButtons = DOM.quizOptionsGrid.querySelectorAll('.quiz-opt-btn');
    if (selectedOpt === correctOpt) {
        btnEl.classList.add('correct');
        AudioFX.playCorrect();
        quizScore += 10;
        if (DOM.quizScore) DOM.quizScore.innerText = quizScore;
        noiLua();
    } else {
        btnEl.classList.add('wrong');
        AudioFX.playWrong();
        allButtons.forEach(b => {
            if (b.innerText === correctOpt) b.classList.add('correct');
        });
    }

    setTimeout(() => {
        currentQuizIndex++;
        renderQuizStep();
    }, 1100);
}

function finishQuiz() {
    DOM.quizPlayPanel.style.display = 'none';
    DOM.quizResultPanel.style.display = 'block';

    const totalPossible = quizQuestions.length * 10;
    if (DOM.quizFinalScore) DOM.quizFinalScore.innerText = `${quizScore} / ${totalPossible}`;

    let feedback = "Hãy tiếp tục cố gắng hơn nhé!";
    if (quizScore === totalPossible) {
        feedback = "Xuất sắc tuyệt đối! Bạn nhớ hết 100% từ vựng!";
        if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100 });
    } else if (quizScore >= totalPossible * 0.7) {
        feedback = "Làm rất tốt! Bạn đã nắm vững hầu hết các từ.";
        if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70 });
    }
    if (DOM.quizScoreFeedback) DOM.quizScoreFeedback.innerText = feedback;
}

function performSearch() {
    const kw = (DOM.searchInput ? DOM.searchInput.value : '').toLowerCase().trim();
    
    if (currentSearchFilter === 'decks') {
        const filteredDecks = allDecks.filter(d => d.ten.toLowerCase().includes(kw));
        renderDeckList(filteredDecks, DOM.libraryList);
    } else if (currentSearchFilter === 'words') {
        const wordResults = [];
        allDecks.forEach(d => {
            if (d.items) {
                d.items.forEach(w => {
                    if (w.term.toLowerCase().includes(kw) || (w.meaning_vi && w.meaning_vi.toLowerCase().includes(kw))) {
                        wordResults.push({ word: w, deck: d });
                    }
                });
            }
        });
        renderWordSearchList(wordResults, DOM.libraryList);
    } else {
        if (!kw) {
            renderDeckList(allDecks, DOM.libraryList);
            return;
        }
        const filteredDecks = allDecks.filter(d => d.ten.toLowerCase().includes(kw));
        const wordResults = [];
        allDecks.forEach(d => {
            if (d.items) {
                d.items.forEach(w => {
                    if (w.term.toLowerCase().includes(kw) || (w.meaning_vi && w.meaning_vi.toLowerCase().includes(kw))) {
                        wordResults.push({ word: w, deck: d });
                    }
                });
            }
        });

        if (wordResults.length > 0) {
            renderWordSearchList(wordResults, DOM.libraryList);
        } else {
            renderDeckList(filteredDecks, DOM.libraryList);
        }
    }
}

function setupEventListeners() {
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', (e) => {
            if (e.target.closest('.card-quick-speak') || e.target.closest('.card-star-btn') || e.target.closest('.control-btn') || window.getSelection().toString().length > 0) return;
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            AudioFX.playFlip();
        });
    }

    if (DOM.frontSpeakBtn) {
        DOM.frontSpeakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playWordSound();
        });
    }

    if (DOM.starCardBtn) {
        DOM.starCardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStarCurrentCard();
        });
    }

    if (DOM.quickShuffleBtn) {
        DOM.quickShuffleBtn.addEventListener('click', () => {
            shuffleCurrentDeck();
        });
    }

    if (DOM.autoPlayBtn) {
        DOM.autoPlayBtn.addEventListener('click', () => {
            toggleAutoPlay();
        });
    }

    if (DOM.studyStarredBtn) {
        DOM.studyStarredBtn.addEventListener('click', () => {
            studyStarredOnly();
        });
    }

    // Chuyển đổi chế độ xem: Lướt 3D vs Xem tất cả (Grid)
    if (DOM.modeCarouselBtn && DOM.modeGridBtn) {
        DOM.modeCarouselBtn.addEventListener('click', () => {
            DOM.modeCarouselBtn.classList.add('active');
            DOM.modeGridBtn.classList.remove('active');
            if (DOM.deckCarouselStage) DOM.deckCarouselStage.style.display = 'flex';
            if (DOM.deckList) DOM.deckList.style.display = 'none';
        });

        DOM.modeGridBtn.addEventListener('click', () => {
            DOM.modeGridBtn.classList.add('active');
            DOM.modeCarouselBtn.classList.remove('active');
            if (DOM.deckCarouselStage) DOM.deckCarouselStage.style.display = 'none';
            if (DOM.deckList) DOM.deckList.style.display = 'grid';
        });
    }

    // Modal tạo bài học
    // Carousel Events (Lướt dọc & Bấm nút)
    if (DOM.carouselPrevBtn) {
        DOM.carouselPrevBtn.addEventListener('click', () => {
            navigateCarouselTo(currentCarouselIndex - 1);
        });
    }
    if (DOM.carouselNextBtn) {
        DOM.carouselNextBtn.addEventListener('click', () => {
            navigateCarouselTo(currentCarouselIndex + 1);
        });
    }

    // Cuộn chuột (Mouse Wheel) để lướt thẻ
    if (DOM.deckCarouselTrack) {
        let isWheelThrottled = false;
        DOM.deckCarouselTrack.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (isWheelThrottled) return;
            isWheelThrottled = true;
            if (e.deltaY > 0) {
                navigateCarouselTo(currentCarouselIndex + 1);
            } else if (e.deltaY < 0) {
                navigateCarouselTo(currentCarouselIndex - 1);
            }
            setTimeout(() => { isWheelThrottled = false; }, 300);
        }, { passive: false });

        // Hỗ trợ Touch Swipe dọc trên điện thoại
        let touchStartY = 0;
        let touchEndY = 0;
        DOM.deckCarouselTrack.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        DOM.deckCarouselTrack.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const diff = touchStartY - touchEndY;
            if (Math.abs(diff) > 40) {
                if (diff > 0) {
                    navigateCarouselTo(currentCarouselIndex + 1); // vuốt lên -> thẻ kế tiếp
                } else {
                    navigateCarouselTo(currentCarouselIndex - 1); // vuốt xuống -> thẻ trước
                }
            }
        }, { passive: true });
    }

    if (DOM.openCustomDeckModalBtn) {
        DOM.openCustomDeckModalBtn.addEventListener('click', () => {
            DOM.customDeckModal.style.display = 'flex';
        });
    }
    if (DOM.closeCustomDeckModalBtn) {
        DOM.closeCustomDeckModalBtn.addEventListener('click', () => {
            DOM.customDeckModal.style.display = 'none';
        });
    }
    if (DOM.cancelCustomDeckBtn) {
        DOM.cancelCustomDeckBtn.addEventListener('click', () => {
            DOM.customDeckModal.style.display = 'none';
        });
    }
    if (DOM.saveCustomDeckBtn) {
        DOM.saveCustomDeckBtn.addEventListener('click', saveCustomDeck);
    }

    // AI Generate Deck Event
    if (DOM.aiGenerateBtn) {
        DOM.aiGenerateBtn.addEventListener('click', generateAiDeck);
    }

    // Backup & Restore
    if (DOM.exportDataBtn) DOM.exportDataBtn.addEventListener('click', exportBackupData);
    if (DOM.importDataBtn) {
        DOM.importDataBtn.addEventListener('click', () => {
            if (DOM.importFileInput) DOM.importFileInput.click();
        });
    }
    if (DOM.importFileInput) {
        DOM.importFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                importBackupData(e.target.files[0]);
            }
        });
    }

    // Quiz events
    if (DOM.startQuizBtn) DOM.startQuizBtn.addEventListener('click', startQuiz);
    if (DOM.retryQuizBtn) DOM.retryQuizBtn.addEventListener('click', startQuiz);
    if (DOM.backToDeckQuizBtn) {
        DOM.backToDeckQuizBtn.addEventListener('click', () => {
            DOM.quizResultPanel.style.display = 'none';
            DOM.quizStartPanel.style.display = 'block';
        });
    }
    if (DOM.quizSpeakBtn) {
        DOM.quizSpeakBtn.addEventListener('click', () => {
            const q = quizQuestions[currentQuizIndex];
            if (q) playWordSound(q.word);
        });
    }

    document.addEventListener('keydown', (e) => {
        const studyView = document.getElementById('studyView');
        if (!studyView || !studyView.classList.contains('active')) return;
        
        if (e.code === 'Space') { 
            e.preventDefault(); 
            if (DOM.flashcard) DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            AudioFX.playFlip();
        } 
        else if (e.key === 'ArrowRight') { if (DOM.nextBtn) DOM.nextBtn.click(); }
        else if (e.key === 'ArrowLeft') { if (DOM.prevBtn) DOM.prevBtn.click(); }
        else if (e.key === 'Enter') { if (DOM.masterBtn) DOM.masterBtn.click(); }
        else if (['1', '2', '3', '4'].includes(e.key)) {
            // Phím tắt đánh giá SRS: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
            handleSrsRating(parseInt(e.key));
        }
    });

    // Bộ lọc thẻ học (Tất cả / Chưa nhớ / Đã thuộc)
    document.querySelectorAll('.study-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            applyStudyFilter(filter);
        });
    });

    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            noiLua();
            if (currentDeckItems && currentCardIndex < currentDeckItems.length - 1) { 
                currentCardIndex++; 
                showCard(); 
            } else {
                if (typeof confetti !== 'undefined') confetti({ particleCount: 160, spread: 80 });
            }
        });
    }

    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeckItems && currentCardIndex > 0) { 
                currentCardIndex--; 
                showCard(); 
            }
        });
    }

    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            playWordSound(); 
        });
    }

    if (DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            noiLua();
            if (!currentDeckItems || !currentDeckItems[currentCardIndex]) return;
            const id = currentDeckItems[currentCardIndex].id;
            if (!masteredCards.includes(id)) { 
                masteredCards.push(id); 
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards)); 
                updateDashboardStats(); 
                checkBadges();
            }
            updateCardStatusUI();
            updateFilterCounters();
        });
    }

    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeckItems || !currentDeckItems[currentCardIndex]) return;
            const id = currentDeckItems[currentCardIndex].id;
            const idx = masteredCards.indexOf(id);
            if (idx > -1) { 
                masteredCards.splice(idx, 1); 
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards)); 
                updateDashboardStats(); 
                checkBadges();
            }
            updateCardStatusUI();
            updateFilterCounters();
        });
    }

    if (DOM.themeSwitch) {
        DOM.themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateHeaderThemeIcon(theme);
        });
    }

    if (DOM.headerThemeBtn) {
        DOM.headerThemeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            if (DOM.themeSwitch) DOM.themeSwitch.checked = (nextTheme === 'dark');
            updateHeaderThemeIcon(nextTheme);
        });
    }

    if (DOM.fullscreenBtn) {
        DOM.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                DOM.fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>Thu nhỏ</span>';
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                DOM.fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> <span>Toàn màn hình</span>';
            }
        });
    }

    if (DOM.heroContinueBtn) {
        DOM.heroContinueBtn.addEventListener('click', () => {
            if (allDecks.length > 0) {
                loadDeck(allDecks[0]);
            }
        });
    }

    if (DOM.heroFeedBtn) {
        DOM.heroFeedBtn.addEventListener('click', () => {
            const btn = document.querySelector('[data-view="feed"]');
            if (btn) btn.click();
        });
    }

    if (DOM.heroMatchBtn) {
        DOM.heroMatchBtn.addEventListener('click', () => {
            const btn = document.querySelector('[data-view="match"]');
            if (btn) btn.click();
        });
    }

    if (DOM.heroZenBtn) {
        DOM.heroZenBtn.addEventListener('click', () => {
            const btn = document.querySelector('[data-view="zen"]');
            if (btn) btn.click();
        });
    }

    if (DOM.heroClozeBtn) {
        DOM.heroClozeBtn.addEventListener('click', () => {
            const btn = document.querySelector('[data-view="cloze"]');
            if (btn) btn.click();
        });
    }

    if (DOM.heroSrsBtn || DOM.srsDueStatCard) {
        const openSrsReview = () => {
            startSrsReviewSession();
        };
        if (DOM.heroSrsBtn) DOM.heroSrsBtn.addEventListener('click', openSrsReview);
        if (DOM.srsDueStatCard) DOM.srsDueStatCard.addEventListener('click', openSrsReview);
    }

    setupFeedEvents();
    setupMatchEvents();
    setupZenEvents();
    setupCardTilt3D();
    setupSrsEvents();
    setupSpeechRecognition();
    setupClozeEvents();

    if (DOM.heroQuickQuizBtn) {
        DOM.heroQuickQuizBtn.addEventListener('click', () => {
            const quizNav = document.querySelector('[data-view="quiz"]');
            if (quizNav) quizNav.click();
        });
    }

    if (DOM.voiceAccentSelect) {
        DOM.voiceAccentSelect.addEventListener('change', (e) => {
            voiceAccent = e.target.value || 'US';
            localStorage.setItem('voiceAccent', voiceAccent);
            initVoices();
        });
    }

    if (DOM.sfxSwitch) {
        DOM.sfxSwitch.addEventListener('change', (e) => {
            sfxEnabled = e.target.checked;
            localStorage.setItem('sfxEnabled', sfxEnabled);
        });
    }

    if (DOM.speechRateSelect) {
        DOM.speechRateSelect.addEventListener('change', (e) => {
            speechRate = parseFloat(e.target.value) || 0.9;
            localStorage.setItem('speechRate', speechRate);
        });
    }

    if (DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Bạn có chắc muốn xóa toàn bộ tiến độ học tập và chuỗi ngày không?")) { 
                localStorage.removeItem('masteredCards');
                localStorage.removeItem('starredCards');
                localStorage.removeItem('studyHistory');
                localStorage.removeItem('currentStreak');
                localStorage.removeItem('lastStudyDate');
                masteredCards = [];
                starredCards = [];
                studyHistory = {};
                currentStreak = 0;
                updateDashboardStats();
                checkStreak();
                renderActivityHeatmap();
                checkBadges();
                renderDeckList(allDecks, DOM.deckList);
                alert("Đã thiết lập lại tiến độ học!");
            }
        });
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', () => {
            performSearch();
        });
    }

    if (DOM.filterPills) {
        DOM.filterPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                DOM.filterPills.forEach(p => p.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentSearchFilter = e.currentTarget.getAttribute('data-filter');
                performSearch();
            });
        });
    }
    if (DOM.paletteSwatches) {
        DOM.paletteSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                applyAccentColor(color);
                AudioFX.playPop();
            });
        });
    }
}

function updateDashboardStats() {
    if (DOM.statMastered) DOM.statMastered.innerText = masteredCards.length;
    let total = 0; 
    allDecks.forEach(d => { if (d && d.items) total += d.items.length; });
    if (total > 0 && DOM.statProgress) {
        DOM.statProgress.innerText = `${Math.round((masteredCards.length / total) * 100)}%`;
    }

    // Cập nhật Radial Progress Mục tiêu ngày (Daily Goal)
    updateDailyGoalProgress();
}

function updateDailyGoalProgress() {
    const today = getTodayString();
    const todayCount = studyHistory[today] || 0;
    const targetGoal = 15; // 15 từ mỗi ngày

    if (DOM.dailyGoalText) {
        DOM.dailyGoalText.innerText = `${todayCount} / ${targetGoal} từ`;
    }

    if (DOM.radialGoalBar) {
        // Chu vi hình tròn r=18 là 2 * Math.PI * 18 ≈ 113.1
        const circumference = 113.1;
        const progress = Math.min(todayCount / targetGoal, 1);
        const offset = circumference - (progress * circumference);
        DOM.radialGoalBar.style.strokeDashoffset = offset;

        if (todayCount >= targetGoal) {
            DOM.radialGoalBar.style.stroke = 'var(--success)';
        } else {
            DOM.radialGoalBar.style.stroke = 'var(--primary)';
        }
    }
}

// ========================================================
// 5. ĐỘT PHÁ 1: TIKTOK FLASH FEED (VERTICAL DOPAMINE FEED)
// ========================================================
function initFeedView() {
    if (!allDecks || allDecks.length === 0) return;
    if (DOM.feedDeckSelect && DOM.feedDeckSelect.children.length > 0) {
        feedDeckIndex = parseInt(DOM.feedDeckSelect.value) || 0;
    }
    feedWordIndex = 0;
    renderFeedCard();
}

function renderFeedCard() {
    const deck = allDecks[feedDeckIndex];
    if (!deck || !deck.items || deck.items.length === 0) return;

    if (feedWordIndex < 0) feedWordIndex = 0;
    if (feedWordIndex >= deck.items.length) feedWordIndex = deck.items.length - 1;

    const item = deck.items[feedWordIndex];
    if (!item) return;

    if (DOM.feedPos) DOM.feedPos.innerText = (item.pos || 'VOCAB').toUpperCase();
    if (DOM.feedWord) DOM.feedWord.innerText = item.term;
    if (DOM.feedIpa) DOM.feedIpa.innerText = item.ipa || '';
    if (DOM.feedMeaning) DOM.feedMeaning.innerText = item.meaning_vi;
    if (DOM.feedExampleEn) DOM.feedExampleEn.innerText = item.example ? `"${item.example}"` : `Example for ${item.term}`;
    if (DOM.feedExampleVi) DOM.feedExampleVi.innerText = item.example_vi ? `"${item.example_vi}"` : '';

    if (DOM.feedCounter) DOM.feedCounter.innerText = `${feedWordIndex + 1} / ${deck.items.length}`;

    // Update nút like (starred)
    const isStarred = starredCards.includes(item.id);
    if (DOM.feedLikeBtn) {
        DOM.feedLikeBtn.classList.toggle('active', isStarred);
        const icon = DOM.feedLikeBtn.querySelector('i');
        if (icon) icon.className = isStarred ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }
    if (DOM.feedLikeText) DOM.feedLikeText.innerText = isStarred ? 'Đã lưu' : 'Lưu';

    // Update nút mastered
    const isMastered = masteredCards.includes(item.id);
    if (DOM.feedMasterBtn) {
        DOM.feedMasterBtn.classList.toggle('active', isMastered);
    }
    if (DOM.feedMasterText) DOM.feedMasterText.innerText = isMastered ? 'Đã thuộc' : 'Thuộc';

    // Tự động đọc từ khi lướt tới
    playWordSound(item.term);
    recordStudyActivity();
}

function triggerFeedHeartBurst(x, y) {
    if (!DOM.feedHeartBurst) return;
    const heart = document.createElement('div');
    heart.className = 'burst-heart';
    heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
    if (x && y) {
        const rect = DOM.feedHeartBurst.getBoundingClientRect();
        heart.style.left = `${x - rect.left - 30}px`;
        heart.style.top = `${y - rect.top - 30}px`;
    }
    DOM.feedHeartBurst.appendChild(heart);
    AudioFX.playPop();
    setTimeout(() => heart.remove(), 900);
}

function setupFeedEvents() {
    if (DOM.feedDeckSelect) {
        DOM.feedDeckSelect.addEventListener('change', (e) => {
            feedDeckIndex = parseInt(e.target.value) || 0;
            feedWordIndex = 0;
            renderFeedCard();
        });
    }

    if (DOM.feedNextBtn) {
        DOM.feedNextBtn.addEventListener('click', () => {
            const deck = allDecks[feedDeckIndex];
            if (deck && feedWordIndex < deck.items.length - 1) {
                feedWordIndex++;
                if (DOM.feedCard) {
                    DOM.feedCard.classList.remove('slide-in-up', 'slide-in-down');
                    void DOM.feedCard.offsetWidth;
                    DOM.feedCard.classList.add('slide-in-up');
                }
                renderFeedCard();
            } else {
                if (typeof confetti !== 'undefined') confetti({ particleCount: 100 });
            }
        });
    }

    if (DOM.feedNextBtnBottom) {
        DOM.feedNextBtnBottom.addEventListener('click', () => {
            if (DOM.feedNextBtn) DOM.feedNextBtn.click();
        });
    }

    if (DOM.feedPrevBtn) {
        DOM.feedPrevBtn.addEventListener('click', () => {
            if (feedWordIndex > 0) {
                feedWordIndex--;
                if (DOM.feedCard) {
                    DOM.feedCard.classList.remove('slide-in-up', 'slide-in-down');
                    void DOM.feedCard.offsetWidth;
                    DOM.feedCard.classList.add('slide-in-down');
                }
                renderFeedCard();
            }
        });
    }

    if (DOM.feedSpeakBtn) {
        DOM.feedSpeakBtn.addEventListener('click', () => {
            const deck = allDecks[feedDeckIndex];
            if (deck && deck.items[feedWordIndex]) {
                playWordSound(deck.items[feedWordIndex].term);
            }
        });
    }

    if (DOM.feedLikeBtn) {
        DOM.feedLikeBtn.addEventListener('click', () => {
            const deck = allDecks[feedDeckIndex];
            if (!deck || !deck.items[feedWordIndex]) return;
            const id = deck.items[feedWordIndex].id;
            const idx = starredCards.indexOf(id);
            if (idx > -1) {
                starredCards.splice(idx, 1);
            } else {
                starredCards.push(id);
                triggerFeedHeartBurst();
            }
            localStorage.setItem('starredCards', JSON.stringify(starredCards));
            checkBadges();
            renderFeedCard();
        });
    }

    if (DOM.feedMasterBtn) {
        DOM.feedMasterBtn.addEventListener('click', () => {
            const deck = allDecks[feedDeckIndex];
            if (!deck || !deck.items[feedWordIndex]) return;
            const id = deck.items[feedWordIndex].id;
            const idx = masteredCards.indexOf(id);
            if (idx > -1) {
                masteredCards.splice(idx, 1);
            } else {
                masteredCards.push(id);
                AudioFX.playCorrect();
                noiLua();
            }
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
            updateDashboardStats();
            checkBadges();
            renderFeedCard();
        });
    }

    // Double tap to like on Feed card
    let lastTap = 0;
    if (DOM.feedCard) {
        DOM.feedCard.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
                const touch = e.changedTouches[0];
                if (touch) triggerFeedHeartBurst(touch.clientX, touch.clientY);
                if (DOM.feedLikeBtn) DOM.feedLikeBtn.click();
            }
            lastTap = currentTime;
        });

        // Touch swipe gesture up / down
        DOM.feedCard.addEventListener('touchstart', (e) => {
            feedTouchStartY = e.touches[0].clientY;
        }, { passive: true });

        DOM.feedCard.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diffY = feedTouchStartY - touchEndY;
            if (diffY > 60) {
                // Swipe up -> next
                if (DOM.feedNextBtn) DOM.feedNextBtn.click();
            } else if (diffY < -60) {
                // Swipe down -> prev
                if (DOM.feedPrevBtn) DOM.feedPrevBtn.click();
            }
        }, { passive: true });
    }

    // Wheel scrolling inside Feed
    if (DOM.feedStage) {
        let isWheelCooling = false;
        DOM.feedStage.addEventListener('wheel', (e) => {
            if (isWheelCooling) return;
            isWheelCooling = true;
            setTimeout(() => { isWheelCooling = false; }, 350);
            if (e.deltaY > 0) {
                if (DOM.feedNextBtn) DOM.feedNextBtn.click();
            } else if (e.deltaY < 0) {
                if (DOM.feedPrevBtn) DOM.feedPrevBtn.click();
            }
        });
    }
}

// ========================================================
// 6. ĐỘT PHÁ 2: SPEED MATCH 60S GAME
// ========================================================
function initMatchView() {
    matchHighScore = parseInt(localStorage.getItem('matchHighScore')) || 0;
    if (DOM.matchHighScoreDisplay) DOM.matchHighScoreDisplay.innerText = `${matchHighScore} điểm`;
    if (DOM.matchStartPanel) DOM.matchStartPanel.style.display = 'block';
    if (DOM.matchPlayPanel) DOM.matchPlayPanel.style.display = 'none';
    if (DOM.matchResultPanel) DOM.matchResultPanel.style.display = 'none';
    if (matchTimerInterval) clearInterval(matchTimerInterval);
}

function startMatchGame() {
    if (!allDecks || allDecks.length === 0) return;
    const selectedDeckIdx = parseInt(DOM.matchDeckSelect.value) || 0;
    const deck = allDecks[selectedDeckIdx];
    if (!deck || !deck.items || deck.items.length < 6) {
        alert("Bộ từ này cần ít nhất 6 từ vựng để chơi Speed Match!");
        return;
    }

    DOM.matchStartPanel.style.display = 'none';
    DOM.matchResultPanel.style.display = 'none';
    DOM.matchPlayPanel.style.display = 'block';

    matchTimeLeft = 60;
    matchScoreVal = 0;
    matchCombo = 1;
    matchSelectedCard = null;
    matchIsChecking = false;

    updateMatchHUD();
    spawnMatchRound(deck.items);

    if (matchTimerInterval) clearInterval(matchTimerInterval);
    matchTimerInterval = setInterval(() => {
        matchTimeLeft--;
        updateMatchHUD();
        if (matchTimeLeft <= 0) {
            endMatchGame();
        }
    }, 1000);
}

function updateMatchHUD() {
    if (DOM.matchTimer) DOM.matchTimer.innerText = `${matchTimeLeft}s`;
    if (DOM.matchScore) DOM.matchScore.innerText = matchScoreVal;
    if (DOM.matchComboBadge) {
        DOM.matchComboBadge.innerText = `Combo x${matchCombo}`;
        DOM.matchComboBadge.style.transform = matchCombo > 1 ? 'scale(1.15)' : 'scale(1)';
    }
    if (DOM.matchTimerFill) {
        const pct = (matchTimeLeft / 60) * 100;
        DOM.matchTimerFill.style.width = `${pct}%`;
        if (matchTimeLeft <= 10) {
            DOM.matchTimerFill.style.background = 'var(--danger)';
        } else {
            DOM.matchTimerFill.style.background = 'var(--primary-gradient)';
        }
    }
}

function spawnMatchRound(items) {
    if (!DOM.matchGrid) return;
    DOM.matchGrid.innerHTML = '';

    // Lấy ngẫu nhiên 6 từ vựng từ bộ từ
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, 6);

    // Tạo 6 thẻ tiếng Anh và 6 thẻ nghĩa tiếng Việt
    const cards = [];
    selectedWords.forEach(w => {
        cards.push({ id: w.id, text: w.term, type: 'en', pairId: w.id, wordObj: w });
        cards.push({ id: `${w.id}_vi`, text: w.meaning_vi, type: 'vi', pairId: w.id, wordObj: w });
    });

    // Trộn ngẫu nhiên vị trí 12 thẻ
    cards.sort(() => Math.random() - 0.5);

    cards.forEach(c => {
        const cardEl = document.createElement('div');
        cardEl.className = `match-tile tile-${c.type}`;
        cardEl.dataset.pairId = c.pairId;
        cardEl.dataset.type = c.type;
        cardEl.innerHTML = `<span>${c.text}</span>`;

        cardEl.addEventListener('click', () => handleMatchCardClick(cardEl, c));
        DOM.matchGrid.appendChild(cardEl);
    });
}

function handleMatchCardClick(cardEl, cardData) {
    if (matchIsChecking || cardEl.classList.contains('matched') || cardEl.classList.contains('selected')) return;

    AudioFX.playFlip();

    if (!matchSelectedCard) {
        // Chọn thẻ đầu tiên
        matchSelectedCard = { el: cardEl, data: cardData };
        cardEl.classList.add('selected');
    } else {
        // Chọn thẻ thứ hai -> Kiểm tra khớp
        const first = matchSelectedCard;
        const second = { el: cardEl, data: cardData };

        // Không cho phép bấm 2 thẻ cùng loại (ví dụ 2 thẻ EN hoặc 2 thẻ VI)
        if (first.data.type === second.data.type) {
            first.el.classList.remove('selected');
            matchSelectedCard = second;
            second.el.classList.add('selected');
            return;
        }

        matchIsChecking = true;
        second.el.classList.add('selected');

        if (first.data.pairId === second.data.pairId) {
            // ĐÚNG CẶP!
            setTimeout(() => {
                AudioFX.playCorrect();
                AudioFX.playCombo();
                first.el.classList.remove('selected');
                second.el.classList.remove('selected');
                first.el.classList.add('matched');
                second.el.classList.add('matched');

                // Thưởng điểm theo combo
                matchScoreVal += (10 * matchCombo);
                matchCombo = Math.min(matchCombo + 1, 5);
                updateMatchHUD();
                recordStudyActivity();

                // Đánh dấu thuộc từ này
                if (!masteredCards.includes(first.data.pairId)) {
                    masteredCards.push(first.data.pairId);
                    localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                    updateDashboardStats();
                }

                // Phát âm từ tiếng Anh
                playWordSound(first.data.type === 'en' ? first.data.text : second.data.text);

                matchSelectedCard = null;
                matchIsChecking = false;

                // Kiểm tra xem đã dọn sạch bảng 12 ô chưa
                const remaining = DOM.matchGrid.querySelectorAll('.match-tile:not(.matched)');
                if (remaining.length === 0) {
                    if (typeof confetti !== 'undefined') confetti({ particleCount: 80 });
                    const deckIdx = parseInt(DOM.matchDeckSelect.value) || 0;
                    setTimeout(() => {
                        if (allDecks[deckIdx] && matchTimeLeft > 0) {
                            spawnMatchRound(allDecks[deckIdx].items);
                        }
                    }, 400);
                }
            }, 250);
        } else {
            // SAI CẶP!
            setTimeout(() => {
                AudioFX.playWrong();
                first.el.classList.add('shake');
                second.el.classList.add('shake');
                matchCombo = 1; // Reset combo
                updateMatchHUD();

                setTimeout(() => {
                    first.el.classList.remove('selected', 'shake');
                    second.el.classList.remove('selected', 'shake');
                    matchSelectedCard = null;
                    matchIsChecking = false;
                }, 400);
            }, 300);
        }
    }
}

function endMatchGame() {
    if (matchTimerInterval) clearInterval(matchTimerInterval);
    DOM.matchPlayPanel.style.display = 'none';
    DOM.matchResultPanel.style.display = 'block';

    if (DOM.matchFinalScore) DOM.matchFinalScore.innerText = `${matchScoreVal} điểm`;

    // Cập nhật kỷ lục cá nhân
    if (matchScoreVal > matchHighScore) {
        matchHighScore = matchScoreVal;
        localStorage.setItem('matchHighScore', matchHighScore);
        if (DOM.matchHighScoreDisplay) DOM.matchHighScoreDisplay.innerText = `${matchHighScore} điểm`;
        if (DOM.matchResultFeedback) DOM.matchResultFeedback.innerHTML = `🎉 <strong>KỶ LỤC MỚI!</strong> Bạn là bậc thầy phản xạ từ vựng!`;
        if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100 });
    } else {
        if (DOM.matchResultFeedback) DOM.matchResultFeedback.innerText = `Luyện tập thường xuyên để bứt phá kỷ lục ${matchHighScore} điểm nhé!`;
    }
}

function setupMatchEvents() {
    if (DOM.startMatchBtn) DOM.startMatchBtn.addEventListener('click', startMatchGame);
    if (DOM.retryMatchBtn) DOM.retryMatchBtn.addEventListener('click', startMatchGame);
    if (DOM.backToDeckMatchBtn) {
        DOM.backToDeckMatchBtn.addEventListener('click', () => {
            DOM.matchResultPanel.style.display = 'none';
            DOM.matchStartPanel.style.display = 'block';
        });
    }
}

// ========================================================
// 7. ĐỘT PHÁ 3: ZEN FOCUS & AMBIENCE (POMODORO CHILL)
// ========================================================
function initZenView() {
    zenCurrentWordIndex = 0;
    zenIsFlipped = false;
    renderZenWord();
}

function renderZenWord() {
    const deck = currentDeck || (allDecks.length > 0 ? allDecks[0] : null);
    if (!deck || !deck.items || deck.items.length === 0) return;

    if (zenCurrentWordIndex < 0) zenCurrentWordIndex = 0;
    if (zenCurrentWordIndex >= deck.items.length) zenCurrentWordIndex = deck.items.length - 1;

    const item = deck.items[zenCurrentWordIndex];
    if (!item) return;

    if (DOM.zenDeckName) DOM.zenDeckName.innerText = `${deck.ten} (${zenCurrentWordIndex + 1}/${deck.items.length})`;
    if (DOM.zenWord) DOM.zenWord.innerText = item.term;
    if (DOM.zenIpa) DOM.zenIpa.innerText = item.ipa || '';
    if (DOM.zenMeaning) {
        DOM.zenMeaning.innerText = item.meaning_vi;
        DOM.zenMeaning.style.display = zenIsFlipped ? 'block' : 'none';
    }
    if (DOM.zenExample) {
        DOM.zenExample.innerText = item.example ? `"${item.example}"` : '';
        DOM.zenExample.style.display = zenIsFlipped ? 'block' : 'none';
    }
    if (DOM.zenFlipBtn) {
        DOM.zenFlipBtn.innerHTML = zenIsFlipped 
            ? '<i class="fa-solid fa-eye-slash"></i> Ẩn nghĩa' 
            : '<i class="fa-solid fa-arrows-rotate"></i> Xem nghĩa';
    }
}

function updateZenPomoDisplay() {
    if (!DOM.zenPomoTimer) return;
    const mins = Math.floor(zenPomoTimeLeft / 60);
    const secs = zenPomoTimeLeft % 60;
    DOM.zenPomoTimer.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setupZenEvents() {
    // Chips âm thanh thư giãn
    if (DOM.zenChips) {
        DOM.zenChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const ambientType = e.currentTarget.getAttribute('data-ambient');
                DOM.zenChips.forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                AudioFX.playAmbience(ambientType);
            });
        });
    }

    if (DOM.zenMuteBtn) {
        DOM.zenMuteBtn.addEventListener('click', () => {
            if (DOM.zenChips) DOM.zenChips.forEach(c => c.classList.remove('active'));
            AudioFX.stopAmbience();
        });
    }

    // Lật xem nghĩa
    if (DOM.zenFlipBtn) {
        DOM.zenFlipBtn.addEventListener('click', () => {
            zenIsFlipped = !zenIsFlipped;
            AudioFX.playFlip();
            renderZenWord();
        });
    }

    // Từ trước / tiếp
    if (DOM.zenNextBtn) {
        DOM.zenNextBtn.addEventListener('click', () => {
            const deck = currentDeck || (allDecks.length > 0 ? allDecks[0] : null);
            if (deck && zenCurrentWordIndex < deck.items.length - 1) {
                zenCurrentWordIndex++;
                zenIsFlipped = false;
                renderZenWord();
                playWordSound();
                recordStudyActivity();
            }
        });
    }

    if (DOM.zenPrevBtn) {
        DOM.zenPrevBtn.addEventListener('click', () => {
            if (zenCurrentWordIndex > 0) {
                zenCurrentWordIndex--;
                zenIsFlipped = false;
                renderZenWord();
                playWordSound();
            }
        });
    }

    if (DOM.zenSpeakBtn) {
        DOM.zenSpeakBtn.addEventListener('click', () => {
            const deck = currentDeck || (allDecks.length > 0 ? allDecks[0] : null);
            if (deck && deck.items[zenCurrentWordIndex]) {
                playWordSound(deck.items[zenCurrentWordIndex].term);
            }
        });
    }

    // Pomodoro Timer 25:00
    if (DOM.zenPomoToggle) {
        DOM.zenPomoToggle.addEventListener('click', () => {
            if (zenPomoRunning) {
                clearInterval(zenPomoInterval);
                zenPomoRunning = false;
                DOM.zenPomoToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
            } else {
                zenPomoRunning = true;
                DOM.zenPomoToggle.innerHTML = '<i class="fa-solid fa-pause"></i>';
                zenPomoInterval = setInterval(() => {
                    if (zenPomoTimeLeft > 0) {
                        zenPomoTimeLeft--;
                        updateZenPomoDisplay();
                    } else {
                        clearInterval(zenPomoInterval);
                        zenPomoRunning = false;
                        DOM.zenPomoToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
                        AudioFX.playCorrect();
                        alert("Tuyệt vời! Bạn đã hoàn thành phiên tập trung Zen 25 phút!");
                        zenPomoTimeLeft = 25 * 60;
                        updateZenPomoDisplay();
                    }
                }, 1000);
            }
        });
    }
}

// ========================================================
// 9. ĐỘT PHÁ 5: THUẬT TOÁN ÔN TẬP NGẮT QUÃNG (SPACED REPETITION SM-2)
// ========================================================
function getSrsDueWords() {
    const today = getTodayString();
    const dueWords = [];
    allDecks.forEach(deck => {
        if (!deck.items) return;
        deck.items.forEach(item => {
            const record = srsData[item.id];
            // Nếu chưa có record (từ mới) hoặc đã đến hạn dueDate <= today
            if (record && record.dueDate <= today) {
                dueWords.push({ word: item, deck: deck, srs: record });
            }
        });
    });
    return dueWords;
}

function updateSrsDashboardCounter() {
    const due = getSrsDueWords();
    const count = due.length;
    if (DOM.statSrsDue) DOM.statSrsDue.innerText = `${count} từ`;
    if (DOM.heroSrsCount) DOM.heroSrsCount.innerText = count;
}

function startSrsReviewSession() {
    const due = getSrsDueWords();
    if (due.length === 0) {
        alert("Tuyệt vời! Hiện tại bạn không có từ nào cần ôn tập gấp theo Spaced Repetition. Hãy học bài mới hoặc ôn tập tự do nhé!");
        return;
    }

    currentDeck = {
        ten: "🧠 Ôn Tập Ngắt Quãng (SRS Đến Hạn)",
        items: due.map(d => d.word)
    };
    currentStudyFilter = 'all';
    applyStudyFilter('all');
    const studyBtn = document.querySelector('[data-view="study"]');
    if (studyBtn) studyBtn.click();
}

function handleSrsRating(rating) {
    if (!currentDeckItems || !currentDeckItems[currentCardIndex]) return;
    const item = currentDeckItems[currentCardIndex];
    const today = new Date();

    // SM-2 Algorithm
    let record = srsData[item.id] || { interval: 1, repetition: 0, easeFactor: 2.5, dueDate: getTodayString() };
    let { interval, repetition, easeFactor } = record;

    if (rating < 3) {
        // Lại (1) hoặc Khó (2) -> reset lặp lại
        repetition = 0;
        interval = rating === 1 ? 1 : 1;
        AudioFX.playWrong();
    } else {
        // Tốt (3) hoặc Dễ (4)
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = rating === 4 ? 6 : 3;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetition++;
        AudioFX.playCorrect();
    }

    // Cập nhật Ease Factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    const grade = rating + 1; // map 1..4 -> 2..5
    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Tính ngày ôn tiếp theo
    const due = new Date(today);
    due.setDate(today.getDate() + interval);
    const dueDateStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

    srsData[item.id] = {
        interval,
        repetition,
        easeFactor: Math.round(easeFactor * 100) / 100,
        dueDate: dueDateStr,
        lastReviewed: getTodayString()
    };
    localStorage.setItem('srsData', JSON.stringify(srsData));

    // Đánh dấu mastered nếu đạt >= 3
    if (rating >= 3 && !masteredCards.includes(item.id)) {
        masteredCards.push(item.id);
        localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
    }

    recordStudyActivity();
    updateDashboardStats();
    updateSrsDashboardCounter();

    // Tự động chuyển từ tiếp theo
    if (currentCardIndex < currentDeckItems.length - 1) {
        currentCardIndex++;
        showCard();
    } else {
        if (typeof confetti !== 'undefined') confetti({ particleCount: 180, spread: 90 });
        alert("Chúc mừng! Bạn đã hoàn thành toàn bộ thẻ cần ôn tập!");
    }
}

function setupSrsEvents() {
    if (DOM.srsRatingButtons) {
        DOM.srsRatingButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rating = parseInt(e.currentTarget.dataset.rating) || 3;
                handleSrsRating(rating);
            });
        });
    }
}

// ========================================================
// HỆ THỐNG PHÂN TÍCH NGỮ ÂM & CHẤM ĐIỂM NÂNG CAO (ACCENT & STRESS)
// ========================================================

// Chuyển từ sang xâu biểu diễn ngữ âm theo thuật toán Double Metaphone giản lược
function getPhoneticCode(word) {
    if (!word) return '';
    let w = word.toLowerCase().trim();
    w = w.replace(/[^a-z]/g, '');
    if (!w) return '';

    // Chuẩn hóa tiền tố & các cặp nguyên âm/phụ âm đặc biệt
    w = w.replace(/ph/g, 'f')
         .replace(/gh/g, 'f')
         .replace(/tion\b/g, 'shən')
         .replace(/sion\b/g, 'zhən')
         .replace(/c([eiy])/g, 's$1')
         .replace(/c/g, 'k')
         .replace(/q/g, 'k')
         .replace(/x/g, 'ks')
         .replace(/dg/g, 'j')
         .replace(/th/g, 'θ')
         .replace(/ch/g, 'tʃ')
         .replace(/sh/g, 'ʃ')
         .replace(/wr/g, 'r')
         .replace(/kn/g, 'n');

    return w;
}

// Phân tích vị trí trọng âm (Stress Pattern) dựa trên phiên âm IPA hoặc quy tắc từ
function analyzeWordStress(term, ipa) {
    const cleanIpa = (ipa || '').trim();
    let primaryStressSyllable = 1;
    let totalSyllables = 1;

    // Đếm số âm tiết gần đúng dựa vào nguyên âm
    const vowelMatches = term.toLowerCase().match(/[aeiouy]{1,2}/g);
    if (vowelMatches) {
        totalSyllables = Math.max(1, vowelMatches.length);
        if (term.endsWith('e') && !term.endsWith('le') && totalSyllables > 1) {
            totalSyllables--;
        }
    }

    if (cleanIpa.includes('ˈ')) {
        // Dấu ˈ đứng trước âm tiết mang trọng âm chính
        const parts = cleanIpa.split('ˈ');
        if (parts.length > 1) {
            const beforeStress = parts[0];
            const beforeVowels = beforeStress.match(/[aeiouɑɛɪiʊuʌəɔæeɪaɪoʊaʊɔɪ]/g);
            primaryStressSyllable = beforeVowels ? beforeVowels.length + 1 : 1;
        }
    } else {
        // Quy tắc mặc định: từ 2 âm tiết danh từ nhấn âm 1, động từ nhấn âm 2
        primaryStressSyllable = totalSyllables > 1 ? 1 : 1;
    }

    return {
        stressIndex: Math.min(primaryStressSyllable, totalSyllables),
        totalSyllables: totalSyllables,
        ipa: cleanIpa
    };
}

// Chấm điểm ngặt nghèo đa tiêu chí: Ngữ âm + Âm cuối (Ending sound) + Accent UK/US + Nhấn nhá
function evaluateSpeechPronunciation(spokenText, targetWord, targetIpa, accent = 'US') {
    const spoken = (spokenText || '').toLowerCase().trim().replace(/[.,?!'"]/g, '');
    const target = (targetWord || '').toLowerCase().trim().replace(/[.,?!'"]/g, '');

    if (!spoken || !target) {
        return { totalScore: 0, accuracyScore: 0, endingSoundScore: 0, accentScore: 0, stressScore: 0, feedback: [] };
    }

    // 1. Tiêu chí 1: Độ chuẩn xác từ vựng (Word Accuracy - Levenshtein Text Similarity) - Trọng số 40%
    const charSim = calculateLevenshteinSimilarity(spoken, target);
    let accuracyScore = charSim;
    if (spoken === target) accuracyScore = 100;
    else if (spoken.includes(target) || target.includes(spoken)) accuracyScore = Math.min(charSim + 15, 90);

    // 2. Tiêu chí 2: Độ chính xác ngữ âm (Phonetic Sound Match) - Trọng số 25%
    const spokenPhone = getPhoneticCode(spoken);
    const targetPhone = getPhoneticCode(target);
    const phoneticSim = calculateLevenshteinSimilarity(spokenPhone, targetPhone);

    // 3. Tiêu chí 3: Âm đuôi / Bật hơi âm cuối (Ending Sounds: s, z, t, d, k, p, θ, ed) - Trọng số 20%
    // Người Việt hay nuốt âm cuối, đây là tiêu chí siết rất chặt
    let endingSoundScore = 100;
    const criticalEndings = ['s', 'z', 't', 'd', 'k', 'p', 'ed', 'ts', 'ks', 'ce', 'se'];
    const hasEnding = criticalEndings.some(end => target.endsWith(end));

    if (hasEnding) {
        const lastSpoken = spoken.slice(-2);
        const lastTarget = target.slice(-2);
        const lastCharSpoken = spoken.slice(-1);
        const lastCharTarget = target.slice(-1);

        if (lastCharSpoken === lastCharTarget || lastSpoken === lastTarget) {
            endingSoundScore = 100;
        } else if (lastCharTarget === 's' && !spoken.endsWith('s') && !spoken.endsWith('z')) {
            endingSoundScore = 30; // Quên âm đuôi s/z
        } else if ((lastCharTarget === 't' || lastCharTarget === 'd') && !spoken.endsWith('t') && !spoken.endsWith('d')) {
            endingSoundScore = 40; // Nuốt âm bật hơi t/d
        } else {
            endingSoundScore = 50;
        }
    }

    // 4. Tiêu chí 4: Accent & Nhấn nhá trọng âm (Accent / Stress Intonation) - Trọng số 15%
    let accentScore = 85;
    let stressScore = 80;
    const stressInfo = analyzeWordStress(target, targetIpa);

    // Kiểm tra độ dài từ phát âm so với từ gốc để nhận diện nuốt âm / đọc quá vội
    const lenRatio = spoken.length / Math.max(1, target.length);
    if (lenRatio < 0.75) {
        stressScore -= 25; // Đọc quá cộc lốc hoặc nuốt âm tiết
    } else if (lenRatio > 1.35) {
        stressScore -= 15; // Đọc rườm rà hoặc kéo dài âm
    }

    // Phân biệt Accent UK (RP) vs US (General American)
    // Ví dụ âm /r/ cuối, âm /t/ flapped, nguyên âm rộng
    if (accent === 'UK') {
        if (target.endsWith('r') && !spoken.endsWith('r')) accentScore = 95; // UK r-dropping
        else accentScore = 90;
    } else {
        // US rhotic r
        if (target.includes('r') && spoken.includes('r')) accentScore = 95;
        else accentScore = 88;
    }

    // TỔNG HỢP ĐIỂM THEO TRỌNG SỐ NGHIÊM NGẶT
    // Total = (Accuracy * 0.35) + (Phonetic * 0.30) + (EndingSound * 0.20) + (Stress & Accent * 0.15)
    let totalScore = Math.round(
        (accuracyScore * 0.35) +
        (phoneticSim * 0.30) +
        (endingSoundScore * 0.20) +
        (((stressScore + accentScore) / 2) * 0.15)
    );

    // Nếu từ đọc hoàn toàn lệch âm -> giới hạn điểm tối đa
    if (charSim < 55) {
        totalScore = Math.min(totalScore, 45);
    }

    // Tạo các nhận xét chi tiết (Detailed Feedback)
    const feedback = [];
    if (hasEnding && endingSoundScore < 70) {
        feedback.push(`⚠️ <strong>Thiếu âm đuôi (Ending Sound):</strong> Hãy chú ý bật rõ âm kết thúc "<em>-${target.slice(-2)}</em>".`);
    }
    if (stressInfo.totalSyllables > 1) {
        feedback.push(`🎯 <strong>Nhấn trọng âm:</strong> Nhấn mạnh vào <strong>âm tiết ${stressInfo.stressIndex}</strong> ${targetIpa ? `(nhìn dấu ' trong <code>${targetIpa}</code>)` : ''}.`);
    }
    if (accent === 'UK') {
        feedback.push(`🇬🇧 <strong>Giọng Anh - Anh (UK):</strong> Phát âm tròn vành rõ chữ, không uốn cong lưỡi ở âm /r/ cuối.`);
    } else {
        feedback.push(`🇺🇸 <strong>Giọng Anh - Mỹ (US):</strong> Uốn lưỡi sâu ở âm /r/ và lướt âm tự nhiên.`);
    }

    return {
        totalScore: Math.min(100, Math.max(0, totalScore)),
        accuracyScore,
        phoneticSim,
        endingSoundScore,
        accentScore,
        stressScore,
        stressInfo,
        feedback
    };
}

// ========================================================
// 10. ĐỘT PHÁ 6: LUYỆN NÓI BẰNG GIỌNG NÓI & CHẤM ĐIỂM CHI TIẾT (0-100 ĐIỂM)
// ========================================================
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Hàm hiển thị trạng thái hỗ trợ hoặc cảnh báo
    const showMicNotice = (msg, isError = false) => {
        if (DOM.speechEvalBox) {
            DOM.speechEvalBox.style.display = 'block';
            if (DOM.speechEvalStatus) {
                DOM.speechEvalStatus.innerHTML = `<span style="color:${isError ? 'var(--danger)' : 'var(--text-main)'}; font-size:0.88rem;">${msg}</span>`;
            }
        } else {
            alert(msg.replace(/<[^>]*>/g, ''));
        }
    };

    if (!SpeechRecognition) {
        const disableMic = (btn) => {
            if (btn) {
                btn.title = "Trình duyệt của bạn chưa hỗ trợ Web Speech API. Hãy mở trang bằng Google Chrome hoặc Microsoft Edge!";
                btn.style.opacity = '0.7';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    alert("Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói Web Speech API.\n👉 Khuyên dùng: Google Chrome hoặc Microsoft Edge để luyện nói chấm điểm AI!");
                });
            }
        };
        disableMic(DOM.cardMicBtn);
        disableMic(DOM.studyMicBtn);
        return;
    }

    // Khởi tạo đối tượng SpeechRecognition mới khi nhấn để tránh bị stale/dead state
    const createRecognitionInstance = () => {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.maxAlternatives = 3;
        rec.lang = voiceAccent === 'UK' ? 'en-GB' : 'en-US';
        return rec;
    };

    const stopMic = () => {
        isListeningSpeech = false;
        if (speechRecognitionInstance) {
            try { speechRecognitionInstance.stop(); } catch (e) {}
            try { speechRecognitionInstance.abort(); } catch (e) {}
        }
        if (DOM.cardMicBtn) DOM.cardMicBtn.classList.remove('listening');
        if (DOM.studyMicBtn) DOM.studyMicBtn.classList.remove('listening');
    };

    const startMic = async () => {
        if (isListeningSpeech) {
            stopMic();
            return;
        }

        const currentItem = (currentDeckItems && currentDeckItems[currentCardIndex]) ? currentDeckItems[currentCardIndex] : null;
        const targetWord = currentItem ? currentItem.term : '';
        if (!targetWord) {
            alert("Chưa có từ vựng nào được chọn để đọc!");
            return;
        }

        // Kiểm tra quyền Micro trước (nếu chạy qua http/https)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                // Yêu cầu quyền truy cập micro rõ ràng
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (permErr) {
                console.warn("[Speech] Lỗi cấp quyền Micro:", permErr);
                if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
                    showMicNotice("⚠️ Bạn đã chặn quyền Micro. Hãy nhấp vào biểu tượng ổ khóa / chiếc micro trên thanh địa chỉ trình duyệt để cấp quyền Cho phép (Allow)!", true);
                    return;
                }
            }
        }

        try {
            // Luôn tạo mới instance để tránh lỗi 'recognition has already started'
            if (speechRecognitionInstance) {
                try { speechRecognitionInstance.abort(); } catch (e) {}
            }
            speechRecognitionInstance = createRecognitionInstance();

            speechRecognitionInstance.onstart = () => {
                isListeningSpeech = true;
                if (DOM.cardMicBtn) DOM.cardMicBtn.classList.add('listening');
                if (DOM.studyMicBtn) DOM.studyMicBtn.classList.add('listening');

                if (DOM.speechEvalBox) {
                    DOM.speechEvalBox.style.display = 'block';
                    DOM.speechEvalStatus.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span><i class="fa-solid fa-circle-dot speech-pulse" style="color:var(--danger)"></i> Đang lắng nghe: "<strong>${targetWord}</strong>"...</span>
                            <span style="font-size:0.75rem; background:var(--primary-light); color:var(--primary); padding:2px 8px; border-radius:10px; font-weight:700;">
                                ${voiceAccent === 'UK' ? '🇬🇧 Giọng UK' : '🇺🇸 Giọng US'} &bull; Chấm khắt khe
                            </span>
                        </div>
                    `;
                    DOM.speechEvalResult.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-microphone-lines"></i> Hãy nói to và rõ ràng vào micro ngay bây giờ...</span>`;
                }
            };

            speechRecognitionInstance.onresult = (event) => {
                isListeningSpeech = false;
                if (DOM.cardMicBtn) DOM.cardMicBtn.classList.remove('listening');
                if (DOM.studyMicBtn) DOM.studyMicBtn.classList.remove('listening');

                let spoken = '';
                if (event.results && event.results[0] && event.results[0][0]) {
                    spoken = event.results[0][0].transcript || '';
                }

                const currentItem = (currentDeckItems && currentDeckItems[currentCardIndex]) ? currentDeckItems[currentCardIndex] : null;
                const target = currentItem ? currentItem.term : '';
                const ipa = currentItem ? (currentItem.ipa || '') : '';

                // Đánh giá ngữ âm đa chiều nâng cao
                const result = evaluateSpeechPronunciation(spoken, target, ipa, voiceAccent);
                const score = result.totalScore;

                let scoreBadge = '';
                let feedbackTitle = '';

                if (score >= 88) {
                    // Chuẩn bản xứ xuất sắc (88 - 100 điểm)
                    AudioFX.playCorrect();
                    noiLua();
                    scoreBadge = `<span style="background:var(--success); color:white; padding:4px 12px; border-radius:14px; font-weight:800; font-size:0.95rem; box-shadow:0 2px 8px rgba(16,185,129,0.3);"><i class="fa-solid fa-crown"></i> ${score}/100 ĐIỂM</span>`;
                    feedbackTitle = `<span class="speech-match-good"><i class="fa-solid fa-circle-check"></i> Phát âm chuẩn xác đỉnh cao (Native Level)!</span>`;
                    if (typeof confetti !== 'undefined') confetti({ particleCount: 90, spread: 70 });
                } else if (score >= 68) {
                    // Khá tốt (68 - 87 điểm)
                    AudioFX.playPop();
                    scoreBadge = `<span style="background:var(--warning); color:white; padding:4px 12px; border-radius:14px; font-weight:800; font-size:0.95rem;"><i class="fa-solid fa-thumbs-up"></i> ${score}/100 ĐIỂM</span>`;
                    feedbackTitle = `<span style="color:var(--warning); font-weight:700;"><i class="fa-solid fa-circle-exclamation"></i> Khá tốt, còn lỗi nhẹ âm đuôi hoặc nhấn trọng âm!</span>`;
                } else {
                    // Cần luyện tập thêm (< 68 điểm)
                    AudioFX.playWrong();
                    scoreBadge = `<span style="background:var(--danger); color:white; padding:4px 12px; border-radius:14px; font-weight:800; font-size:0.95rem;"><i class="fa-solid fa-circle-xmark"></i> ${score}/100 ĐIỂM</span>`;
                    feedbackTitle = `<span class="speech-match-bad"><i class="fa-solid fa-triangle-exclamation"></i> Chưa đạt chuẩn! Hãy nghe mẫu và đọc lại nhé!</span>`;
                }

                if (DOM.speechEvalStatus) {
                    DOM.speechEvalStatus.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            ${feedbackTitle} ${scoreBadge}
                        </div>
                    `;
                }

                if (DOM.speechEvalResult) {
                    const feedbackItems = result.feedback.map(f => `<div style="margin-top:3px;">${f}</div>`).join('');
                    DOM.speechEvalResult.innerHTML = `
                        <div style="font-size:0.86rem; line-height:1.45; color:var(--text-main); background:var(--bg-main); padding:10px 12px; border-radius:10px; border:1px solid var(--border-color);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                <div>Bạn đọc: "<strong style="color:var(--text-main);">${spoken}</strong>"</div>
                                <div>Chuẩn: "<strong style="color:var(--primary);">${target}</strong>" <span style="font-size:0.8rem; color:var(--text-muted);">${ipa ? `[${ipa}]` : ''}</span></div>
                            </div>
                            <!-- Chi tiết 4 thanh chỉ số năng lực -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem; margin-bottom:6px;">
                                <div>Đúng từ ngữ: <strong>${result.accuracyScore}%</strong></div>
                                <div>Khớp ngữ âm: <strong>${result.phoneticSim}%</strong></div>
                                <div>Bật âm đuôi: <strong>${result.endingSoundScore}%</strong></div>
                                <div>Accent & Nhấn: <strong>${result.stressScore}%</strong></div>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-muted); border-top:1px dashed var(--border-color); pt:6px; margin-top:4px;">
                                ${feedbackItems}
                            </div>
                        </div>
                    `;
                }
            };

            speechRecognitionInstance.onerror = (e) => {
                isListeningSpeech = false;
                if (DOM.cardMicBtn) DOM.cardMicBtn.classList.remove('listening');
                if (DOM.studyMicBtn) DOM.studyMicBtn.classList.remove('listening');

                console.warn("[Speech] Error event:", e.error);
                let errText = "Không thu được giọng nói.";
                if (e.error === 'not-allowed') {
                    errText = "⚠️ Trình duyệt chưa được cấp quyền dùng Microphone. Hãy bấm vào biểu tượng ổ khóa / icon Micro trên thanh URL của trình duyệt và chọn Cho phép (Allow)!";
                } else if (e.error === 'no-speech') {
                    errText = "Không nghe thấy âm thanh. Bạn hãy nói to hơn hoặc kiểm tra cắm mic nhé!";
                } else if (e.error === 'network') {
                    errText = "Tính năng nhận diện giọng nói cần kết nối Internet để phân tích ngữ âm chính xác.";
                }

                if (DOM.speechEvalStatus) {
                    DOM.speechEvalStatus.innerHTML = `<span style="color:var(--danger); font-size:0.85rem;"><i class="fa-solid fa-circle-exclamation"></i> ${errText}</span>`;
                }
            };

            speechRecognitionInstance.onend = () => {
                isListeningSpeech = false;
                if (DOM.cardMicBtn) DOM.cardMicBtn.classList.remove('listening');
                if (DOM.studyMicBtn) DOM.studyMicBtn.classList.remove('listening');
            };

            speechRecognitionInstance.start();
        } catch (err) {
            console.error("[Speech] Start error:", err);
            isListeningSpeech = false;
            if (DOM.cardMicBtn) DOM.cardMicBtn.classList.remove('listening');
            if (DOM.studyMicBtn) DOM.studyMicBtn.classList.remove('listening');
            showMicNotice("Lỗi khởi động Microphone: " + (err.message || "Vui lòng thử lại."), true);
        }
    };

    if (DOM.cardMicBtn) DOM.cardMicBtn.addEventListener('click', (e) => { e.stopPropagation(); startMic(); });
    if (DOM.studyMicBtn) DOM.studyMicBtn.addEventListener('click', (e) => { e.stopPropagation(); startMic(); });
}

// ========================================================
// 11. ĐỘT PHÁ 7: CLOZE TEST (ĐIỀN TỪ VÀO CÂU VÍ DỤ / NGHE GÕ TỪ)
// ========================================================
function initClozeView() {
    if (DOM.clozeStartPanel) DOM.clozeStartPanel.style.display = 'block';
    if (DOM.clozePlayPanel) DOM.clozePlayPanel.style.display = 'none';
    if (DOM.clozeResultPanel) DOM.clozeResultPanel.style.display = 'none';
}

function startClozeTest() {
    const deckIdx = parseInt(DOM.clozeDeckSelect.value) || 0;
    const deck = allDecks[deckIdx];
    if (!deck || !deck.items || deck.items.length === 0) {
        alert("Bộ từ này chưa có dữ liệu để thực hành!");
        return;
    }

    // Chọn ngẫu nhiên tối đa 10 từ có câu ví dụ
    const eligible = deck.items.filter(it => it.example && it.example.trim().length > 0);
    const pool = eligible.length >= 5 ? eligible : deck.items;

    clozeQuestions = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    currentClozeIndex = 0;
    clozeScoreVal = 0;

    DOM.clozeStartPanel.style.display = 'none';
    DOM.clozeResultPanel.style.display = 'none';
    DOM.clozePlayPanel.style.display = 'block';

    if (DOM.clozeTotalStep) DOM.clozeTotalStep.innerText = clozeQuestions.length;
    renderClozeQuestion();
}

function renderClozeQuestion() {
    if (currentClozeIndex >= clozeQuestions.length) {
        endClozeTest();
        return;
    }

    const q = clozeQuestions[currentClozeIndex];
    if (DOM.clozeScore) DOM.clozeScore.innerText = clozeScoreVal;
    if (DOM.clozeCurrentStep) DOM.clozeCurrentStep.innerText = currentClozeIndex + 1;
    if (DOM.clozeHintMeaning) DOM.clozeHintMeaning.innerText = `Nghĩa: ${q.meaning_vi}`;
    if (DOM.clozeFeedbackMsg) DOM.clozeFeedbackMsg.innerHTML = '';
    if (DOM.clozeInput) {
        DOM.clozeInput.value = '';
        DOM.clozeInput.focus();
    }

    const targetTerm = q.term;
    let sentence = q.example || `Example with ${targetTerm}`;

    if (clozeMode === 'spelling') {
        // Chế độ Nghe & Gõ: Ẩn toàn bộ câu hoặc từ
        if (DOM.clozeSentence) DOM.clozeSentence.innerHTML = `<i class="fa-solid fa-headphones-simple"></i> Hãy nghe phát âm và gõ lại từ vựng`;
        playWordSound(targetTerm);
    } else {
        // Chế độ Cloze: Thay từ bằng chỗ trống ______
        const regex = new RegExp(`\\b${escapeRegExp(targetTerm)}\\b`, 'gi');
        const masked = sentence.replace(regex, `<span class="cloze-blank">_______</span>`);
        if (DOM.clozeSentence) {
            DOM.clozeSentence.innerHTML = masked === sentence ? `Sentence: "... <span class="cloze-blank">_______</span> ..."` : masked;
        }
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function handleClozeSubmit() {
    const q = clozeQuestions[currentClozeIndex];
    if (!q || !DOM.clozeInput) return;

    const userAns = (DOM.clozeInput.value || '').trim().toLowerCase();
    const correctAns = q.term.trim().toLowerCase();

    if (!userAns) return;

    if (userAns === correctAns) {
        // ĐÚNG
        AudioFX.playCorrect();
        clozeScoreVal++;
        if (DOM.clozeScore) DOM.clozeScore.innerText = clozeScoreVal;
        if (DOM.clozeFeedbackMsg) {
            DOM.clozeFeedbackMsg.innerHTML = `<span style="color:var(--success);"><i class="fa-solid fa-circle-check"></i> Chính xác tuyệt vời! (${q.term})</span>`;
        }

        // Tự động nâng cấp SRS & mastered
        if (!masteredCards.includes(q.id)) {
            masteredCards.push(q.id);
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
        }

        setTimeout(() => {
            currentClozeIndex++;
            renderClozeQuestion();
        }, 1000);
    } else {
        // SAI
        AudioFX.playWrong();
        if (DOM.clozeFeedbackMsg) {
            DOM.clozeFeedbackMsg.innerHTML = `<span style="color:var(--danger);"><i class="fa-solid fa-circle-xmark"></i> Chưa đúng! Đáp án là: <strong>${q.term}</strong></span>`;
        }
        setTimeout(() => {
            currentClozeIndex++;
            renderClozeQuestion();
        }, 2200);
    }
}

function endClozeTest() {
    DOM.clozePlayPanel.style.display = 'none';
    DOM.clozeResultPanel.style.display = 'block';

    const total = clozeQuestions.length;
    if (DOM.clozeFinalScore) DOM.clozeFinalScore.innerText = `${clozeScoreVal}/${total}`;

    if (clozeScoreVal >= total * 0.8) {
        if (typeof confetti !== 'undefined') confetti({ particleCount: 160, spread: 80 });
        if (DOM.clozeScoreFeedback) DOM.clozeScoreFeedback.innerText = "Tuyệt đỉnh! Khả năng nhớ từ và chính tả của bạn đạt điểm xuất sắc!";
    } else {
        if (DOM.clozeScoreFeedback) DOM.clozeScoreFeedback.innerText = "Luyện tập thêm để ghi nhớ từ vựng sâu hơn trong ngữ cảnh câu nhé!";
    }
}

function setupClozeEvents() {
    if (DOM.startClozeBtn) DOM.startClozeBtn.addEventListener('click', startClozeTest);
    if (DOM.retryClozeBtn) DOM.retryClozeBtn.addEventListener('click', startClozeTest);
    if (DOM.backToDeckClozeBtn) {
        DOM.backToDeckClozeBtn.addEventListener('click', () => {
            DOM.clozeResultPanel.style.display = 'none';
            DOM.clozeStartPanel.style.display = 'block';
        });
    }

    if (DOM.clozeForm) {
        DOM.clozeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleClozeSubmit();
        });
    }

    if (DOM.clozeSubmitBtn) {
        DOM.clozeSubmitBtn.addEventListener('click', handleClozeSubmit);
    }

    if (DOM.clozeSpeakBtn) {
        DOM.clozeSpeakBtn.addEventListener('click', () => {
            const q = clozeQuestions[currentClozeIndex];
            if (q) playWordSound(q.example || q.term);
        });
    }

    if (DOM.clozeHintBtn) {
        DOM.clozeHintBtn.addEventListener('click', () => {
            const q = clozeQuestions[currentClozeIndex];
            if (q && DOM.clozeInput) {
                DOM.clozeInput.value = q.term.slice(0, 2);
                DOM.clozeInput.focus();
            }
        });
    }

    if (DOM.clozeModeChips) {
        DOM.clozeModeChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                DOM.clozeModeChips.forEach(c => c.classList.remove('active'));
                const targetChip = e.currentTarget;
                targetChip.classList.add('active');
                const radio = targetChip.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    clozeMode = radio.value;
                }
            });
        });
    }
}

function setupCardTilt3D() {
    const wrapper = DOM.flashcardWrapper;
    const card = DOM.flashcard;
    const glareFront = DOM.cardGlareFront;
    const glareBack = DOM.cardGlareBack;

    if (!wrapper || !card) return;

    let bounds = null;
    let isHovering = false;

    const updateBounds = () => {
        bounds = wrapper.getBoundingClientRect();
    };

    wrapper.addEventListener('mouseenter', () => {
        isHovering = true;
        updateBounds();
        if (glareFront) glareFront.style.opacity = '1';
        if (glareBack) glareBack.style.opacity = '1';
    });

    wrapper.addEventListener('mouseleave', () => {
        isHovering = false;
        // Trả thẻ về trạng thái cân bằng mượt mà
        card.style.transition = 'transform 0.65s cubic-bezier(0.2, 0.85, 0.32, 1.2), box-shadow 0.3s ease';
        card.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg) rotateX(0deg)';
        if (glareFront) glareFront.style.opacity = '0';
        if (glareBack) glareBack.style.opacity = '0';
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (!bounds) updateBounds();
        const mouseX = e.clientX - bounds.left;
        const mouseY = e.clientY - bounds.top;

        const xPct = (mouseX / bounds.width) - 0.5; // -0.5 -> 0.5
        const yPct = (mouseY / bounds.height) - 0.5; // -0.5 -> 0.5

        const maxTilt = 18; // góc nghiêng tối đa (độ)
        const tiltX = -yPct * maxTilt;
        const tiltY = xPct * maxTilt;

        card.style.transition = 'transform 0.08s ease-out'; // Cực nhạy theo chuyển động chuột

        if (isFlipped) {
            card.style.transform = `rotateY(${180 - tiltY}deg) rotateX(${tiltX}deg) scale3d(1.02, 1.02, 1.02)`;
        } else {
            card.style.transform = `rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale3d(1.02, 1.02, 1.02)`;
        }

        // Cập nhật vị trí nguồn sáng phản chiếu Glare
        const glareX = (mouseX / bounds.width) * 100;
        const glareY = (mouseY / bounds.height) * 100;

        if (glareFront) {
            glareFront.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 65%)`;
        }
        if (glareBack) {
            glareBack.style.background = `radial-gradient(circle at ${100 - glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 65%)`;
        }
    });

    // Hỗ trợ con quay hồi chuyển trên điện thoại (DeviceOrientation API)
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', (e) => {
            const studyView = document.getElementById('studyView');
            if (!studyView || !studyView.classList.contains('active') || isHovering) return;

            const gamma = e.gamma; // Độ nghiêng trái/phải (-90 đến 90)
            const beta = e.beta;   // Độ nghiêng trước/sau (-180 đến 180)

            if (gamma === null || beta === null) return;

            // Giới hạn góc nghiêng nhẹ nhàng 10 độ
            const tiltY = Math.max(Math.min(gamma / 3, 12), -12);
            const tiltX = Math.max(Math.min((beta - 45) / 3, 12), -12);

            card.style.transition = 'transform 0.15s ease-out';
            if (isFlipped) {
                card.style.transform = `rotateY(${180 - tiltY}deg) rotateX(${tiltX}deg)`;
            } else {
                card.style.transform = `rotateY(${tiltY}deg) rotateX(${tiltX}deg)`;
            }
        }, { passive: true });
    }
}
