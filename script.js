document.addEventListener('DOMContentLoaded', () => {

    // --- NAVIGATION ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.dataset.target;
            viewSections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                    section.classList.add('hidden');
                }
            });
        });
    });

    // --- SIMPLE FOCUS INPUT LOGIC ---
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.value = localStorage.getItem('lofi_focus_text') || '';
        taskInput.addEventListener('input', (e) => {
            localStorage.setItem('lofi_focus_text', e.target.value);
        });
    }



    // --- RPG GAMIFICATION LOGIC ---
    // State
    let rpgData = {
        level: 1,
        xp: 0,
        quests: []
    };

    // Load Local First
    const localData = localStorage.getItem('lofi_rpg');
    if (localData) {
        rpgData = JSON.parse(localData);
    }

    // DOM Elements
    const rpgLevelEl = document.getElementById('rpgLevel');
    const rpgXpEl = document.getElementById('rpgXP');
    const xpBar = document.getElementById('xpBar');
    const rpgInput = document.getElementById('rpgInput');
    const addQuestBtn = document.getElementById('addQuestBtn');
    const questListEl = document.getElementById('questList');

    // Init UI
    updateRPGHeader();
    renderQuests();



    /**
     * Save RPG data locally
     */
    function saveRPG() {
        localStorage.setItem('lofi_rpg', JSON.stringify(rpgData));
    }

    // Handlers
    addQuestBtn.addEventListener('click', () => addQuest());
    rpgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addQuest();
    });

    function updateRPGHeader() {
        rpgLevelEl.textContent = rpgData.level;
        rpgXpEl.textContent = rpgData.xp;
        xpBar.style.width = `${rpgData.xp}%`;
        saveRPG(); // Ensure sync on update
    }

    function addQuest() {
        const text = rpgInput.value.trim();
        if (!text) return;

        const newQuest = {
            id: Date.now(),
            text: text,
            completed: false
        };

        rpgData.quests.unshift(newQuest); // Add to top
        rpgInput.value = '';
        saveRPG();
        renderQuests();
    }

    function renderQuests() {
        questListEl.innerHTML = '';
        rpgData.quests.forEach(quest => {
            const el = document.createElement('div');
            el.className = `quest-item ${quest.completed ? 'completed' : ''}`;
            el.dataset.questId = quest.id; // Store ID in data attribute
            el.innerHTML = `
                <div class="quest-content" style="display:flex; align-items:center; cursor:pointer; flex:1;">
                    <div class="quest-checkbox">
                        ${quest.completed ? '<i class="fas fa-check" style="font-size:10px; color:var(--accent)"></i>' : ''}
                    </div>
                    <span class="quest-text">${quest.text}</span>
                </div>
                <div class="quest-actions">
                    <button class="delete-quest-btn" data-quest-id="${quest.id}" title="Abandon Quest">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            questListEl.appendChild(el);
        });
    }

    // =============================================
    // EVENT DELEGATION for Quest Items
    // =============================================
    // Single event listener on parent handles ALL dynamically generated quests
    if (questListEl) {
        questListEl.addEventListener('click', (event) => {
            const target = event.target;

            // Check if clicked on quest content (toggle complete)
            const questContent = target.closest('.quest-content');
            if (questContent) {
                const questItem = questContent.closest('.quest-item');
                if (questItem && questItem.dataset.questId) {
                    const questId = parseInt(questItem.dataset.questId, 10);
                    toggleQuestById(questId);
                    return;
                }
            }

            // Check if clicked on delete button
            const deleteBtn = target.closest('.delete-quest-btn');
            if (deleteBtn && deleteBtn.dataset.questId) {
                const questId = parseInt(deleteBtn.dataset.questId, 10);
                deleteQuestById(questId);
                return;
            }
        });
    }

    /**
     * Toggle quest completion status
     * @param {number} id - Quest ID
     */
    function toggleQuestById(id) {
        const quest = rpgData.quests.find(q => q.id === id);
        if (!quest) {
            console.warn('Quest not found:', id);
            return;
        }

        if (!quest.completed) {
            quest.completed = true;
            gainXP(20);
            console.log(`✅ Quest completed: "${quest.text}" (+20 XP)`);
        } else {
            quest.completed = false;
            console.log(`⬜ Quest uncompleted: "${quest.text}"`);
        }

        saveRPG(); // This also triggers saveToCloud() if logged in
        renderQuests();
    }

    /**
     * Delete a quest
     * @param {number} id - Quest ID
     */
    function deleteQuestById(id) {
        const quest = rpgData.quests.find(q => q.id === id);
        rpgData.quests = rpgData.quests.filter(q => q.id !== id);
        console.log(`🗑️ Quest deleted: "${quest?.text || id}"`);
        saveRPG(); // This also triggers saveToCloud() if logged in
        renderQuests();
    }

    // Keep window globals for backwards compatibility (if needed elsewhere)
    window.toggleQuest = toggleQuestById;
    window.deleteQuest = deleteQuestById;

    function gainXP(amount) {
        let oldLevel = rpgData.level;
        rpgData.xp += amount;

        // Level Up Logic
        if (rpgData.xp >= 100) {
            rpgData.level++;
            rpgData.xp = rpgData.xp % 100; // Carry over overflow

            // Effect
            alert(`🎉 LEVEL UP! You reached Level ${rpgData.level}!`);
            document.querySelector('.level-badge').classList.add('level-up-flash');
            setTimeout(() => document.querySelector('.level-badge').classList.remove('level-up-flash'), 1000);
        }

        updateRPGHeader();
    }

    // START of saveRPG helper update
    // (Consolidated logic above in INIT section)
    // END of saveRPG helper update


    // --- TIMER LOGIC (VIEW 1) ---
    let mainTimeLeft = 25 * 60;
    let initialTime = 25 * 60;
    let timerId = null;
    let isRunning = false;

    const timerDisplay = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const modePills = document.querySelectorAll('.mode-pill');

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    function updateTimer() {
        timerDisplay.textContent = formatTime(mainTimeLeft);
        document.title = `${formatTime(mainTimeLeft)} - Focus`;
    }

    function toggleTimer() {
        if (isRunning) {
            // Pause
            clearInterval(timerId);
            isRunning = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            // Start
            isRunning = true;
            startBtn.innerHTML = '<i class="fas fa-pause"></i>';
            timerId = setInterval(() => {
                if (mainTimeLeft > 0) {
                    mainTimeLeft--;
                    updateTimer();
                } else {
                    clearInterval(timerId);
                    isRunning = false;
                    startBtn.innerHTML = '<i class="fas fa-play"></i>';

                    // RPG Reward for finishing timer!
                    gainXP(50);
                    alert("Focus session complete! +50 XP");
                }
            }, 1000);
        }
    }

    function resetTimer() {
        clearInterval(timerId);
        isRunning = false;
        mainTimeLeft = initialTime;
        updateTimer();
        startBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);

    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            modePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const mode = pill.dataset.mode;
            if (mode === 'focus') initialTime = 25 * 60;
            else if (mode === 'short') initialTime = 5 * 60;
            else if (mode === 'long') initialTime = 15 * 60;

            resetTimer();
        });
    });


    // --- DAILY INSPIRATION LOGIC ---
    const quotes = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
    ];


    // --- INSPIRATION REFRESH LOGIC ---
    let refreshIntervalHours = parseFloat(localStorage.getItem('lofi_refresh_val')) || 24;

    const refreshSelect = document.getElementById('refreshInterval');
    if (refreshSelect) {
        refreshSelect.value = refreshIntervalHours;
        refreshSelect.addEventListener('change', (e) => {
            refreshIntervalHours = parseFloat(e.target.value);
            localStorage.setItem('lofi_refresh_val', refreshIntervalHours);
            checkAndRenderInspiration(true);
        });
    }

    function checkAndRenderInspiration(forceCheck = false) {
        const lastUpdate = parseInt(localStorage.getItem('lofi_last_update')) || 0;
        const currentSeed = localStorage.getItem('lofi_current_seed');
        const now = Date.now();
        const duration = refreshIntervalHours * 60 * 60 * 1000;

        if (forceCheck || (now - lastUpdate > duration) || !currentSeed) {
            generateNewContent(now);
        } else {
            renderContent(currentSeed);
        }
    }

    function generateNewContent(timestamp) {
        const newSeed = Math.floor(Math.random() * 1000000).toString();
        localStorage.setItem('lofi_current_seed', newSeed);
        localStorage.setItem('lofi_last_update', timestamp);
        renderContent(newSeed);
    }

    function renderContent(seed) {
        const imageUrl = `https://picsum.photos/seed/${seed}/600/300`;
        const imgEl = document.getElementById('dailyImage');
        if (imgEl) {
            if (imgEl.src !== imageUrl) {
                imgEl.src = imageUrl;
                imgEl.onerror = function () { this.src = 'https://picsum.photos/600/300?grayscale'; };
            }
        }

        const numericSeed = parseInt(seed.replace(/\D/g, '')) || seed.length;
        const quoteIndex = numericSeed % quotes.length;
        const dailyQuote = quotes[quoteIndex];

        // --- DYNAMIC GREETING LOGIC ---
        const greetings = [
            "こんにちは!", // Japanese
            "Hello!",       // English
            "Xin chào!",    // Vietnamese
            "Bonjour!",     // French
            "Hola!",        // Spanish
            "Guten Tag!",   // German
            "Ciao!",        // Italian
            "안녕하세요!",   // Korean
            "你好!"         // Chinese
        ];
        const greetingIndex = (numericSeed + 7) % greetings.length;
        const dailyGreeting = greetings[greetingIndex];
        const greetingEl = document.querySelector('.greeting-text');

        if (greetingEl) {
            greetingEl.textContent = dailyGreeting;
        }

        if (document.getElementById('dailyQuote')) {
            document.getElementById('dailyQuote').textContent = `"${dailyQuote.text}"`;
            document.getElementById('dailyAuthor').textContent = `- ${dailyQuote.author}`;
        }
    }

    // --- CLOCK LOGIC (VIEW 2) ---
    function updateClock() {
        const now = new Date();
        document.getElementById('realtimeClock').textContent = now.toLocaleTimeString('en-US');
        document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        checkAndRenderInspiration();
    }

    setInterval(updateClock, 1000);
    updateClock();
    checkAndRenderInspiration();


    // --- GAME LOGIC (VIEW 3) ---
    const gameArea = document.getElementById('gameArea');
    const scoreEl = document.getElementById('gameScore');
    const timerEl = document.getElementById('gameTimer');
    const gameStartBtn = document.getElementById('startGameBtn');
    const gameTitle = document.getElementById('gameTitle');
    const gameBtns = document.querySelectorAll('.game-btn');

    // Game State
    let score = 0;
    let gameTimeLeft = 30;
    let isPlaying = false;
    let currentGame = 'clicker';
    let gameLoop = null;
    let timerLoop = null;

    let currentKeyDownHandler = null;

    // --- 1. GAME SWITCHER ---
    gameBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isPlaying) stopGame();

            gameBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentGame = btn.dataset.game;
            updateGameUI();
        });
    });

    function updateGameUI() {
        score = 0;
        scoreEl.textContent = '0';
        gameTimeLeft = 30;
        if (timerEl) timerEl.textContent = '30s';

        document.querySelectorAll('.mini-game').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });

        const gameContainer = document.getElementById(`g-${currentGame}`);
        if (gameContainer) {
            gameContainer.classList.remove('hidden');
            gameContainer.classList.add('active');
        }

        if (timerEl) timerEl.parentNode.style.display = 'block';

        if (currentGame === 'clicker') gameTitle.textContent = "STAR CLICKER";
        if (currentGame === 'catcher') gameTitle.textContent = "STAR CATCHER";
        if (currentGame === 'dino') {
            gameTitle.textContent = "DINO RUN";
            timerEl.parentNode.style.display = 'none';
        }
        if (currentGame === 'snake') {
            gameTitle.textContent = "NEON SNAKE";
            timerEl.parentNode.style.display = 'none';
        }
        if (currentGame === 'typer') {
            gameTitle.textContent = "RAINY TYPER";
        }
        if (currentGame === 'memory') {
            gameTitle.textContent = "MEMORY MATRIX";
            timerEl.parentNode.style.display = 'none';
        }

        gameStartBtn.style.display = 'block';
        gameStartBtn.textContent = 'Start Game';
    }

    // --- 2. START / STOP MANAGER ---
    gameStartBtn.addEventListener('click', () => {
        if (isPlaying) return;
        startGame();
    });

    function startGame() {
        isPlaying = true;
        score = 0;
        scoreEl.textContent = '0';
        gameStartBtn.style.display = 'none';

        if (currentKeyDownHandler) {
            document.removeEventListener('keydown', currentKeyDownHandler);
            currentKeyDownHandler = null;
        }

        if (currentGame !== 'dino' && currentGame !== 'snake' && currentGame !== 'memory') {
            gameTimeLeft = 30;
            if (timerEl) timerEl.textContent = gameTimeLeft + 's';
            startTimer();
        } else {
            if (timerEl) timerEl.textContent = '∞';
        }

        if (currentGame === 'clicker') startClicker();
        if (currentGame === 'catcher') startCatcher();
        if (currentGame === 'dino') startDino();
        if (currentGame === 'snake') startSnake();
        if (currentGame === 'typer') startTyper();
        if (currentGame === 'memory') startMemory();
    }

    function startTimer() {
        if (timerLoop) clearInterval(timerLoop);
        timerLoop = setInterval(() => {
            gameTimeLeft--;
            if (timerEl) timerEl.textContent = gameTimeLeft + 's';

            if (gameTimeLeft <= 0) {
                stopGame(`Time's up! Final Score: ${score}`);
            }
        }, 1000);
    }

    function stopGame(gameOverMsg = null) {
        isPlaying = false;
        clearInterval(gameLoop);
        clearInterval(timerLoop);

        if (currentKeyDownHandler) {
            document.removeEventListener('keydown', currentKeyDownHandler);
            currentKeyDownHandler = null;
        }

        if (currentGame === 'clicker') {
            document.querySelectorAll('.star').forEach(s => s.remove());
        }
        if (currentGame === 'catcher') {
            document.querySelectorAll('.falling-star').forEach(s => s.remove());
        }
        if (currentGame === 'dino') {
            const obs = document.getElementById('dino-obstacle');
            if (obs) obs.classList.remove('move');
        }
        if (currentGame === 'snake') {
            document.getElementById('g-snake').innerHTML = '';
        }
        if (currentGame === 'typer') {
            document.getElementById('g-typer').innerHTML = '';
        }
        if (currentGame === 'memory') {
            document.getElementById('g-memory').innerHTML = '<div class="memory-grid"></div>';
        }

        gameStartBtn.style.display = 'block';
        gameStartBtn.textContent = gameOverMsg ? 'Play Again' : 'Start Game';

        if (gameOverMsg) alert(gameOverMsg);
    }

    // --- GAME 1-3 (EXISTING) ---
    function startClicker() {
        gameLoop = setInterval(() => {
            const star = document.createElement('div');
            star.classList.add('star');
            star.innerHTML = '<i class="fas fa-star"></i>';
            const x = Math.random() * (gameArea.clientWidth - 40);
            const y = Math.random() * (gameArea.clientHeight - 40);
            star.style.left = `${x}px`;
            star.style.top = `${y}px`;
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                score += 10;
                scoreEl.textContent = score;
                star.remove();
            });
            setTimeout(() => { if (star.parentNode) star.remove(); }, 2000);
            document.getElementById('g-clicker').appendChild(star);
        }, 800);
    }

    function startCatcher() {
        const basket = document.getElementById('catcher-basket');
        gameArea.onmousemove = (e) => {
            if (!isPlaying || currentGame !== 'catcher') return;
            const rect = gameArea.getBoundingClientRect();
            let x = e.clientX - rect.left;
            if (x < 30) x = 30;
            if (x > rect.width - 30) x = rect.width - 30;
            basket.style.left = `${x}px`;
        };
        gameLoop = setInterval(() => {
            const star = document.createElement('div');
            star.classList.add('falling-star');
            star.innerHTML = '<i class="fas fa-star"></i>';
            star.style.left = `${Math.random() * (gameArea.clientWidth - 20)}px`;
            star.style.top = '0px';
            document.getElementById('g-catcher').appendChild(star);
            let fallInterval = setInterval(() => {
                if (!isPlaying) { clearInterval(fallInterval); return; }
                const top = parseFloat(star.style.top || 0);
                star.style.top = `${top + 5}px`;
                const sRect = star.getBoundingClientRect();
                const bRect = basket.getBoundingClientRect();
                if (sRect.bottom >= bRect.top && sRect.top <= bRect.bottom && sRect.left >= bRect.left && sRect.right <= bRect.right) {
                    score += 10; scoreEl.textContent = score; star.remove(); clearInterval(fallInterval);
                }
                if (top > gameArea.clientHeight) { star.remove(); clearInterval(fallInterval); }
            }, 30);
        }, 1000);
    }

    function startDino() {
        const dino = document.getElementById('dino-player');
        const obstacle = document.getElementById('dino-obstacle');
        obstacle.classList.remove('move');
        void obstacle.offsetWidth;
        obstacle.classList.add('move');

        currentKeyDownHandler = (e) => {
            if (e.code === 'Space' && isPlaying && currentGame === 'dino') {
                if (!dino.classList.contains('jump')) {
                    dino.classList.add('jump');
                    setTimeout(() => dino.classList.remove('jump'), 500);
                }
            }
        };
        document.addEventListener('keydown', currentKeyDownHandler);

        let counter = 0;
        gameLoop = setInterval(() => {
            counter++;
            if (counter % 10 === 0) { score++; scoreEl.textContent = score; }
            const dRect = dino.getBoundingClientRect();
            const oRect = obstacle.getBoundingClientRect();
            if (dRect.right > oRect.left + 10 && dRect.left < oRect.right - 10 && dRect.bottom > oRect.top + 10) {
                stopGame(`Ouch! Game Over. Score: ${score}`);
            }
        }, 50);
    }

    // --- GAME 4: NEON SNAKE ---
    function startSnake() {
        const snakeContainer = document.getElementById('g-snake');
        snakeContainer.innerHTML = ''; // Clear any previous game state

        const gridSize = 20;
        let snake = [{ x: 10, y: 10 }];
        let food = { x: 15, y: 10 };

        // Reset direction to default (moving right)
        let dx = 1;
        let dy = 0;
        let nextDx = 1;
        let nextDy = 0;

        function drawSnake() {
            snakeContainer.innerHTML = '';
            snake.forEach(node => {
                const el = document.createElement('div');
                el.className = 'snake-node';
                el.style.left = node.x * gridSize + 'px';
                el.style.top = node.y * gridSize + 'px';
                snakeContainer.appendChild(el);
            });
            const f = document.createElement('div');
            f.className = 'snake-food';
            f.style.left = food.x * gridSize + 'px';
            f.style.top = food.y * gridSize + 'px';
            snakeContainer.appendChild(f);
        }

        currentKeyDownHandler = (e) => {
            if (!isPlaying) return;
            switch (e.key) {
                case 'ArrowUp': if (dy !== 1) { nextDx = 0; nextDy = -1; } break;
                case 'ArrowDown': if (dy !== -1) { nextDx = 0; nextDy = 1; } break;
                case 'ArrowLeft': if (dx !== 1) { nextDx = -1; nextDy = 0; } break;
                case 'ArrowRight': if (dx !== -1) { nextDx = 1; nextDy = 0; } break;
            }
        };
        document.addEventListener('keydown', currentKeyDownHandler);

        gameLoop = setInterval(() => {
            dx = nextDx;
            dy = nextDy;

            const head = { x: snake[0].x + dx, y: snake[0].y + dy };
            const maxX = Math.floor(gameArea.clientWidth / gridSize);
            const maxY = Math.floor(gameArea.clientHeight / gridSize);

            if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
                stopGame(`Crashed! Score: ${score}`);
                return;
            }

            for (let i = 0; i < snake.length; i++) {
                if (head.x === snake[i].x && head.y === snake[i].y) {
                    stopGame(`Bit yourself! Score: ${score}`);
                    return;
                }
            }

            snake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                score += 10;
                scoreEl.textContent = score;
                food = {
                    x: Math.floor(Math.random() * (maxX - 1)),
                    y: Math.floor(Math.random() * (maxY - 1))
                };
            } else {
                snake.pop();
            }
            drawSnake();

        }, 150);
    }

    // --- GAME 5: RAINY TYPER ---
    function startTyper() {
        const bank = ['const', 'let', 'var', 'array', 'object', 'function', 'class', 'html', 'css', 'grid', 'flex', 'pixel', 'focus', 'style', 'code', 'lofi', 'neon', 'dark', 'void', 'null'];
        const typerContainer = document.getElementById('g-typer');
        let activeWords = [];

        currentKeyDownHandler = (e) => {
            if (!isPlaying) return;
            const char = e.key.toLowerCase();
            let target = activeWords.find(w => w.isTarget);

            if (!target) {
                target = activeWords.find(w => w.word.startsWith(char));
                if (target) {
                    target.isTarget = true;
                    target.progress = 1;
                    target.el.classList.add('highlight');
                    target.el.innerHTML = `<span style="color:red">${target.word.substring(0, 1)}</span>${target.word.substring(1)}`;
                }
            } else {
                const nextChar = target.word[target.progress];
                if (char === nextChar) {
                    target.progress++;
                    target.el.innerHTML = `<span style="color:red">${target.word.substring(0, target.progress)}</span>${target.word.substring(target.progress)}`;
                    if (target.progress === target.word.length) {
                        score += 10;
                        scoreEl.textContent = score;
                        target.el.remove();
                        activeWords = activeWords.filter(w => w.id !== target.id);
                    }
                }
            }
        };
        document.addEventListener('keydown', currentKeyDownHandler);

        gameLoop = setInterval(() => {
            if (Math.random() < 0.02 && activeWords.length < 5) {
                const word = bank[Math.floor(Math.random() * bank.length)];
                const el = document.createElement('div');
                el.className = 'falling-word';
                el.textContent = word;
                const x = Math.random() * (gameArea.clientWidth - 50);
                el.style.left = x + 'px';
                el.style.top = '0px';
                typerContainer.appendChild(el);

                activeWords.push({
                    id: Date.now() + Math.random(),
                    word: word,
                    el: el,
                    x: x,
                    y: 0,
                    speed: 0.5 + Math.random() * 0.5,
                    isTarget: false,
                    progress: 0
                });
            }

            activeWords.forEach(w => {
                w.y += w.speed;
                w.el.style.top = w.y + 'px';
                if (w.y > gameArea.clientHeight - 20) {
                    stopGame(`Word hit floor! Score: ${score}`);
                }
            });
        }, 16);
    }

    // --- GAME 6: MEMORY MATRIX ---
    function startMemory() {
        const gridEl = document.querySelector('.memory-grid');
        gridEl.innerHTML = '';
        const cells = [];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'memory-cell';
            cell.dataset.id = i;
            cell.addEventListener('click', () => handleMemoryClick(i, cell));
            gridEl.appendChild(cell);
            cells.push(cell);
        }

        let sequence = [];
        let playerIdx = 0;
        let waitingForInput = false;

        function nextRound() {
            playerIdx = 0;
            waitingForInput = false;
            sequence.push(Math.floor(Math.random() * 9));
            scoreEl.textContent = sequence.length - 1;
            playSequence();
        }

        function playSequence() {
            let i = 0;
            const interval = setInterval(() => {
                const id = sequence[i];
                highlightCell(id);
                i++;
                if (i >= sequence.length) {
                    clearInterval(interval);
                    waitingForInput = true;
                }
            }, 600);
        }

        function highlightCell(id) {
            cells[id].classList.add('active');
            setTimeout(() => cells[id].classList.remove('active'), 300);
        }

        function handleMemoryClick(id, cell) {
            if (!isPlaying || !waitingForInput) return;

            cell.classList.add('active');
            setTimeout(() => cell.classList.remove('active'), 100);

            if (id === sequence[playerIdx]) {
                playerIdx++;
                if (playerIdx >= sequence.length) {
                    waitingForInput = false;
                    setTimeout(nextRound, 1000);
                }
            } else {
                stopGame(`Wrong tile! Sequence reached: ${sequence.length - 1}`);
            }
        }

        setTimeout(nextRound, 500);
    }

    // --- SETTINGS (VIEW 5) ---
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
        });
    });

    const resetRpgBtn = document.getElementById('resetRpgBtn');
    if (resetRpgBtn) {
        resetRpgBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset your Level and XP? This cannot be undone.")) {
                rpgData = {
                    level: 1,
                    xp: 0,
                    quests: []
                };
                saveRPG();
                updateRPGHeader();
                renderQuests();
                alert("Progress reset to Level 1.");
            }
        });
    }

    // --- VIEW 4: SHORTCUT PORTAL LOGIC ---
    function initPortal() {
        const grid = document.getElementById('shortcutGrid');
        const modal = document.getElementById('shortcutModal');
        const addBtn = document.getElementById('addShortcutBtn');
        const saveBtn = document.getElementById('saveShortcut');
        const cancelBtn = document.getElementById('cancelShortcut');
        const nameInput = document.getElementById('newShortcutName');
        const urlInput = document.getElementById('newShortcutUrl');

        if (!grid) return;

        // Initialize shortcuts in rpgData if missing
        if (!rpgData.shortcuts) {
            rpgData.shortcuts = [
                { name: "Google", url: "https://google.com" },
                { name: "YouTube", url: "https://youtube.com" },
                { name: "GitHub", url: "https://github.com" },
                { name: "Spotify", url: "https://spotify.com" }
            ];
            saveRPG();
        }

        function renderShortcuts() {
            // Clear current grid but need to re-append Add Button logic
            grid.innerHTML = '';

            rpgData.shortcuts.forEach((item, index) => {
                const el = document.createElement('a');
                el.className = 'shortcut-item';
                el.href = item.url;
                el.target = '_blank';

                // Use Google Favicon API
                const iconUrl = `https://www.google.com/s2/favicons?domain=${item.url}&sz=64`;

                el.innerHTML = `
                    <img src="${iconUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/32'">
                    <span>${item.name}</span>
                `;

                // Long press / Right click to delete
                el.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (confirm(`Delete shortcut "${item.name}"?`)) {
                        rpgData.shortcuts.splice(index, 1);
                        saveRPG();
                        renderShortcuts();
                    }
                });

                grid.appendChild(el);
            });

            // Append Add Button
            const newAdd = document.createElement('div');
            newAdd.className = 'shortcut-item add-new';
            newAdd.id = 'addShortcutBtn';
            newAdd.innerHTML = '<i class="fas fa-plus"></i><span>Add New</span>';
            newAdd.addEventListener('click', openModal);
            grid.appendChild(newAdd);
        }

        function openModal() {
            if (modal) {
                modal.classList.remove('hidden');
                nameInput.value = '';
                urlInput.value = '';
                nameInput.focus();
            }
        }

        function closeModal() {
            if (modal) modal.classList.add('hidden');
        }

        function saveNewShortcut() {
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();

            if (!name || !url) {
                alert("Please enter both Name and URL.");
                return;
            }

            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            rpgData.shortcuts.push({ name, url });
            saveRPG();
            renderShortcuts();
            closeModal();
        }

        // Event Listeners
        // Note: We re-attach addBtn listener inside renderShortcuts, so no need here unless it's static.
        // But cancel and save are static.
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (saveBtn) saveBtn.addEventListener('click', saveNewShortcut);

        // Close on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Initial Render
        renderShortcuts();
    }

    // Portal Init (Protected)
    try {
        initPortal();
    } catch (err) {
        console.error("Portal Init Error:", err);
    }

    // --- LEADERBOARD LOGIC ---
    function initLeaderboard() {
        const listEl = document.getElementById('leaderboardList');
        const simBtn = document.getElementById('simulateLeaderboardBtn');

        if (!listEl) return;

        // Mock Data Generator
        const generateMockData = () => {
            const names = ["CyberNinja", "NeonRider", "PixelMage", "VoidWalker", "SynthWave", "FocusGuru", "CodeWizard", "LofiCat"];
            const data = [];
            // Add Current User (Mock) based on local RPG Data
            data.push({
                name: "You",
                level: rpgData.level,
                xp: rpgData.xp,
                isUser: true
            });

            // Add Bots
            for (let i = 0; i < 9; i++) {
                data.push({
                    name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 99),
                    level: Math.floor(Math.random() * 15) + 1,
                    xp: Math.floor(Math.random() * 100),
                    isUser: false
                });
            }

            // Sort by Level DESC, then XP DESC
            return data.sort((a, b) => {
                if (a.level !== b.level) return b.level - a.level;
                return b.xp - a.xp;
            });
        };

        const renderLeaderboard = (data) => {
            listEl.innerHTML = '';
            data.forEach((player, index) => {
                const li = document.createElement('li');
                li.className = 'leader-item';
                if (player.isUser) li.style.background = 'rgba(124, 115, 230, 0.1)'; // Highlight User

                li.innerHTML = `
                    <span class="rank-col">${index + 1}</span>
                    <span class="name-col">${player.name} ${player.isUser ? '(You)' : ''}</span>
                    <span class="xp-col">Lvl ${player.level}</span>
                `;
                listEl.appendChild(li);
            });
        };

        // Load Real vs Mock
        const loadLeaderboard = () => {
            if (currentUser && db) {
                // Real Firestore Fetch (Mock implementation for now until users exist)
                // db.collection('users').orderBy...
                // For now, allow simulation even when logged in for demo
            }
            // Default to Mock for Demo
            const mock = generateMockData();
            renderLeaderboard(mock);
        };

        if (simBtn) {
            simBtn.addEventListener('click', () => {
                // Simulate new random world
                const mock = generateMockData();
                renderLeaderboard(mock);
            });
        }

        // Initial Load
        loadLeaderboard();
    }

    // Initialize Leaderboard safely
    try {
        initLeaderboard();
    } catch (err) {
        console.error("Leaderboard Init Error:", err);
    }

    // --- SPOTIFY VIBE SELECTOR ---
    const spotifyFrame = document.getElementById('spotify-frame');
    const vibeBtns = document.querySelectorAll('.vibe-btn');

    const playlists = {
        study: "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0", // Lofi Girl / Study
        sad: "https://open.spotify.com/embed/playlist/37i9dQZF1DX7qK8ma5wgG1?utm_source=generator&theme=0",   // Sad Vibe
        energy: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0" // Synthwave
    };

    vibeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Avoid reloading if already active
            if (btn.classList.contains('active')) return;

            // UI Toggle
            vibeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const vibe = btn.dataset.vibe;
            if (playlists[vibe] && spotifyFrame) {
                // 1. Fade Out
                spotifyFrame.classList.add('fading');

                // 2. Wait for transition (500ms), then switch Src
                setTimeout(() => {
                    spotifyFrame.src = playlists[vibe];

                    // 3. Fade In after load (approximate or use onload)
                    // We use 'load' event, but also a safety timeout in case it's cached/instant
                    spotifyFrame.onload = () => {
                        spotifyFrame.classList.remove('fading');
                    };
                }, 500);
            }
        });
    });

    // --- ZEN MODE LOGIC ---
    const zenBtn = document.getElementById('zenModeBtn');

    function toggleZenMode() {
        document.body.classList.toggle('zen-active');
        const isZen = document.body.classList.contains('zen-active');

        // Update Icon
        if (zenBtn) {
            zenBtn.innerHTML = isZen ? '<i class="fas fa-compress-alt"></i>' : '<i class="fas fa-expand-alt"></i>';
            zenBtn.title = isZen ? "Exit Zen Mode (Esc)" : "Enter Zen Mode";
        }
    }

    if (zenBtn) {
        zenBtn.addEventListener('click', toggleZenMode);
    }

    // Exit on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('zen-active')) {
            toggleZenMode();
        }
    });

});


document.addEventListener('DOMContentLoaded', function () {
    // 1. Tìm cái nút "tự chế" của bạn
    const googleLoginBtn = document.getElementById('btn-google-login');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', authenticateUser);
    }
});

function authenticateUser() {
    // --- CẤU HÌNH ---
    const CLIENT_ID = '132734756528-ubqhpsahvhbmnbihggct1ch3ifufa3pb.apps.googleusercontent.com';
    const EXTENSION_ID = chrome.runtime.id; // Tự động lấy ID extension
    const REDIRECT_URI = `https://${EXTENSION_ID}.chromiumapp.org/`;

    // Tạo link đăng nhập
    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=token&` +
        `redirect_uri=${REDIRECT_URI}&` +
        `scope=email profile`;

    console.log("Đang thử đăng nhập với URL:", authUrl); // Để debug

    // Gọi API Chrome để mở popup
    chrome.identity.launchWebAuthFlow(
        {
            url: authUrl,
            interactive: true
        },
        function (redirect_url) {
            // Kiểm tra lỗi nếu người dùng tắt popup hoặc sai cấu hình
            if (chrome.runtime.lastError) {
                console.error("Lỗi đăng nhập:", chrome.runtime.lastError);
                alert("Lỗi: " + chrome.runtime.lastError.message);
                return;
            }

            // Nếu thành công, URL trả về sẽ chứa token
            if (redirect_url) {
                console.log("Đăng nhập thành công! URL:", redirect_url);

                // Lấy token từ URL
                const urlParams = new URLSearchParams(new URL(redirect_url).hash.substring(1));
                const accessToken = urlParams.get('access_token');

                if (accessToken) {
                    // Ở đây bạn có thể gọi Firebase hoặc chỉ đơn giản là đổi giao diện
                    handleLoginSuccess(accessToken);
                }
            }
        }
    );
}

function handleLoginSuccess(token) {
    // Update settings button state
    const btn = document.getElementById('btn-google-login');
    if (btn) {
        btn.innerHTML = '✅ Signed In';
        btn.style.borderColor = '#34A853';
        btn.style.color = '#34A853';
    }

    // Save token and state to LocalStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('accessToken', token);

    // Fetch user profile and update header UI
    fetchUserProfile(token);
}

/**
 * Fetch Google User Profile using access token
 * @param {string} token - OAuth access token
 */
async function fetchUserProfile(token) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userInfo = await response.json();
        console.log('User Info:', userInfo);

        // Save user info to localStorage
        localStorage.setItem('userPicture', userInfo.picture || '');
        localStorage.setItem('userName', userInfo.name || 'User');
        localStorage.setItem('userEmail', userInfo.email || '');

        // Update the header UI with the avatar
        updateHeaderUI(userInfo.picture, userInfo.name);

    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

/**
 * Update the header UI with user avatar
 * @param {string} imageUrl - User's profile picture URL
 * @param {string} userName - User's display name
 */
function updateHeaderUI(imageUrl, userName) {
    const loginBtn = document.getElementById('topLoginBtn');
    const avatarImg = document.getElementById('topUserAvatar');

    // Hide the login button
    if (loginBtn) {
        loginBtn.classList.add('hidden');
    }

    // Show and set the avatar
    if (avatarImg && imageUrl) {
        avatarImg.src = imageUrl;
        avatarImg.alt = userName || 'User';
        avatarImg.title = `Logged in as ${userName || 'User'} - Click to open Settings`;
        avatarImg.classList.remove('hidden');
    }
}

/**
 * Restore login state from localStorage on page load
 */
function restoreLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userPicture = localStorage.getItem('userPicture');
    const userName = localStorage.getItem('userName');

    if (isLoggedIn && userPicture) {
        updateHeaderUI(userPicture, userName);

        // Also update the settings button
        const btn = document.getElementById('btn-google-login');
        if (btn) {
            btn.innerHTML = '✅ Signed In';
            btn.style.borderColor = '#34A853';
            btn.style.color = '#34A853';
        }
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', restoreLoginState);
