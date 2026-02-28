// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH (BẢN VÁ LỖI)
// =========================================

// 1. GỘP DỮ LIỆU TỪ CÁC FILE GROUP
let allDecks = [];
if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);

// 2. BIẾN TRẠNG THÁI
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];

// 3. ĐỢI TRANG LOAD XONG MỚI GÁN SỰ KIỆN (Tránh lỗi không tìm thấy nút)
window.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả elements sau khi HTML đã render xong
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
        cardExampleVi: document.getElementById('cardExampleVi'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        masterBtn: document.getElementById('masterBtn'),
        notMasteredBtn: document.getElementById('notMasteredBtn'),
        speakBtn: document.getElementById('speakBtn'),
        themeToggle: document.getElementById('themeToggle'),
        statMastered: document.getElementById('statMastered'),
        statProgress: document.getElementById('statProgress')
    };

    // Hàm khởi tạo
    function initApp() {
        renderDeckList();
        setupNavigation();
        setupEventListeners();
        updateDashboardStats();

        // TỰ ĐỘNG NẠP BÀI HỌC ĐẦU TIÊN VÀO FLASHCARD
        if (allDecks.length > 0) {
            currentDeck = allDecks[0];
            loadCard();
        } else {
            DOM.cardWord.innerText = "Chưa có dữ liệu";
            DOM.cardMeaning.innerText = "Vui lòng kiểm tra lại các file group data";
        }

        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Render danh sách bài học
    function renderDeckList() {
        DOM.deckList.innerHTML = '';
        DOM.mobileDeckList.innerHTML = '';

        if (allDecks.length === 0) return;

        allDecks.forEach((deck) => {
            const li = document.createElement('li');
            li.className = 'deck-item';
            li.innerHTML = `<i class="fa-solid fa-folder-open" style="margin-right: 10px; opacity: 0.7;"></i> ${deck.ten} <span style="font-size: 0.8rem; color: var(--text-muted); float: right;">${deck.items.length} từ</span>`;

            const liMobile = li.cloneNode(true);

            const loadDeck = () => {
                currentDeck = deck;
                currentCardIndex = 0;
                switchView('study');
                DOM.viewTitle.innerText = deck.ten;
                loadCard();

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

    // Xử lý chuyển màn hình (Tab)
    function setupNavigation() {
        DOM.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const viewId = e.currentTarget.getAttribute('data-view');
                switchView(viewId);

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
        DOM.views.forEach(view => {
            if(view) view.classList.remove('active');
        });
        const targetView = document.getElementById(viewId + 'View');
        if(targetView) targetView.classList.add('active');

        DOM.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            }
        });
    }

    // Nạp từ vựng vào Thẻ
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

        // Reset về mặt trước
        isFlipped = false;
        DOM.flashcard.classList.remove('is-flipped');
    }

    // Gắn sự kiện cho các nút bấm
    function setupEventListeners() {
        // Lật thẻ
        if(DOM.flashcard) {
            DOM.flashcard.addEventListener('click', () => {
                if (!currentDeck) return;
                isFlipped = !isFlipped;
                DOM.flashcard.classList.toggle('is-flipped');
            });
        }

        // Nút Tiếp theo
        if(DOM.nextBtn) {
            DOM.nextBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn lật thẻ khi bấm nút
                if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
                    currentCardIndex++;
                    loadCard();
                } else if (currentDeck && currentCardIndex === currentDeck.items.length - 1) {
                    currentCardIndex = 0; // Đang ở cuối thì vòng lại từ đầu
                    loadCard();
                }
            });
        }

        // Nút Lùi lại
        if(DOM.prevBtn) {
            DOM.prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentDeck && currentCardIndex > 0) {
                    currentCardIndex--;
                    loadCard();
                } else if (currentDeck && currentCardIndex === 0) {
                    currentCardIndex = currentDeck.items.length - 1; // Đang ở đầu thì lùi về thẻ cuối
                    loadCard();
                }
            });
        }

        // Phát âm
        if(DOM.speakBtn) {
            DOM.speakBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentDeck) {
                    const word = currentDeck.items[currentCardIndex].term;
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = 'en-US'; // Tiếng Anh Mỹ
                    speechSynthesis.speak(utterance);
                }
            });
        }

        // Đánh dấu đã thuộc
        if(DOM.masterBtn) {
            DOM.masterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentDeck) {
                    const wordId = currentDeck.items[currentCardIndex].id;
                    if (!masteredCards.includes(wordId)) {
                        masteredCards.push(wordId);
                        localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                        updateDashboardStats();
                    }
                    DOM.nextBtn.click(); // Tự nhảy thẻ tiếp
                }
            });
        }

        // Đánh dấu chưa thuộc
        if(DOM.notMasteredBtn) {
            DOM.notMasteredBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(currentDeck) {
                     DOM.nextBtn.click(); // Nhảy thẻ tiếp
                }
            });
        }

        // Nút tắt/bật đèn (Chế độ tối)
        if(DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', () => {
                const root = document.documentElement;
                const currentTheme = root.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    // Cập nhật thống kê
    function updateDashboardStats() {
        if(DOM.statMastered) DOM.statMastered.innerText = `${masteredCards.length} Từ`;

        let totalWords = 0;
        allDecks.forEach(deck => totalWords += deck.items.length);

        if (totalWords > 0 && DOM.statProgress) {
            const percent = Math.round((masteredCards.length / totalWords) * 100);
            DOM.statProgress.innerText = `${percent}%`;
        }
    }

    // CHẠY APP NGAY THÔI!
    initApp();
});
