class OthelloGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'black'; // 흑돌이 먼저 시작
        this.gameHistory = []; // 게임 히스토리 (보드 상태 + 플레이어 순서)
        this.gameOver = false;
        this.validMoves = [];
        this.lastMove = null; // 마지막에 둔 위치
        this.currentHistoryIndex = -1; // 현재 히스토리 인덱스
        this.moves = []; // 기보 (좌표 기록)
        
        // 게임 모드 설정
        this.gameMode = null; // '1player' 또는 '2player'
        this.playerColor = null; // 1플레이어 모드에서 플레이어가 선택한 색상
        this.aiColor = null; // AI가 플레이할 색상
        
        this.setupModeSelection();
    }

    // 게임 모드 선택 UI 설정
    setupModeSelection() {
        // 게임 모드 선택 버튼 이벤트
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.gameMode = btn.dataset.mode;
                if (this.gameMode === '1player') {
                    this.showColorSelection();
                } else {
                    this.startGame();
                }
            });
        });

        // AI 색상 선택 버튼 이벤트
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playerColor = btn.dataset.color;
                this.aiColor = this.playerColor === 'black' ? 'white' : 'black';
                this.startGame();
            });
        });

        // 뒤로 가기 버튼 이벤트
        document.getElementById('back-to-mode').addEventListener('click', () => {
            this.showModeSelection();
        });
    }

    // 게임 모드 선택 화면 표시
    showModeSelection() {
        document.getElementById('game-mode-selection').style.display = 'flex';
        document.getElementById('ai-color-selection').style.display = 'none';
        document.getElementById('game-ui').style.display = 'none';
    }

    // AI 색상 선택 화면 표시
    showColorSelection() {
        document.getElementById('game-mode-selection').style.display = 'none';
        document.getElementById('ai-color-selection').style.display = 'flex';
        document.getElementById('game-ui').style.display = 'none';
    }

    // 게임 시작
    startGame() {
        document.getElementById('game-mode-selection').style.display = 'none';
        document.getElementById('ai-color-selection').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateDisplay();
    }

    // 보드 초기화
    initializeBoard() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // 초기 돌 배치 (고정된 위치)
        this.board[3][3] = 'white';  // D4
        this.board[3][4] = 'black';  // E4
        this.board[4][3] = 'black';  // D5
        this.board[4][4] = 'white';  // E5
        
        this.renderBoard();
        this.findValidMoves();
    }

    // 보드 렌더링
    renderBoard() {
        const boardElement = document.getElementById('othello-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.board[row][col]) {
                    cell.classList.add(this.board[row][col]);
                }
                
                // 유효한 수 표시
                if (this.isValidMove(row, col)) {
                    cell.classList.add('valid-move');
                }
                
                // 마지막 수 표시
                if (this.lastMove && this.lastMove[0] === row && this.lastMove[1] === col) {
                    cell.classList.add('last-move');
                }
                
                cell.addEventListener('click', () => this.makeMove(row, col));
                boardElement.appendChild(cell);
            }
        }
    }

    // 유효한 수 찾기
    findValidMoves() {
        this.validMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col)) {
                    this.validMoves.push([row, col]);
                }
            }
        }
    }

    // 특정 위치가 유효한 수인지 확인
    isValidMove(row, col) {
        if (this.board[row][col] !== null) return false;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            if (this.wouldFlip(row, col, dr, dc).length > 0) {
                return true;
            }
        }
        return false;
    }

    // 특정 방향으로 뒤집힐 돌들 계산
    wouldFlip(row, col, dr, dc) {
        const flips = [];
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (this.board[r][c] === null) break;
            if (this.board[r][c] === this.currentPlayer) {
                return flips;
            }
            flips.push([r, c]);
            r += dr;
            c += dc;
        }
        
        return [];
    }

    // 수 두기
    makeMove(row, col) {
        if (this.gameOver || !this.isValidMove(row, col)) return;

        // 게임 히스토리 저장 (보드 상태 + 현재 플레이어)
        this.gameHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer
        });

        // 돌 놓기
        this.board[row][col] = this.currentPlayer;
        
        // 마지막 수 위치 저장
        this.lastMove = [row, col];

        // 상대방 돌 뒤집기
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const flips = this.wouldFlip(row, col, dr, dc);
            for (const [fr, fc] of flips) {
                this.board[fr][fc] = this.currentPlayer;
            }
        }

        // 기보에 수 추가
        this.addMove(row, col);

        // 플레이어 변경
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // 유효한 수 찾기
        this.findValidMoves();
        
        // 게임 상태 확인 (강제 패스 처리)
        this.checkGameState();
        
        // 화면 업데이트
        this.renderBoard();
        this.updateDisplay();
        
        // 되돌리기 버튼 활성화
        document.getElementById('undo-btn').disabled = false;
        
        // AI 턴 처리 (1플레이어 모드에서)
        if (this.gameMode === '1player' && !this.gameOver && this.currentPlayer === this.aiColor) {
            setTimeout(() => this.makeAIMove(), 500); // 0.5초 후 AI 수
        }
    }

    // AI 수 두기 (버전 2 AI 사용)
    makeAIMove() {
        if (this.gameOver || this.currentPlayer !== this.aiColor) return;

        console.log('AI 차례입니다. AI 색상:', this.aiColor);
        console.log('유효한 수들:', this.validMoves);

        // 버전 2 AI 사용
        if (typeof window.OthelloAI_v2 !== 'undefined') {
            console.log('OthelloAI_v2 클래스를 찾았습니다!');
            
            try {
                // AI 인스턴스 생성 (난이도: expert)
                const ai = new window.OthelloAI_v2('expert');
                console.log('AI 인스턴스 생성 성공');
                
                // 현재 보드 상태를 AI가 이해할 수 있는 형태로 변환
                const boardForAI = this.convertBoardForAI();
                console.log('보드 변환 완료:', boardForAI);
                
                // AI가 다음 수를 결정
                const aiMove = ai.getNextMove(boardForAI, this.aiColor, this.validMoves);
                console.log('AI가 선택한 수:', aiMove);
                
                if (aiMove && this.validMoves.some(move => move[0] === aiMove[0] && move[1] === aiMove[1])) {
                    // AI가 선택한 수가 유효한 경우
                    console.log('AI 수를 둡니다:', aiMove);
                    this.makeMove(aiMove[0], aiMove[1]);
                    return;
                } else {
                    console.log('AI가 선택한 수가 유효하지 않습니다. fallback 사용');
                }
            } catch (error) {
                console.error('AI 실행 중 오류 발생:', error);
            }
        } else {
            console.log('OthelloAI_v2 클래스를 찾을 수 없습니다. 랜덤 AI 사용');
        }
        
        // AI가 작동하지 않는 경우 기존 랜덤 로직 사용
        if (this.validMoves.length === 0) {
            // AI가 수를 둘 수 없음 - 패스
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
            this.findValidMoves();
            this.checkGameState();
            this.updateDisplay();
            return;
        }

        // 랜덤으로 유효한 수 선택 (fallback)
        const randomIndex = Math.floor(Math.random() * this.validMoves.length);
        const [row, col] = this.validMoves[randomIndex];
        
        console.log('랜덤 AI 수를 둡니다:', [row, col]);
        // AI 수 두기
        this.makeMove(row, col);
    }

    /**
     * 보드를 AI가 이해할 수 있는 형태로 변환
     */
    convertBoardForAI() {
        const boardForAI = [];
        for (let row = 0; row < 8; row++) {
            boardForAI[row] = [];
            for (let col = 0; col < 8; col++) {
                const cell = this.board[row][col];
                if (cell === null) {
                    boardForAI[row][col] = null;
                } else if (cell === 'black') {
                    boardForAI[row][col] = 'black';
                } else {
                    boardForAI[row][col] = 'white';
                }
            }
        }
        return boardForAI;
    }

    // 기보에 수 추가
    addMove(row, col) {
        const coordinate = String.fromCharCode(65 + col) + (row + 1); // A1, B2 등
        this.moves.push({
            player: this.currentPlayer,
            coordinate: coordinate,
            row: row,
            col: col
        });
        this.updateMovesDisplay();
    }

    // 게임 상태 확인 (강제 패스 처리)
    checkGameState() {
        if (this.validMoves.length === 0) {
            // 현재 플레이어가 수를 놓을 수 없음 - 강제 패스
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
            this.findValidMoves();
            
            if (this.validMoves.length === 0) {
                // 양쪽 모두 수를 놓을 수 없음 - 게임 종료
                this.gameOver = true;
                this.endGame();
            } else {
                // 강제 패스 후 다음 플레이어에게 차례
                this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다. (상대방이 패스했습니다)`);
            }
        }
    }

    // 게임 종료
    endGame() {
        const blackCount = this.countStones('black');
        const whiteCount = this.countStones('white');
        
        let message = `게임 종료! `;
        if (blackCount > whiteCount) {
            message += `흑돌 승리 (${blackCount}:${whiteCount})`;
        } else if (whiteCount > blackCount) {
            message += `백돌 승리 (${whiteCount}:${blackCount})`;
        } else {
            message += `무승부 (${blackCount}:${whiteCount})`;
        }
        
        this.updateStatus(message);
    }

    // 돌 개수 세기
    countStones(color) {
        return this.board.flat().filter(cell => cell === color).length;
    }

    // 되돌리기 (플레이어 순서도 함께 복원)
    undo() {
        if (this.gameHistory.length === 0) return;
        
        const lastState = this.gameHistory.pop();
        this.board = lastState.board;
        this.currentPlayer = lastState.currentPlayer; // 플레이어 순서 복원
        this.gameOver = false;
        
        // 마지막 수 위치 업데이트
        if (this.gameHistory.length > 0) {
            const previousState = this.gameHistory[this.gameHistory.length - 1];
            // 이전 상태와 비교해서 마지막 수 찾기
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (this.board[row][col] !== previousState.board[row][col]) {
                        this.lastMove = [row, col];
                        break;
                    }
                }
            }
        } else {
            this.lastMove = null;
        }
        
        // 기보에서 마지막 수 제거
        if (this.moves.length > 0) {
            this.moves.pop();
            this.updateMovesDisplay();
        }
        
        this.findValidMoves();
        this.renderBoard();
        this.updateDisplay();
        
        // 되돌리기 후 상태 메시지 업데이트
        if (this.validMoves.length > 0) {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다.`);
        } else {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다. (수 없음)`);
        }
        
        if (this.gameHistory.length === 0) {
            document.getElementById('undo-btn').disabled = true;
        }
    }

    // 새 게임
    newGame() {
        this.board = [];
        this.currentPlayer = 'black';
        this.gameHistory = [];
        this.gameOver = false;
        this.validMoves = [];
        this.lastMove = null;
        this.moves = [];
        
        this.initializeBoard();
        this.updateDisplay();
        
        document.getElementById('undo-btn').disabled = true;
    }

    // 처음으로 이동
    goToFirst() {
        if (this.gameHistory.length === 0) return;
        
        // 모든 히스토리 제거하고 초기 상태로
        this.gameHistory = [];
        this.lastMove = null;
        this.moves = [];
        this.initializeBoard();
        this.updateDisplay();
        document.getElementById('undo-btn').disabled = true;
        this.updateStatus('게임 초기 상태입니다.');
    }

    // 분석 모드 토글
    toggleAnalyze() {
        const analyzeBtn = document.getElementById('analyze-btn');
        analyzeBtn.classList.toggle('active');
        
        if (analyzeBtn.classList.contains('active')) {
            this.updateStatus('분석 모드가 활성화되었습니다.');
        } else {
            this.updateStatus('분석 모드가 비활성화되었습니다.');
        }
    }

    // 게임 정보 표시
    showGameInfo() {
        const blackCount = this.countStones('black');
        const whiteCount = this.countStones('white');
        const totalMoves = this.gameHistory.length;
        
        let modeInfo = '';
        if (this.gameMode === '1player') {
            modeInfo = `\n- 게임 모드: 1 플레이어 (AI: ${this.aiColor === 'black' ? '흑돌' : '백돌'})`;
        } else {
            modeInfo = '\n- 게임 모드: 2 플레이어';
        }
        
        const info = `게임 정보:${modeInfo}
        - 총 수: ${totalMoves}
        - 흑돌: ${blackCount}개
        - 백돌: ${whiteCount}개
        - 현재 차례: ${this.currentPlayer === 'black' ? '흑돌' : '백돌'}`;
        
        this.updateStatus(info);
    }

    // 기보 표시 업데이트
    updateMovesDisplay() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        
        this.moves.forEach((move, index) => {
            const moveItem = document.createElement('div');
            moveItem.className = `move-item ${move.player}`;
            moveItem.innerHTML = `
                <span class="move-number">${index + 1}.</span>
                <span class="move-coordinate">${move.coordinate}</span>
            `;
            movesList.appendChild(moveItem);
        });
    }

    // 기보 복사하기
    copyMoves() {
        if (this.moves.length === 0) {
            this.updateStatus('복사할 기보가 없습니다.');
            return;
        }

        // 기보를 텍스트로 변환
        const movesText = this.moves.map((move, index) => {
            const player = move.player === 'black' ? '흑' : '백';
            return `${index + 1}. ${player} ${move.coordinate}`;
        }).join('\n');

        // 클립보드에 복사
        navigator.clipboard.writeText(movesText).then(() => {
            this.updateStatus('기보가 클립보드에 복사되었습니다.');
        }).catch(err => {
            // fallback: 구형 브라우저 지원
            const textArea = document.createElement('textarea');
            textArea.value = movesText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.updateStatus('기보가 클립보드에 복사되었습니다.');
        });
    }

    // 화면 업데이트
    updateDisplay() {
        // 돌 개수 업데이트
        document.getElementById('black-count').textContent = this.countStones('black');
        document.getElementById('white-count').textContent = this.countStones('white');
        
        // 현재 차례 표시
        const turnElement = document.getElementById('current-turn');
        if (!this.gameOver) {
            let turnText = `${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례`;
            
            // 1플레이어 모드에서 AI 턴 표시
            if (this.gameMode === '1player' && this.currentPlayer === this.aiColor) {
                turnText += ' (AI)';
            }
            
            turnElement.innerHTML = `<span>${turnText}</span>`;
        }
    }

    // 상태 메시지 업데이트
    updateStatus(message) {
        document.getElementById('game-status').innerHTML = `<p>${message}</p>`;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('first-btn').addEventListener('click', () => this.goToFirst());
        document.getElementById('analyze-btn').addEventListener('click', () => this.toggleAnalyze());
        document.getElementById('info-btn').addEventListener('click', () => this.showGameInfo());
        document.getElementById('copy-moves-btn').addEventListener('click', () => this.copyMoves());
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new OthelloGame();
});
