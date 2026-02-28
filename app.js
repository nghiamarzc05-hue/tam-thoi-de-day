// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH
// =========================================

// 1. GỘP DỮ LIỆU TỪ CÁC FILE GROUP (Kiểm tra an toàn)
let allDecks = [];
if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);

// 2. BIẾN TRẠNG THÁI (STATE)
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];

// 3. KẾT NỐI DOM ELEMENTS
const DOM = {
    // Views
    views: document.querySelectorAll('.view-section'),
    navItems: document.querySelectorAll('.nav-item'),
    viewTitle: document.getElementById('viewTitle'),
    
    // Lists
    deckList: document.getElementById('deckList'),
    mobileDeckList: document.getElementById('mobileDeckList'),
    
    // Flashcard Elements
    flashcard: document.getElementById('flashcard'),
    cardPos: document.getElementById('cardPos'),
    cardWord: document.getElementById('cardWord'),
    cardIpa: document.getElementById('cardIpa'),
    cardMeaning: document.getElementById('cardMeaning'),
    cardExample: document.getElementById('cardExample'),
    cardExampleVi: document.getElementById('cardExampleVi'),
    
    // Buttons
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    masterBtn: document.getElementById('masterBtn'),
    notMasteredBtn: document.getElementById('notMasteredBtn'),
    speakBtn: document.getElementById('speakBtn'),
    themeToggle: document.getElementById('themeToggle'),
    
    // Stats
    statMastered: document.getElementById('statMastered'),
    statProgress: document.getElementById('statProgress')
};

// 4. KHỞI TẠO ỨNG DỤNG
function initApp() {
    renderDeckList();
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
    
    // Khôi phục theme (Light/Dark)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// 5. HIỂN THỊ DANH SÁCH BÀI HỌC Ở SIDEBAR & THƯ VIỆN
function renderDeckList() {
    DOM.deckList.innerHTML = '';
    DOM.mobileDeckList.innerHTML = '';
    
    if (allDecks.length === 0) {
        DOM.deckList.innerHTML = '<li style="padding:15px">Chưa có dữ liệu. Hãy kiểm tra các file group.js</li>';
        return;
    }

    allDecks.forEach((deck, index) => {
        // Tạo HTML cho từng bài học
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `<i class="fa-solid fa-folder-open" style="margin-right: 10px; opacity: 0.7;"></i> ${deck.ten} <span style="font-size: 0.8rem; color: var(--text-muted); float: right;">${deck.items.length} từ</span>`;
        
        // Clone cho mobile
        const liMobile = li.cloneNode(true);

        // Sự kiện khi bấm vào bài học
        const loadDeck = () => {
            currentDeck = deck;
            currentCardIndex = 0;
            switchView('study'); // Chuyển sang màn hình học
            DOM.viewTitle.innerText = deck.ten;
            loadCard();
            
            // Đánh dấu active
            document.querySelectorAll('.deck-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            liMobile.classList.add('active');
        };

        li.addEventListener('click', loadDeck);
        liMobile.addEventListener('click', loadDeck);
        
        DOM.deckList.appendChild(li);
        DOM.mobileDeckList.appendChild(liMobile);
    });
}

// 6. CHUYỂN ĐỔI GIỮA CÁC MÀN HÌNH (TABS)
function setupNavigation() {
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
            
            // Cập nhật tiêu đề trên header
            const titleMap = {
                'dashboard': 'Trang chủ',
                'study': currentDeck ? currentDeck.ten : 'Học tập',
                'review': 'Ôn tập',
                'library': 'Thư viện',
                'settings': 'Cài đặt'
            };
            DOM.viewTitle.innerText = titleMap[viewId] || 'Flashcards Pro';
        });
    });
}

function switchView(viewId) {
    // Ẩn tất cả view
    DOM.views.forEach(view => view.classList.remove('active'));
    // Hiện view mục tiêu
    document.getElementById(viewId + 'View').classList.add('active');
    
    // Đổi trạng thái nút bấm Nav
    DOM.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        }
    });
}

// 7. HIỂN THỊ THẺ FLASHCARD
function loadCard() {
    if (!currentDeck || currentDeck.items.length === 0) return;
    
    const card = currentDeck.items[currentCardIndex];
    
    // Mặt trước
    DOM.cardWord.innerText = card.term;
    if (card.pos) {
        DOM.cardPos.innerText = card.pos;
        DOM.cardPos.classList.add('show');
    } else {
        DOM.cardPos.classList.remove('show');
    }
    
    if (card.ipa) {
        DOM.cardIpa.innerText = card.ipa;
        DOM.cardIpa.classList.add('show');
    } else {
        DOM.cardIpa.classList.remove('show');
    }

    // Mặt sau
    DOM.cardMeaning.innerText = card.meaning_vi;
    if (card.example) {
        DOM.cardExample.innerText = card.example;
        DOM.cardExample.classList.add('show');
    } else {
        DOM.cardExample.classList.remove('show');
    }

    // Reset thẻ về mặt trước
    isFlipped = false;
    DOM.flashcard.classList.remove('is-flipped');
}

// 8. CÁC SỰ KIỆN NÚT BẤM (Event Listeners)
function setupEventListeners() {
    // Bấm vào thẻ để lật
    DOM.flashcard.addEventListener('click', () => {
        isFlipped = !isFlipped;
        DOM.flashcard.classList.toggle('is-flipped');
    });

    // Nút Next / Prev
    DOM.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Ngăn lật thẻ khi bấm nút
        if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
            currentCardIndex++;
            loadCard();
        }
    });

    DOM.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentDeck && currentCardIndex > 0) {
            currentCardIndex--;
            loadCard();
        }
    });

    // Đọc phát âm
    DOM.speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentDeck) {
            const word = currentDeck.items[currentCardIndex].term;
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    });

    // Nút Đã thuộc (Master)
    DOM.masterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentDeck) {
            const wordId = currentDeck.items[currentCardIndex].id;
            if (!masteredCards.includes(wordId)) {
                masteredCards.push(wordId);
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                updateDashboardStats();
            }
            // Tự động nhảy sang thẻ tiếp theo
            DOM.nextBtn.click();
        }
    });

    // Dark/Light Mode Toggle
    DOM.themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// 9. CẬP NHẬT THỐNG KÊ TRANG CHỦ
function updateDashboardStats() {
    DOM.statMastered.innerText = `${masteredCards.length} Từ`;
    
    // Tính tổng số từ trong tất cả các file
    let totalWords = 0;
    allDecks.forEach(deck => totalWords += deck.items.length);
    
    if (totalWords > 0) {
        const percent = Math.round((masteredCards.length / totalWords) * 100);
        DOM.statProgress.innerText = `${percent}%`;
    }
}

// CHẠY ỨNG DỤNG KHI WEB TẢI XONG
window.addEventListener('DOMContentLoaded', initApp);
