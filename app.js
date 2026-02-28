// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH
// =========================================

// 1. GỘP DỮ LIỆU TỪ CÁC FILE GROUP (Kiểm tra an toàn)
let allDecks = [];

// Hàm hỗ trợ gộp dữ liệu từ các biến global được định nghĩa trong các file group_x.js
function mergeData() {
    const dataSources = [
        { name: 'group_1_decks', data: typeof group_1_decks !== 'undefined' ? group_1_decks : [] },
        { name: 'group_2_decks', data: typeof group_2_decks !== 'undefined' ? group_2_decks : [] },
        { name: 'group_3_decks', data: typeof group_3_decks !== 'undefined' ? group_3_decks : [] },
        { name: 'group_4_decks', data: typeof group_4_decks !== 'undefined' ? group_4_decks : [] }
    ];

    dataSources.forEach(source => {
        if (source.data.length > 0) {
            allDecks = allDecks.concat(source.data);
        } else {
            console.warn(`Cảnh báo: Nguồn dữ liệu ${source.name} trống hoặc chưa được nạp.`);
        }
    });

    // Hỗ trợ cấu trúc dữ liệu kiểu mới (FLASHCARD_TOPIC_DATA) nếu có
    if (typeof window.FLASHCARD_TOPIC_DATA !== 'undefined') {
        Object.values(window.FLASHCARD_TOPIC_DATA).forEach(topic => {
            allDecks.push(topic);
        });
    }
}

mergeData();

// 2. BIẾN TRẠNG THÁI (STATE)
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];

// 3. KẾT NỐI DOM ELEMENTS
const DOM = {
    views: document.querySelectorAll('.view-section'),
    navItems: document.querySelectorAll('.nav-item'),
    viewTitle: document.getElementById('viewTitle'),
    deckList: document.getElementById('deckList'),
    mobileDeckList: document.getElementById('mobileDeckList'),
    flashcard: document.getElementById('flashcard'),
    cardPos: document.getElementById('cardPos'),
    cardWord: document.getElementById('cardWord'),
    cardIpa: document.getElementById('cardIpa'),
    cardMeaning: document.getElementById('cardMeaning'),
    cardExample: document.getElementById('cardExample'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    speakBtn: document.getElementById('speakBtn'),
    masterBtn: document.getElementById('masterBtn'),
    themeToggle: document.getElementById('themeToggle'),
    statMastered: document.getElementById('statMastered'),
    statProgress: document.getElementById('statProgress')
};

// 4. KHỞI TẠO APP
function init() {
    renderDeckList();
    setupEventListeners();
    updateDashboardStats();
    
    // Mặc định hiển thị trang chủ
    switchView('dashboard');
}

// 5. HIỂN THỊ DANH SÁCH BÀI HỌC (Render Decks)
function renderDeckList() {
    const html = allDecks.map((deck, index) => `
        <li class="deck-item squircle" onclick="startStudy(${index})">
            <div class="deck-info">
                <h4>${deck.ten || deck.topicId}</h4>
                <span>${deck.items.length} từ vựng</span>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
        </li>
    `).join('');

    if(DOM.deckList) DOM.deckList.innerHTML = html;
    if(DOM.mobileDeckList) DOM.mobileDeckList.innerHTML = html;
}

// 6. LOGIC HỌC TẬP (Study Logic)
function startStudy(deckIndex) {
    currentDeck = allDecks[deckIndex];
    currentCardIndex = 0;
    isFlipped = false;
    switchView('study');
    updateCard();
}

function updateCard() {
    if (!currentDeck) return;
    const card = currentDeck.items[currentCardIndex];
    
    // Reset mặt thẻ
    DOM.flashcard.classList.remove('flipped');
    isFlipped = false;

    // Cập nhật nội dung
    DOM.cardPos.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
    DOM.cardWord.innerText = card.term;
    DOM.cardIpa.innerText = card.ipa || '';
    DOM.cardMeaning.innerText = card.meaning_vi;
    DOM.cardExample.innerText = card.example || '';
}

// 7. ĐIỀU HƯỚNG GIAO DIỆN
function switchView(viewId) {
    DOM.views.forEach(view => {
        view.classList.remove('active');
        if (view.id === viewId + 'View') view.classList.add('active');
    });
    
    DOM.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewId) item.classList.add('active');
    });

    const titles = { 'dashboard': 'Trang chủ', 'study': 'Học tập', 'library': 'Thư viện', 'settings': 'Cài đặt' };
    if(DOM.viewTitle) DOM.viewTitle.innerText = titles[viewId] || 'Flashcards';
}

// 8. SỰ KIỆN (Events)
function setupEventListeners() {
    // Lật thẻ
    DOM.flashcard.addEventListener('click', () => {
        isFlipped = !isFlipped;
        DOM.flashcard.classList.toggle('flipped', isFlipped);
    });

    // Chuyển thẻ
    DOM.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentCardIndex < currentDeck.items.length - 1) {
            currentCardIndex++;
            updateCard();
        }
    });

    DOM.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentCardIndex > 0) {
            currentCardIndex--;
            updateCard();
        }
    });

    // Phát âm
    DOM.speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = currentDeck.items[currentCardIndex].term;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    });

    // Đã thuộc
    DOM.masterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = currentDeck.items[currentCardIndex].id;
        if (!masteredCards.includes(wordId)) {
            masteredCards.push(wordId);
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
            updateDashboardStats();
        }
        DOM.nextBtn.click();
    });

    // Chuyển View từ Nav
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });
}

function updateDashboardStats() {
    if(DOM.statMastered) DOM.statMastered.innerText = `${masteredCards.length} Từ`;
    
    let totalWords = 0;
    allDecks.forEach(deck => totalWords += deck.items.length);
    
    if (totalWords > 0 && DOM.statProgress) {
        const percent = Math.round((masteredCards.length / totalWords) * 100);
        DOM.statProgress.innerText = `${percent}%`;
    }
}

// Chạy ứng dụng
document.addEventListener('DOMContentLoaded', init);
