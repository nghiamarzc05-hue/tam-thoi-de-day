// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH
// =========================================

// 1. BIẾN TRẠNG THÁI (STATE)
let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];

// Khai báo biến DOM (sẽ được gán giá trị sau khi trang tải xong)
let DOM = {};

// 2. KHỞI TẠO ỨNG DỤNG (Chạy khi HTML đã tải xong)
document.addEventListener('DOMContentLoaded', () => {
    // Tải dữ liệu từ LocalStorage
    try {
        masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];
    } catch (e) {
        masteredCards = [];
        console.error("Lỗi khi đọc LocalStorage:", e);
    }

    // Gán các phần tử DOM
    initDOM();
    
    // Gộp dữ liệu từ các file group
    mergeData();

    // Khởi tạo giao diện và sự kiện
    renderDeckList();
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
    
    // Khôi phục theme (Light/Dark)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// 3. HÀM KHỞI TẠO DOM ELEMENTS
function initDOM() {
    DOM = {
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
}

// 4. GỘP DỮ LIỆU TỪ CÁC FILE GROUP
function mergeData() {
    allDecks = [];
    if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
    if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
    if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
    if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);

    if (allDecks.length === 0) {
        console.warn("Chưa có dữ liệu. Vui lòng kiểm tra các file group_x.js");
    }
}

// 5. HIỂN THỊ DANH SÁCH BÀI HỌC Ở SIDEBAR & THƯ VIỆN
function renderDeckList() {
    if (!DOM.deckList || !DOM.mobileDeckList) return;

    DOM.deckList.innerHTML = '';
    DOM.mobileDeckList.innerHTML = '';
    
    if (allDecks.length === 0) {
        DOM.deckList.innerHTML = '<li style="padding:15px">Chưa có dữ liệu. Hãy kiểm tra các file group.js</li>';
        return;
    }

    allDecks.forEach((deck) => {
        // Tạo HTML cho từng bài học
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `<i class="fa-solid fa-folder-open" style="margin-right: 10px; opacity: 0.7;"></i> ${deck.ten} <span style="font-size: 0.8rem; color: var(--text-muted); float: right;">${deck.items ? deck.items.length : 0} từ</span>`;
        
        // Clone cho mobile
        const liMobile = li.cloneNode(true);

        // Sự kiện khi bấm vào bài học
        const loadDeck = () => {
            currentDeck = deck;
            currentCardIndex = 0;
            switchView('study'); // Chuyển sang màn hình học
            if (DOM.viewTitle) DOM.viewTitle.innerText = deck.ten;
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
    if (!DOM.navItems) return;

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
            if (DOM.viewTitle) DOM.viewTitle.innerText = titleMap[viewId] || 'Flashcards Pro';
        });
    });
}

function switchView(viewId) {
    if (!DOM.views) return;

    // Ẩn tất cả view
    DOM.views.forEach(view => view.classList.remove('active'));
    
    // Hiện view mục tiêu
    const targetView = document.getElementById(viewId + 'View');
    if (targetView) targetView.classList.add('active');
    
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
    if (!currentDeck || !currentDeck.items || currentDeck.items.length === 0) return;
    if (!DOM.flashcard || !DOM.cardWord) return;
    
    const card = currentDeck.items[currentCardIndex];
    
    // Mặt trước
    DOM.cardWord.innerText = card.term || '';
    
    if (DOM.cardPos) {
        if (card.pos) {
            DOM.cardPos.innerText = card.pos;
            DOM.cardPos.classList.add('show');
        } else {
            DOM.cardPos.classList.remove('show');
        }
    }
    
    if (DOM.cardIpa) {
        if (card.ipa) {
            DOM.cardIpa.innerText = card.ipa;
            DOM.cardIpa.classList.add('show');
        } else {
            DOM.cardIpa.classList.remove('show');
        }
    }

    // Mặt sau
    if (DOM.cardMeaning) DOM.cardMeaning.innerText = card.meaning_vi || '';
    
    if (DOM.cardExample) {
        if (card.example) {
            DOM.cardExample.innerText = card.example;
            DOM.cardExample.classList.add('show');
        } else {
            DOM.cardExample.classList.remove('show');
        }
    }

    // Cập nhật ví dụ tiếng Việt (nếu HTML của bạn có phần tử này)
    if (DOM.cardExampleVi) {
        if (card.example_vi) {
            DOM.cardExampleVi.innerText = card.example_vi;
            DOM.cardExampleVi.classList.add('show');
        } else {
            DOM.cardExampleVi.classList.remove('show');
        }
    }

    // Reset thẻ về mặt trước
    isFlipped = false;
    DOM.flashcard.classList.remove('is-flipped');
}

// 8. CÁC SỰ KIỆN NÚT BẤM (Event Listeners)
function setupEventListeners() {
    // Bấm vào thẻ để lật
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', () => {
            isFlipped = !isFlipped;
            DOM.flashcard.classList.toggle('is-flipped');
        });
    }

    // Nút Next
    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn lật thẻ khi bấm nút
            if (currentDeck && currentDeck.items && currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                loadCard();
            }
        });
    }

    // Nút Prev
    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex > 0) {
                currentCardIndex--;
                loadCard();
            }
        });
    }

    // Đọc phát âm
    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentDeck.items) {
                const word = currentDeck.items[currentCardIndex].term;
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                speechSynthesis.speak(utterance);
            }
        });
    }

    // Nút Đã thuộc (Master)
    if (DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentDeck.items) {
                // Lấy ID của thẻ, nếu không có ID thì dùng chính từ (term) làm ID
                const wordId = currentDeck.items[currentCardIndex].id || currentDeck.items[currentCardIndex].term;
                
                if (!masteredCards.includes(wordId)) {
                    masteredCards.push(wordId);
                    localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                    updateDashboardStats();
                }
                // Tự động nhảy sang thẻ tiếp theo
                DOM.nextBtn.click();
            }
        });
    }

    // Nút Chưa thuộc (Nếu có)
    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (DOM.nextBtn) DOM.nextBtn.click();
        });
    }

    // Dark/Light Mode Toggle
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// 9. CẬP NHẬT THỐNG KÊ TRANG CHỦ
function updateDashboardStats() {
    if (DOM.statMastered) DOM.statMastered.innerText = `${masteredCards.length} Từ`;
    
    // Tính tổng số từ trong tất cả các file
    let totalWords = 0;
    allDecks.forEach(deck => {
        if (deck.items) totalWords += deck.items.length;
    });
    
    if (totalWords > 0 && DOM.statProgress) {
        const percent = Math.round((masteredCards.length / totalWords) * 100);
        DOM.statProgress.innerText = `${percent}%`;
    }
}
