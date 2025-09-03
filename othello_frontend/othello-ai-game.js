/**
 * 오델로 AI 게임 클래스
 * AI와 1:1 대전을 위한 게임 로직
 */
class OthelloAIGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'black'; // 흑돌이 먼저 시작
        this.gameHistory = []; // 게임 히스토리
        this.gameOver = false;
        this.validMoves = [];
        this.lastMove = null;
        this.currentHistoryIndex = -1;
        this.moves = []; // 기보
        
        // AI 관련 설정
        this.ai = new OthelloAI_v1('expert'); // 기본을 전문가 모드로 설정
        this.ai_v2 = new OthelloAI_v2('expert'); // 버전 2 AI 추가
        this.currentAIVersion = 'v2'; // 현재 AI 버전 (v2로 기본 설정)
        this.aiPlayer = 'white'; // AI가 플레이할 색상
        this.aiDifficulty = 'expert'; // 기본을 전문가 모드로 설정
        this.isAITurn = false;
        this.aiThinkingTime = 0;
        this.aiThinkingStart = 0;
        
        // 게임 모드
        this.gameMode = 'human_vs_ai';
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateAIDisplay();
    }

    // 보드 초기화
    initializeBoard() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // 초기 돌 배치
        this.board[3][3] = 'white';  // D4
        this.board[3][4] = 'black';  // E4
        this.board[4][3] = 'black';  // D5
        this.board[4][4] = 'white';  // E5
        
        this.renderBoard();
        this.findValidMoves();
        
        // AI가 흑돌일 경우 게임 시작과 동시에 AI 턴 처리
        if (this.currentPlayer === this.aiPlayer && !this.gameOver) {
            // 약간의 지연을 두어 UI가 완전히 렌더링된 후 AI 턴 처리
            setTimeout(() => {
                this.handleAITurn();
            }, 50);
        }
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
                
                // 유효한 수 표시 (AI 턴이 아닐 때만)
                if (!this.isAITurn && this.isValidMove(row, col)) {
                    cell.classList.add('valid-move');
                }
                
                // 마지막 수 표시
                if (this.lastMove && this.lastMove[0] === row && this.lastMove[1] === col) {
                    cell.classList.add('last-move');
                }
                
                // AI 턴이 아닐 때만 클릭 이벤트 추가
                if (!this.isAITurn) {
                    cell.addEventListener('click', () => this.makeMove(row, col));
                }
                
                boardElement.appendChild(cell);
            }
        }
        
        // 좌표 시스템이 항상 보이도록 보장
        this.ensureCoordinateSystem();
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
        if (this.gameOver || !this.isValidMove(row, col) || this.isAITurn) return;

        // 현재 상태를 히스토리에 저장
        const currentState = {
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            lastMove: this.lastMove
        };
        
        this.gameHistory = this.gameHistory.slice(0, this.currentHistoryIndex + 1);
        this.gameHistory.push(currentState);
        this.currentHistoryIndex++;

        // 돌 놓기
        this.board[row][col] = this.currentPlayer;
        this.lastMove = [row, col];
        
        // 기보에 기록
        const coordinate = this.getCoordinate(row, col);
        this.moves.push({
            player: this.currentPlayer,
            coordinate: coordinate,
            row: row,
            col: col
        });

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

        // 플레이어 변경
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // 유효한 수 찾기
        this.findValidMoves();
        
        // 게임 상태 확인
        this.checkGameState();
        
        // 화면 업데이트
        this.renderBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        
        // 버튼 상태 업데이트
        this.updateButtonStates();
        
        // 기보 업데이트
        this.updateMovesDisplay();
        
        // AI 턴 처리
        this.handleAITurn();
    }

    // AI 턴 처리
    handleAITurn() {
        // 게임이 종료되었거나 AI 턴이 아니면 리턴
        if (this.gameOver || this.currentPlayer !== this.aiPlayer) return;
        
        // 이미 AI 턴 중이면 중복 실행 방지
        if (this.isAITurn) return;
        
        this.isAITurn = true;
        this.aiThinkingStart = Date.now();
        this.showAIThinking(true);
        
        // AI가 수를 계산하는 동안 약간의 지연
        setTimeout(() => {
            try {
                const aiMove = this.getAIMove();
                if (aiMove) {
                    this.makeAIMove(aiMove);
                } else {
                    // AI가 수를 찾지 못한 경우
                    this.updateStatus('AI가 유효한 수를 찾지 못했습니다.');
                }
            } catch (error) {
                console.error('AI 턴 처리 중 오류:', error);
                this.updateStatus('AI 턴 처리 중 오류가 발생했습니다.');
            } finally {
                this.showAIThinking(false);
                this.isAITurn = false;
            }
        }, 100);
    }

    // AI 수 계산
    getAIMove() {
        const startTime = Date.now();
        
        // AI 버전에 따라 다른 AI 사용
        let move;
        if (this.currentAIVersion === 'v2') {
            // AI 난이도 설정 (v2는 항상 expert)
            move = this.ai_v2.getNextMove(this.board, this.aiPlayer, this.validMoves);
        } else {
            // AI 난이도 설정
            this.ai.setDifficulty(this.aiDifficulty);
            move = this.ai.getNextMove(this.board, this.aiPlayer, this.validMoves);
        }
        
        this.aiThinkingTime = Date.now() - startTime;
        return move;
    }

    // AI 수 실행
    makeAIMove(move) {
        if (!move) return;
        
        const [row, col] = move;
        
        // AI 수를 직접 실행 (makeMove 호출하지 않음)
        this.executeAIMove(row, col);
    }

    // AI 수 직접 실행
    executeAIMove(row, col) {
        // 현재 상태를 히스토리에 저장
        const currentState = {
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            lastMove: this.lastMove
        };
        
        this.gameHistory = this.gameHistory.slice(0, this.currentHistoryIndex + 1);
        this.gameHistory.push(currentState);
        this.currentHistoryIndex++;

        // 돌 놓기
        this.board[row][col] = this.currentPlayer;
        this.lastMove = [row, col];
        
        // 기보에 기록
        const coordinate = this.getCoordinate(row, col);
        this.moves.push({
            player: this.currentPlayer,
            coordinate: coordinate,
            row: row,
            col: col
        });

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

        // 플레이어 변경
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // 유효한 수 찾기
        this.findValidMoves();
        
        // 게임 상태 확인
        this.checkGameState();
        
        // 화면 업데이트
        this.renderBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        
        // 버튼 상태 업데이트
        this.updateButtonStates();
        
        // 기보 업데이트
        this.updateMovesDisplay();
        
        // AI 턴이 아닐 때만 AI 턴 처리 (무한 루프 방지)
        if (this.currentPlayer === this.aiPlayer && !this.gameOver) {
            this.handleAITurn();
        }
    }

    // AI 생각 중 표시
    showAIThinking(show) {
        const thinkingElement = document.getElementById('ai-thinking');
        if (show) {
            thinkingElement.classList.remove('hidden');
        } else {
            thinkingElement.classList.add('hidden');
        }
    }

    // 좌표 시스템이 항상 보이도록 보장
    ensureCoordinateSystem() {
        const boardInfo = document.querySelector('.board-info');
        if (boardInfo) {
            boardInfo.style.display = 'block';
            boardInfo.style.visibility = 'visible';
            boardInfo.style.opacity = '1';
        }
    }

    // 좌표 변환
    getCoordinate(row, col) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const numbers = ['1', '2', '3', '4', '5', '6', '7', '8'];
        return letters[col] + numbers[row];
    }

    // 기보 표시 업데이트
    updateMovesDisplay() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';

        this.moves.forEach((move, index) => {
            const moveItem = document.createElement('div');
            moveItem.className = `move-item ${move.player}`;
            
            if (index === this.moves.length - 1) {
                moveItem.classList.add('current');
            }
            
            const playerLabel = move.player === 'black' ? '흑' : '백';
            moveItem.innerHTML = `
                <span class="move-number">${index + 1}</span>
                <span class="move-player">${playerLabel}</span>
                <span class="move-coordinate">${move.coordinate}</span>
            `;
            
            movesList.appendChild(moveItem);
        });
    }

    // 게임 상태 확인
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

    // 되돌리기
    undo() {
        if (this.currentHistoryIndex <= 0) return;
        
        this.currentHistoryIndex--;
        const previousState = this.gameHistory[this.currentHistoryIndex];
        
        this.board = JSON.parse(JSON.stringify(previousState.board));
        this.currentPlayer = previousState.currentPlayer;
        this.lastMove = previousState.lastMove;
        this.gameOver = false;
        
        this.findValidMoves();
        this.renderBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        
        this.updateButtonStates();
        this.updateMovesDisplay();
        
        if (this.validMoves.length > 0) {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다.`);
        } else {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다. (수 없음)`);
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
        this.currentHistoryIndex = -1;
        this.moves = [];
        
        // AI 턴 초기화 - AI가 흑돌이면 첫 턴을 처리해야 함
        this.isAITurn = false;
        this.aiThinkingTime = 0;
        
        this.initializeBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        
        this.updateButtonStates();
        this.updateMovesDisplay();
        
        // AI 버전 정보 표시
        const aiVersionText = this.currentAIVersion === 'v2' ? '버전 2 (논문 기반 최신 AI)' : '버전 1 (기존 AI)';
        this.updateStatus(`새 게임을 시작합니다! 🤖 ${aiVersionText}와 대전합니다.`);
        
        // AI가 흑돌일 경우 첫 턴 처리 (initializeBoard에서 처리되지 않았을 경우)
        if (this.currentPlayer === this.aiPlayer && !this.gameOver) {
            setTimeout(() => {
                this.handleAITurn();
            }, 100);
        }
    }

    // 처음으로 이동
    goToFirst() {
        if (this.gameHistory.length === 0) return;
        
        this.currentHistoryIndex = 0;
        const initialState = this.gameHistory[0];
        
        this.board = JSON.parse(JSON.stringify(initialState.board));
        this.currentPlayer = initialState.currentPlayer;
        this.lastMove = initialState.currentPlayer;
        this.gameOver = false;
        
        this.findValidMoves();
        this.renderBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        this.updateButtonStates();
        this.updateStatus('게임 초기 상태입니다.');
    }

    // 앞으로 가기
    redo() {
        if (this.currentHistoryIndex >= this.gameHistory.length - 1) return;
        
        this.currentHistoryIndex++;
        const nextState = this.gameHistory[this.currentHistoryIndex];
        
        this.board = JSON.parse(JSON.stringify(nextState.board));
        this.currentPlayer = nextState.currentPlayer;
        this.lastMove = nextState.lastMove;
        this.gameOver = false;
        
        this.findValidMoves();
        this.renderBoard();
        this.updateDisplay();
        this.updateAIDisplay();
        this.updateButtonStates();
        this.updateMovesDisplay();
        
        if (this.validMoves.length > 0) {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다.`);
        } else {
            this.updateStatus(`${this.currentPlayer === 'black' ? '흑돌' : '백돌'} 차례입니다. (수 없음)`);
        }
    }

    // 기보 복사
    copyMoves() {
        if (this.moves.length === 0) {
            this.updateStatus('복사할 기보가 없습니다.');
            return;
        }

        const movesText = this.moves.map((move, index) => {
            const player = move.player === 'black' ? '흑' : '백';
            return `${index + 1}. ${player} ${move.coordinate}`;
        }).join('\n');

        navigator.clipboard.writeText(movesText).then(() => {
            this.updateStatus('기보가 클립보드에 복사되었습니다.');
        }).catch(err => {
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
        document.getElementById('black-count').textContent = this.countStones('black');
        document.getElementById('white-count').textContent = this.countStones('white');
        
        const turnElement = document.getElementById('current-turn');
        if (!this.gameOver) {
            const playerLabel = this.currentPlayer === 'black' ? '흑돌' : '백돌';
            const aiLabel = this.currentPlayer === this.aiPlayer ? ' (AI)' : '';
            turnElement.innerHTML = `<span>${playerLabel} 차례${aiLabel}</span>`;
        }
    }

    // AI 정보 업데이트
    updateAIDisplay() {
        // AI 단계 표시
        const phaseElement = document.getElementById('ai-phase');
        const remainingSquares = this.countEmptySquares();
        
        if (this.currentAIVersion === 'v2') {
            // v2 AI의 게임 단계 표시
            if (remainingSquares <= 15) {
                phaseElement.textContent = '엔드게임 (v2)';
            } else if (remainingSquares <= 35) {
                phaseElement.textContent = '미들게임 (v2)';
            } else {
                phaseElement.textContent = '오프닝 (v2)';
            }
        } else {
            // v1 AI의 게임 단계 표시
            if (remainingSquares <= 12) {
                phaseElement.textContent = '엔드게임 (v1)';
            } else if (remainingSquares <= 30) {
                phaseElement.textContent = '미들게임 (v1)';
            } else {
                phaseElement.textContent = '오프닝 (v1)';
            }
        }
        
        // 남은 칸 수
        document.getElementById('remaining-squares').textContent = remainingSquares;
        
        // AI 사고 시간
        document.getElementById('ai-time').textContent = `${this.aiThinkingTime}ms`;
        
        // 시뮬레이션 수 (AI 버전에 따라 다름)
        if (this.currentAIVersion === 'v2') {
            document.getElementById('simulation-count').textContent = '2000 (v2)';
        } else {
            document.getElementById('simulation-count').textContent = '2000 (v1)';
        }
    }

    // 빈 칸 개수 계산
    countEmptySquares() {
        return this.board.flat().filter(cell => cell === null).length;
    }

    // 상태 메시지 업데이트
    updateStatus(message) {
        document.getElementById('game-status').innerHTML = `<p>${message}</p>`;
    }

    // 버튼 상태 업데이트
    updateButtonStates() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = this.currentHistoryIndex <= 0;
        redoBtn.disabled = this.currentHistoryIndex >= this.gameHistory.length - 1;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('first-btn').addEventListener('click', () => this.goToFirst());
        document.getElementById('copy-moves-btn').addEventListener('click', () => this.copyMoves());
        
        // AI 난이도 변경
        document.getElementById('ai-difficulty').addEventListener('change', (e) => {
            this.aiDifficulty = e.target.value;
            this.ai.setDifficulty(this.aiDifficulty);
            this.updateAIDisplay();
        });
        
        // AI 색상 변경
        document.getElementById('ai-color').addEventListener('change', (e) => {
            this.aiPlayer = e.target.value;
            this.newGame(); // 색상 변경 시 새 게임 시작
        });
        
        // AI 버전 변경
        document.getElementById('ai-version').addEventListener('change', (e) => {
            this.currentAIVersion = e.target.value;
            this.updateAIDisplay();
            this.updateStatus(`🤖 AI 버전이 ${this.currentAIVersion === 'v2' ? '버전 2 (논문 기반)' : '버전 1 (기존)'}로 변경되었습니다.`);
        });
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new OthelloAIGame();
});
