(function() {
    // --- 1. STATE & DOM ---
    const state = {
        learningLang: 'en-US', meaningLang: 'vi-VN', topics: [], items: [],
        currentView: 'dashboard', currentTopicId: null, currentWordIndex: 0,
        isListening: false, reviewWords: [], stats: { streak: 0, lastDate: null, mastered: {} }
    };

    const getEl = id => document.getElementById(id);
    const DOM = {
        themeToggle: getEl('themeToggle'), deckList: getEl('deckList'), mobileDeckList: getEl('mobileDeckList'),
        dashboardView: getEl('dashboardView'), studyView: getEl('studyView'), reviewView: getEl('reviewView'), 
        libraryView: getEl('libraryView'), settingsView: getEl('settingsView'),
        statMastered: getEl('statMastered'), statProgress: getEl('statProgress'), statStreak: getEl('statStreak'),
        flashcard: getEl('flashcard'), swipeZone: getEl('swipeZone'),
        cardWord: getEl('cardWord'), cardPos: getEl('cardPos'), cardIpa: getEl('cardIpa'),
        cardMeaning: getEl('cardMeaning'), cardExample: getEl('cardExample'), cardExampleVi: getEl('cardExampleVi'),
        prevBtn: getEl('prevBtn'), nextBtn: getEl('nextBtn'), speakBtn: getEl('speakBtn'), 
        masterBtn: getEl('masterBtn'), notMasteredBtn: getEl('notMasteredBtn'),
        listenModeBtn: getEl('listenModeBtn'), listenText: getEl('listenText'),
        importBtn: getEl('importBtn'), importFile: getEl('importFile'), resetStatsBtn: getEl('resetStatsBtn')
    };

    // Mở khóa Audio trên Mobile
    let audioUnlocked = false;
    const unlockAudio = () => {
        if (!audioUnlocked && window.speechSynthesis) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            audioUnlocked = true;
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // --- 2. KHỞI TẠO DỮ LIỆU ---
    function init() {
        try { const s = localStorage.getItem('flashcardStats'); if(s) state.stats = JSON.parse(s); } catch(e){}
        
        // Đọc dữ liệu từ 4 file group_x.js đã nạp sẵn ở HTML
        if (window.FLASHCARD_TOPIC_DATA) {
            state.topics = [];
            state.items = [];
            
            for (const key in window.FLASHCARD_TOPIC_DATA) {
                const topicObj = window.FLASHCARD_TOPIC_DATA[key];
                
                // Tự động chuyển đổi ID (vd: "daily_conversation") thành Tên (vd: "Daily Conversation")
                let displayName = topicObj.topicId
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                state.topics.push({ id: topicObj.topicId, ten: displayName });
                if (topicObj.items) state.items.push(...topicObj.items);
            }
        }
        
        renderTopics(state.topics, DOM.deckList);
        renderTopics(state.topics, DOM.mobileDeckList);
        updateDashboard();
        
        const th = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', th);
        DOM.themeToggle.innerHTML = th === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    function updateDashboard() {
        let totalMastered = 0;
        for (const tId in state.stats.mastered) totalMastered += state.stats.mastered[tId].length;
        DOM.statMastered.innerText = `${totalMastered} Từ`;
        DOM.statProgress.innerText = state.items.length ? `${Math.round((totalMastered / state.items.length)*100)}%` : '0%';
        DOM.statStreak.innerText = `${state.stats.streak} Ngày`;
    }

    // --- 3. ĐIỀU HƯỚNG ---
    function switchView(viewName) {
        state.currentView = viewName;
        window.speechSynthesis.cancel();
        
        ['dashboard', 'study', 'review', 'library', 'settings'].forEach(v => {
            if(DOM[`${v}View`]) DOM[`${v}View`].classList.remove('active');
        });
        if (DOM[`${viewName}View`]) DOM[`${viewName}View`].classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`[data-view="${viewName}"]`).forEach(el => el.classList.add('active'));

        if (viewName === 'study') {
            if(state.currentTopicId) updateCardUI();
            else {
                DOM.cardWord.textContent = "Hãy chọn Chủ đề trong Thư viện!";
                DOM.flashcard.classList.remove('is-flipped');
            }
        } else if (viewName === 'review') {
            loadReviewMode();
        }
    }

    function renderTopics(topics, container) {
        if(!container) return;
        container.innerHTML = '';
        topics.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'deck-item'; btn.innerText = t.ten;
            btn.onclick = () => {
                state.currentTopicId = t.id; state.currentWordIndex = 0;
                document.querySelectorAll('.deck-item').forEach(b => b.classList.remove('active'));
                
                const allTopicBtns = document.querySelectorAll('.deck-item');
                allTopicBtns.forEach(b => { if (b.innerText === t.ten) b.classList.add('active'); });
                
                switchView('study');
            };
            container.appendChild(btn);
        });
    }

    function getWordsForCurrentView() {
        if (state.currentView === 'study') return state.items.filter(i => i.topicId === state.currentTopicId);
        else if (state.currentView === 'review') return state.reviewWords;
        return [];
    }

    // --- 4. LẬT THẺ & NÚT BẤM ---
    function updateCardUI() {
        const words = getWordsForCurrentView();
        if (words.length === 0) {
            DOM.cardWord.textContent = "Trống!";
            DOM.cardMeaning.textContent = "";
            DOM.cardPos.classList.remove('show');
            DOM.cardIpa.classList.remove('show');
            DOM.cardExample.classList.remove('show');
            return;
        }
        
        const word = words[state.currentWordIndex];
        DOM.flashcard.classList.remove('is-flipped');
        
        DOM.cardWord.textContent = word.term || '';
        DOM.cardMeaning.textContent = word.meaning_vi || '';
        
        if(word.pos) { DOM.cardPos.textContent = word.pos; DOM.cardPos.classList.add('show'); } else DOM.cardPos.classList.remove('show');
        if(word.ipa) { DOM.cardIpa.textContent = word.ipa; DOM.cardIpa.classList.add('show'); } else DOM.cardIpa.classList.remove('show');
        if(word.example) { DOM.cardExample.textContent = word.example; DOM.cardExample.classList.add('show'); } else DOM.cardExample.classList.remove('show');

        // Reset màu nút
        DOM.masterBtn.className = 'btn-squircle btn-outline';
        DOM.masterBtn.innerHTML = '<i class="fa-solid fa-check"></i> Thuộc';
        DOM.notMasteredBtn.className = 'btn-squircle btn-outline';
        DOM.notMasteredBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Chưa';

        const tId = word.topicId;
        const masteredList = state.stats.mastered[tId] || [];
        if (masteredList.includes(word.id)) {
            DOM.masterBtn.className = 'btn-squircle btn-success';
            DOM.masterBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Thuộc';
        }
    }

    function changeCard(dir) {
        const words = getWordsForCurrentView();
        if(words.length === 0) return alert('Chưa có từ vựng!');
        
        let newIdx = state.currentWordIndex + dir;
        if(newIdx >= words.length) newIdx = 0;
        if(newIdx < 0) newIdx = words.length - 1;

        if (DOM.flashcard.classList.contains('is-flipped')) {
            DOM.flashcard.classList.remove('is-flipped');
            setTimeout(() => { state.currentWordIndex = newIdx; updateCardUI(); }, 250);
        } else {
            state.currentWordIndex = newIdx; updateCardUI();
        }
    }

    function markMastered() {
        const words = getWordsForCurrentView();
        if(words.length === 0) return alert('Chưa có từ vựng!');
        const wordObj = words[state.currentWordIndex];
        const tId = wordObj.topicId;

        if (!state.stats.mastered[tId]) state.stats.mastered[tId] = [];
        if (!state.stats.mastered[tId].includes(wordObj.id)) {
            state.stats.mastered[tId].push(wordObj.id);
            localStorage.setItem('flashcardStats', JSON.stringify(state.stats));
            updateDashboard();
        }
        updateCardUI(); 
        setTimeout(() => changeCard(1), 300); 
    }

    function markNotMastered() {
        const words = getWordsForCurrentView();
        if(words.length === 0) return;
        const wordObj = words[state.currentWordIndex];
        const tId = wordObj.topicId;

        if (state.stats.mastered[tId]) {
            const idx = state.stats.mastered[tId].indexOf(wordObj.id);
            if (idx > -1) {
                state.stats.mastered[tId].splice(idx, 1);
                localStorage.setItem('flashcardStats', JSON.stringify(state.stats));
                updateDashboard();
            }
        }
        updateCardUI(); 
        DOM.notMasteredBtn.className = 'btn-squircle btn-danger';
        setTimeout(() => changeCard(1), 300); 
    }

    function loadReviewMode() {
        state.currentTopicId = 'review'; 
        state.currentWordIndex = 0; 
        state.reviewWords = [];
        for (const tId in state.stats.mastered) {
            const masteredWordIds = state.stats.mastered[tId];
            const masteredWords = state.items.filter(i => i.topicId === tId && masteredWordIds.includes(i.id));
            state.reviewWords.push(...masteredWords);
        }
        if(state.reviewWords.length > 0) {
            DOM.viewTitle.innerText = `Ôn tập (${state.reviewWords.length} từ)`;
            updateCardUI();
        } else {
            DOM.viewTitle.innerText = 'Ôn tập (Trống)';
            DOM.cardWord.textContent = "Tuyệt! Không có từ cần ôn.";
            DOM.cardPos.classList.remove('show'); DOM.cardIpa.classList.remove('show');
            DOM.flashcard.classList.remove('is-flipped');
        }
    }

    // --- 5. EVENT LISTENERS ---
    DOM.themeToggle.addEventListener('click', () => {
        const doc = document.documentElement;
        const newTheme = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        doc.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        DOM.themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => switchView(e.currentTarget.getAttribute('data-view')));
    });

    DOM.flashcard.addEventListener('click', (e) => {
        if(window.getSelection().toString().length > 0) return; 
        if(e.target.closest('button')) return; 
        DOM.flashcard.classList.toggle('is-flipped');
    });

    DOM.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); changeCard(-1); });
    DOM.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); changeCard(1); });
    DOM.masterBtn.addEventListener('click', (e) => { e.stopPropagation(); markMastered(); });
    DOM.notMasteredBtn.addEventListener('click', (e) => { e.stopPropagation(); markNotMastered(); });

    DOM.speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const words = getWordsForCurrentView();
        if(words.length) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(words[state.currentWordIndex].term);
            utter.lang = state.learningLang;
            window.speechSynthesis.speak(utter);
        }
    });

    DOM.resetStatsBtn.addEventListener('click', () => {
        if(confirm('Xóa sạch dữ liệu học tập?')) {
            state.stats = { streak: 0, lastDate: null, mastered: {} };
            localStorage.setItem('flashcardStats', JSON.stringify(state.stats));
            updateDashboard();
        }
    });

    let touchStartX = 0;
    DOM.swipeZone.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    DOM.swipeZone.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) changeCard(1);
        if (touchEndX > touchStartX + 50) changeCard(-1);
    }, {passive: true});

    init();
})();
