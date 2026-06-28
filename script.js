// Retro-Neon Tic Tac Toe Logic

document.addEventListener('DOMContentLoaded', () => {
    // --- GAME STATE ---
    let board = Array(9).fill(null);
    let currentPlayer = 'X'; // X starts
    let isGameActive = true;
    let gameMode = 'pvp'; // 'pvp' or 'ai'
    let aiDifficulty = 'easy'; // 'easy', 'medium', 'impossible'
    let isMuted = false;
    
    let scores = {
        x: 0,
        o: 0,
        draw: 0
    };

    const WINNING_COMBINATIONS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // --- DOM ELEMENTS ---
    const cells = document.querySelectorAll('.grid-cell');
    const modePvpBtn = document.getElementById('mode-pvp');
    const modeAiBtn = document.getElementById('mode-ai');
    const aiDifficultyContainer = document.getElementById('ai-difficulty-container');
    const diffBtns = document.querySelectorAll('.btn-diff');
    
    const cardX = document.getElementById('card-x');
    const cardO = document.getElementById('card-o');
    const scoreXText = document.getElementById('score-x');
    const scoreOText = document.getElementById('score-o');
    const scoreDrawText = document.getElementById('score-draw');
    const nameOText = document.getElementById('name-o');
    
    const btnSound = document.getElementById('btn-sound');
    const soundOnIcon = document.getElementById('sound-on-icon');
    const soundOffIcon = document.getElementById('sound-off-icon');
    const btnResetScores = document.getElementById('btn-reset-scores');
    const btnRestart = document.getElementById('btn-restart');
    
    const overlay = document.getElementById('overlay-screen');
    const overlayResultText = document.getElementById('overlay-result-text');
    const overlaySubtext = document.getElementById('overlay-subtext');
    const btnOverlayClose = document.getElementById('btn-overlay-close');
    
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');

    // --- WEB AUDIO API SYNTHESIZER ---
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playTone(frequency, type, duration, startTimeOffset = 0) {
        if (isMuted) return;
        initAudio();
        
        // Resume context if suspended (browser security)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + startTimeOffset);
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + startTimeOffset);
        // Exponential decay for nice synth pluck sound
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTimeOffset + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + startTimeOffset);
        osc.stop(audioCtx.currentTime + startTimeOffset + duration);
    }

    function playClickSound() {
        // High pitch synth chirp for clicks
        playTone(600, 'sine', 0.1);
        playTone(900, 'sine', 0.08, 0.02);
    }

    function playWinSound() {
        // Melodic neon arpeggio
        const tempo = 0.09;
        playTone(261.63, 'triangle', 0.25, 0);       // C4
        playTone(329.63, 'triangle', 0.25, tempo);   // E4
        playTone(392.00, 'triangle', 0.25, tempo*2); // G4
        playTone(523.25, 'triangle', 0.4, tempo*3);   // C5
        playTone(659.25, 'triangle', 0.5, tempo*4);   // E5
    }

    function playDrawSound() {
        // Detuned slightly melancholy descending beep
        playTone(330, 'triangle', 0.3, 0);
        playTone(294, 'triangle', 0.35, 0.1);
        playTone(220, 'triangle', 0.4, 0.25);
    }

    function playResetSound() {
        // Swoosh frequency sweep
        if (isMuted) return;
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.25);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.28);
    }

    // --- CONFETTI PARTICLE SYSTEM ---
    let particles = [];
    let confettiAnimationId = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = canvas.width / 2;
            this.y = canvas.height * 0.4; // Explode from middle area
            this.size = Math.random() * 8 + 6;
            this.speedX = (Math.random() - 0.5) * 14;
            this.speedY = (Math.random() - 0.5) * 14 - 4; // upward bias
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * 10;
            
            const colors = [
                '#00f3ff', // neon cyan
                '#ff007f', // neon rose
                '#bd00ff', // neon purple
                '#ffd700', // gold
                '#39ff14'  // neon green
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.opacity = 1;
            this.gravity = 0.2;
            this.decay = Math.random() * 0.01 + 0.008;
        }

        update() {
            this.speedY += this.gravity;
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            this.opacity -= this.decay;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    function spawnConfetti() {
        particles = [];
        for (let i = 0; i < 150; i++) {
            particles.push(new Particle());
        }
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
        }
        animateConfetti();
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, idx) => {
            p.update();
            p.draw();
            if (p.opacity <= 0) {
                particles.splice(idx, 1);
            }
        });

        if (particles.length > 0) {
            confettiAnimationId = requestAnimationFrame(animateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // --- GAME ENGINE ---

    // Token SVG generators
    const getXToken = () => `
        <svg viewBox="0 0 24 24" class="token-x" fill="none" stroke-width="3">
            <line x1="18" y1="6" x2="6" y2="18" class="draw-path" />
            <line x1="6" y1="6" x2="18" y2="18" class="draw-path" style="animation-delay: 0.12s;" />
        </svg>
    `;

    const getOToken = () => `
        <svg viewBox="0 0 24 24" class="token-o" fill="none" stroke-width="3">
            <circle cx="12" cy="12" r="9" class="draw-path" />
        </svg>
    `;

    function updateTurnIndicators() {
        if (!isGameActive) {
            cardX.classList.remove('active-turn');
            cardO.classList.remove('active-turn');
            removeCellHoverClasses();
            return;
        }

        if (currentPlayer === 'X') {
            cardX.classList.add('active-turn');
            cardO.classList.remove('active-turn');
        } else {
            cardX.classList.remove('active-turn');
            cardO.classList.add('active-turn');
        }
        updateCellHoverPreviews();
    }

    function updateCellHoverPreviews() {
        cells.forEach(cell => {
            cell.classList.remove('preview-x', 'preview-o');
            
            const cellIndex = parseInt(cell.getAttribute('data-index'));
            if (board[cellIndex] === null && isGameActive) {
                // If it is AI's turn, do not draw previews
                if (gameMode === 'ai' && currentPlayer === 'O') return;
                
                if (currentPlayer === 'X') {
                    cell.classList.add('preview-x');
                } else {
                    cell.classList.add('preview-o');
                }
            }
        });
    }

    function removeCellHoverClasses() {
        cells.forEach(cell => cell.classList.remove('preview-x', 'preview-o'));
    }

    function handleCellClick(e) {
        const cell = e.currentTarget;
        const index = parseInt(cell.getAttribute('data-index'));

        // Guard: Cell taken, game inactive, or waiting on AI
        if (board[index] !== null || !isGameActive || (gameMode === 'ai' && currentPlayer === 'O')) {
            return;
        }

        makeMove(index);
    }

    function makeMove(index) {
        playClickSound();
        board[index] = currentPlayer;
        
        // UI injection
        const cell = cells[index];
        cell.classList.remove('preview-x', 'preview-o');
        cell.innerHTML = currentPlayer === 'X' ? getXToken() : getOToken();
        
        if (checkWin()) {
            endGame(false);
        } else if (checkDraw()) {
            endGame(true);
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateTurnIndicators();

            if (gameMode === 'ai' && currentPlayer === 'O' && isGameActive) {
                // Delay AI move slightly for realistic feel
                setTimeout(makeAIMove, 500);
            }
        }
    }

    function checkWin() {
        for (let comb of WINNING_COMBINATIONS) {
            const [a, b, c] = comb;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                highlightWinningCells(comb);
                return true;
            }
        }
        return false;
    }

    function checkDraw() {
        return board.every(cell => cell !== null);
    }

    function highlightWinningCells(indices) {
        indices.forEach(idx => {
            cells[idx].classList.add('winning-cell');
        });
    }

    function endGame(isDraw) {
        isGameActive = false;
        removeCellHoverClasses();
        updateTurnIndicators();

        setTimeout(() => {
            if (isDraw) {
                scores.draw++;
                scoreDrawText.textContent = scores.draw;
                overlayResultText.textContent = "IT'S A DRAW";
                overlayResultText.className = "win-draw";
                overlaySubtext.textContent = "Perfect balance of minds";
                playDrawSound();
            } else {
                const winner = currentPlayer;
                if (winner === 'X') {
                    scores.x++;
                    scoreXText.textContent = scores.x;
                    overlayResultText.textContent = "PLAYER X WINS!";
                    overlayResultText.className = "win-x";
                    overlaySubtext.textContent = "A spectacular triumph";
                } else {
                    scores.o++;
                    scoreOText.textContent = scores.o;
                    if (gameMode === 'ai') {
                        overlayResultText.textContent = "COMPUTER WINS!";
                        overlaySubtext.textContent = "The machine dominates";
                    } else {
                        overlayResultText.textContent = "PLAYER O WINS!";
                        overlaySubtext.textContent = "A spectacular triumph";
                    }
                    overlayResultText.className = "win-o";
                }
                playWinSound();
                spawnConfetti();
            }
            overlay.classList.remove('hidden');
        }, 800);
    }

    function restartGame() {
        board = Array(9).fill(null);
        currentPlayer = 'X';
        isGameActive = true;
        
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'grid-cell'; // wipe highlights & classes
        });

        // Hide overlay & stop confetti
        overlay.classList.add('hidden');
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        updateTurnIndicators();
    }

    function resetScores() {
        scores.x = 0;
        scores.o = 0;
        scores.draw = 0;
        
        scoreXText.textContent = '0';
        scoreOText.textContent = '0';
        scoreDrawText.textContent = '0';
        
        playResetSound();
    }

    // --- GAME CONFIG CONTROLS ---

    function switchMode(e) {
        const selectedMode = e.currentTarget.getAttribute('data-mode');
        if (selectedMode === gameMode) return;

        playClickSound();
        gameMode = selectedMode;

        // Button visuals toggle
        modePvpBtn.classList.remove('active');
        modeAiBtn.classList.remove('active');
        e.currentTarget.classList.add('active');

        if (gameMode === 'ai') {
            aiDifficultyContainer.classList.remove('hidden');
            nameOText.textContent = 'Computer';
        } else {
            aiDifficultyContainer.classList.add('hidden');
            nameOText.textContent = 'Player O';
        }

        resetScores();
        restartGame();
    }

    function switchDifficulty(e) {
        const diff = e.currentTarget.getAttribute('data-diff');
        if (diff === aiDifficulty) return;

        playClickSound();
        aiDifficulty = diff;

        diffBtns.forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');

        resetScores();
        restartGame();
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
        } else {
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
            // Play a test beep when unmuting
            playTone(440, 'sine', 0.1);
        }
    }

    // --- AI IMPLEMENTATION (MINIMAX + HEURISTICS) ---

    function makeAIMove() {
        if (!isGameActive) return;

        let targetIndex;
        if (aiDifficulty === 'easy') {
            targetIndex = getEasyAIMove();
        } else if (aiDifficulty === 'medium') {
            targetIndex = getMediumAIMove();
        } else {
            targetIndex = getImpossibleAIMove();
        }

        if (targetIndex !== undefined && targetIndex !== -1) {
            makeMove(targetIndex);
        }
    }

    function getEmptyCells(currBoard) {
        return currBoard
            .map((val, idx) => (val === null ? idx : null))
            .filter(val => val !== null);
    }

    // Easy AI: Pick completely randomly
    function getEasyAIMove() {
        const available = getEmptyCells(board);
        if (available.length === 0) return -1;
        return available[Math.floor(Math.random() * available.length)];
    }

    // Medium AI: Win if possible, block player if possible, otherwise random with center bias
    function getMediumAIMove() {
        const available = getEmptyCells(board);
        
        // 1. Can AI Win right now?
        for (let idx of available) {
            const tempBoard = [...board];
            tempBoard[idx] = 'O'; // Try AI mark
            if (checkBoardWinState(tempBoard, 'O')) {
                return idx;
            }
        }

        // 2. Can Player Win next turn? If so, block!
        for (let idx of available) {
            const tempBoard = [...board];
            tempBoard[idx] = 'X'; // Try Player mark
            if (checkBoardWinState(tempBoard, 'X')) {
                return idx;
            }
        }

        // 3. Take Center if open (heuristic bias)
        if (available.includes(4)) {
            return 4;
        }

        // 4. Fallback to random move
        return available[Math.floor(Math.random() * available.length)];
    }

    function checkBoardWinState(tempBoard, player) {
        return WINNING_COMBINATIONS.some(comb => {
            return tempBoard[comb[0]] === player && 
                   tempBoard[comb[1]] === player && 
                   tempBoard[comb[2]] === player;
        });
    }

    // Impossible AI: Minimax algorithm implementation
    function getImpossibleAIMove() {
        const result = minimax(board, 'O', 0, -Infinity, Infinity);
        return result.index;
    }

    // Minimax with Alpha-Beta Pruning
    function minimax(tempBoard, player, depth, alpha, beta) {
        const available = getEmptyCells(tempBoard);

        // Terminating states
        if (checkBoardWinState(tempBoard, 'X')) {
            return { score: -10 + depth }; // minimize player (human)
        }
        if (checkBoardWinState(tempBoard, 'O')) {
            return { score: 10 - depth }; // maximize AI
        }
        if (available.length === 0) {
            return { score: 0 }; // draw
        }

        const moves = [];

        for (let i = 0; i < available.length; i++) {
            const move = {};
            move.index = available[i];
            
            // Apply trial move
            tempBoard[available[i]] = player;

            if (player === 'O') {
                const result = minimax(tempBoard, 'X', depth + 1, alpha, beta);
                move.score = result.score;
                
                // Alpha-beta pruning logic
                alpha = Math.max(alpha, move.score);
                tempBoard[available[i]] = null; // undo trial move
                moves.push(move);
                if (beta <= alpha) break; // beta prune
            } else {
                const result = minimax(tempBoard, 'O', depth + 1, alpha, beta);
                move.score = result.score;
                
                // Alpha-beta pruning logic
                beta = Math.min(beta, move.score);
                tempBoard[available[i]] = null; // undo trial move
                moves.push(move);
                if (beta <= alpha) break; // alpha prune
            }
        }

        let bestMove;
        if (player === 'O') {
            let bestScore = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }

        return moves[bestMove];
    }

    // --- EVENT LISTENERS REGISTRATION ---
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    
    modePvpBtn.addEventListener('click', switchMode);
    modeAiBtn.addEventListener('click', switchMode);
    
    diffBtns.forEach(btn => btn.addEventListener('click', switchDifficulty));
    
    btnSound.addEventListener('click', toggleMute);
    btnResetScores.addEventListener('click', resetScores);
    btnRestart.addEventListener('click', restartGame);
    
    btnOverlayClose.addEventListener('click', restartGame);

    // Initial load updates
    updateTurnIndicators();
});
