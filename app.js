// =========================================
// FILE: app.js - BẢN FIX CUỐI CÙNG (CÓ CỨU HỘ DATA)
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Bắt đầu khởi chạy ứng dụng...");

    // 1. TÌM VÀ GỘP DỮ LIỆU TỪ CÁC FILE GROUP
    let allDecks = [];
    if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
    if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
    if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
    if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);

    // 🔴 PHAO CỨU SINH: Nếu dữ liệu vẫn bằng 0 (Lỗi file group)
    if (allDecks.length === 0) {
        console.warn("⚠️ Không load được data từ file group! Chạy data mẫu.");
        allDecks = [{
            id: "test_deck",
            ten: "BÀI TEST SỬA LỖI NÚT BẤM",
            items: [
                { id: "t1", term: "Success", pos: "n.", ipa: "/səkˈses/", meaning_vi: "Sự thành công", example: "The buttons are working now!" },
                { id: "t2", term: "Perfect", pos: "adj.", ipa: "/ˈpɜːrfɪkt/", meaning_vi: "Hoàn hảo", example: "Your website is 10/10." },
                { id: "t3", term: "Awesome", pos: "adj.", ipa: "/ˈɔːsəm/", meaning_vi: "Tuyệt vời", example: "You did a great job." }
            ]
        }];
        alert("⚠️ Web không đọc được các file group_1,2,3,4.js của bạn.\n\nMình đã tải 'Bài Test' để bạn thử các nút bấm. Nếu nút bấm lật/chuyển bài bình thường, hãy kiểm tra lại các file group nhé!");
    }

    let currentDeck = allDecks[0]; // Mặc định chọn bài đầu tiên
    let currentCardIndex = 0;
    let isFlipped = false;
    let masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];

    // 2. KẾT NỐI DOM ELEMENTS
    const DOM = {
        views: document.querySelectorAll('.view-section'),
        navItems: document.querySelectorAll('.nav-item'),
        viewTitle: document.getElementById('viewTitle'),
        deckList: document.getElementById('deckList'),
        mobileDeckList: document.getElementById('mobileDeckList'),
        flashcard: document.getElementById('flashcard'),
        cardWord: document.getElementById('cardWord'),
        cardPos: document.getElementById('cardPos'),
        cardIpa: document.getElementById('cardIpa'),
        cardMeaning: document.getElementById('cardMeaning'),
        cardExample: document.getElementById('cardExample'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        masterBtn: document.getElementById('masterBtn'),
        notMasteredBtn: document.getElementById('notMasteredBtn'),
        speakBtn: document.getElementById('speakBtn'),
        statMastered: document.getElementById('statMastered'),
        statProgress: document.getElementById('statProgress')
    };

    // 3. HIỂN THỊ DANH SÁCH BÀI HỌC VÀO MENU
    function renderDeckList() {
        DOM.deckList.innerHTML = '';
        DOM.mobileDeckList.innerHTML = '';
        allDecks.forEach((deck, index) => {
            const li = document.createElement('li');
            li.className = 'deck-item';
            li.innerHTML = `<i class="fa-solid fa-folder-open" style="margin-right: 8px;"></i> ${deck.ten} <span style="float:right; opacity:0.6; font-size: 0.85em">${deck.items.length} từ</span>`;
            
            // Nếu là bài đầu tiên, cho nó sáng lên luôn
            if(index === 0) li.classList.add('active');

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

    // 4. LOAD TỪ VỰNG LÊN THẺ
    function loadCard() {
        if (!currentDeck || currentDeck.items.length === 0) return;
        const card = currentDeck.items[currentCardIndex];

        DOM.cardWord.innerText = card.term;
        DOM.cardMeaning.innerText = card.meaning_vi;
        
        if (card.pos) { DOM.cardPos.innerText = card.pos; DOM.cardPos.classList.add('show'); } else { DOM.cardPos.classList.remove('show'); }
        if (card.ipa) { DOM.cardIpa.innerText = card.ipa; DOM.cardIpa.classList.add('show'); } else { DOM.cardIpa.classList.remove('show'); }
        if (card.example) { DOM.cardExample.innerText = card.example; DOM.cardExample.classList.add('show'); } else { DOM.cardExample.classList.remove('show'); }

        isFlipped = false;
        DOM.flashcard.classList.remove('is-flipped');
    }

    // 5. CHUYỂN TAB QUA LẠI
    function switchView(viewId) {
        DOM.views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId + 'View').classList.add('active');
        DOM.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === viewId) item.classList.add('active');
        });
    }

    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
            const titles = { 'dashboard': 'Trang chủ', 'study': currentDeck ? currentDeck.ten : 'Học tập', 'library': 'Thư viện', 'review': 'Ôn tập', 'settings': 'Cài đặt' };
            DOM.viewTitle.innerText = titles[viewId] || 'Flashcards';
        });
    });

    // 6. SỰ KIỆN CÁC NÚT BẤM (CHẮC CHẮN CHẠY)
    DOM.flashcard.addEventListener('click', () => {
        isFlipped = !isFlipped;
        DOM.flashcard.classList.toggle('is-flipped');
    });

    DOM.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentCardIndex = (currentCardIndex < currentDeck.items.length - 1) ? currentCardIndex + 1 : 0;
        loadCard();
    });

    DOM.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentCardIndex = (currentCardIndex > 0) ? currentCardIndex - 1 : currentDeck.items.length - 1;
        loadCard();
    });

    DOM.speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(currentDeck.items[currentCardIndex].term);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    });

    DOM.masterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = currentDeck.items[currentCardIndex].id;
        if (!masteredCards.includes(wordId)) {
            masteredCards.push(wordId);
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
            DOM.statMastered.innerText = `${masteredCards.length} Từ`;
        }
        DOM.nextBtn.click();
    });

    DOM.notMasteredBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.nextBtn.click();
    });

    // 7. CHẠY KHỞI TẠO
    renderDeckList();
    loadCard();
    DOM.statMastered.innerText = `${masteredCards.length} Từ`;
    
    // Nút đổi màu nền
    document.getElementById('themeToggle').addEventListener('click', () => {
        const root = document.documentElement;
        const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
    });
});
