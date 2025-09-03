/**
 * 오델로 AI 플레이어 - 버전 1 (기존 고급 전략 기반)
 * 
 * 핵심 전략:
 * 1. 상대방의 기동성 제한 (유효한 수 개수 최소화)
 * 2. 64칸 위치별 가중치 활용
 * 3. 마지막 12칸에서는 알파-베타 가지치기로 완벽한 수
 * 4. 몬테카를로 시뮬레이션으로 추가 점수 계산
 */
class OthelloAI_v1 {
    constructor(difficulty = 'medium') {
        // 위치별 가중치 (8x8 보드)
        this.positionWeights = [
            [100, -20, 10, 5, 5, 10, -20, 100],
            [-20, -80, -2, -2, -2, -2, -80, -20],  // B2, B7을 -80으로 대폭 하향
            [10, -2, 1, 1, 1, 1, -2, 10],
            [5, -2, 1, 1, 1, 1, -2, 5],
            [5, -2, 1, 1, 1, 1, -2, 5],
            [10, -2, 1, 1, 1, 1, -2, 10],
            [-20, -80, -2, -2, -2, -2, -80, -20],  // G2, G7을 -80으로 대폭 하향
            [100, -20, 10, 5, 5, 10, -20, 100]
        ];
        
        // 몬테카를로 시뮬레이션 파라미터
        this.monteCarloParams = {
            simulations: 1000,
            maxDepth: 20
        };
        
        // 게임 진행 단계별 전략
        this.gamePhase = 'opening'; // opening, middlegame, endgame
        this.remainingSquares = 64;
        this.difficulty = difficulty;
    }

    /**
     * AI가 다음 수를 결정
     * @param {Array} board - 현재 보드 상태
     * @param {string} player - AI 플레이어 색상
     * @param {Array} validMoves - 유효한 수 목록
     * @returns {Array} 선택된 수 [row, col]
     */
    getNextMove(board, player, validMoves) {
        if (validMoves.length === 0) return null;
        
        // 남은 칸 수 계산
        this.remainingSquares = this.countEmptySquares(board);
        
        // 게임 단계 결정
        this.updateGamePhase();
        
        // 마지막 12칸에서는 완벽한 수 계산
        if (this.remainingSquares <= 12) {
            return this.getPerfectMove(board, player, validMoves);
        }
        
        // 일반적인 경우 고급 평가 함수 사용
        return this.getAdvancedMove(board, player, validMoves);
    }

    /**
     * 탐색 깊이 설정 (전문가 모드 전용)
     */
    getMaxDepth() {
        return 10; // 전문가 모드: 10단계 탐색
    }

    /**
     * 게임 단계 업데이트
     */
    updateGamePhase() {
        if (this.remainingSquares <= 12) {
            this.gamePhase = 'endgame';
        } else if (this.remainingSquares <= 30) {
            this.gamePhase = 'middlegame';
        } else {
            this.gamePhase = 'opening';
        }
    }

    /**
     * 빈 칸 개수 계산
     */
    countEmptySquares(board) {
        return board.flat().filter(cell => cell === null).length;
    }

    /**
     * 마지막 12칸에서 완벽한 수 계산 (알파-베타 가지치기)
     */
    getPerfectMove(board, player, validMoves) {
        const opponent = player === 'black' ? 'white' : 'black';
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        // 탐색 깊이를 남은 칸 수로 설정
        const maxDepth = this.remainingSquares;
        
        for (const move of validMoves) {
            const newBoard = this.makeMove(board, player, move);
            const score = this.alphaBeta(newBoard, maxDepth - 1, false, player, opponent, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    /**
     * 알파-베타 가지치기 알고리즘 (Move Ordering 최적화)
     */
    alphaBeta(board, depth, isMaximizing, player, opponent, alpha, beta) {
        if (depth === 0) {
            return this.evaluateBoard(board, player);
        }
        
        let validMoves = this.getValidMoves(board, isMaximizing ? player : opponent);
        
        if (validMoves.length === 0) {
            return this.evaluateBoard(board, player);
        }
        
        // Move Ordering: 좋은 수부터 먼저 탐색하여 가지치기 효율성 극대화
        validMoves = this.orderMoves(board, validMoves, isMaximizing ? player : opponent);
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of validMoves) {
                const newBoard = this.makeMove(board, player, move);
                const score = this.alphaBeta(newBoard, depth - 1, false, player, opponent, alpha, beta);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Beta cut-off
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of validMoves) {
                const newBoard = this.makeMove(board, opponent, move);
                const score = this.alphaBeta(newBoard, depth - 1, true, player, opponent, alpha, beta);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Alpha cut-off
            }
            return minScore;
        }
    }

    /**
     * 수를 우선순위에 따라 정렬 (Move Ordering)
     * 우선순위: Captures → Threats → Quiet moves
     */
    orderMoves(board, moves, player) {
        const moveScores = moves.map(move => ({
            move: move,
            score: this.scoreMove(board, move, player)
        }));
        
        // 점수에 따라 내림차순 정렬 (높은 점수부터)
        moveScores.sort((a, b) => b.score - a.score);
        
        // 정렬된 수만 반환
        return moveScores.map(item => item.move);
    }

    /**
     * 개별 수의 점수 계산 (Move Ordering용)
     */
    scoreMove(board, move, player) {
        const [row, col] = move;
        let score = 0;
        
        // 1. Captures (돌을 뒤집는 수) - 가장 높은 우선순위
        const captures = this.countCaptures(board, move, player);
        score += captures * 1000; // Captures는 매우 높은 점수
        
        // 2. Threats (위협적인 수) - 두 번째 우선순위
        const threats = this.evaluateThreats(board, move, player);
        score += threats * 100;
        
        // 3. Position Score (위치 점수) - 세 번째 우선순위
        score += this.positionWeights[row][col];
        
        // 4. Mobility Score (기동성 점수) - 네 번째 우선순위
        const newBoard = this.makeMove(board, player, move);
        const opponent = player === 'black' ? 'white' : 'black';
        const opponentMoves = this.getValidMoves(newBoard, opponent);
        const mobilityScore = (64 - opponentMoves.length) * 10;
        score += mobilityScore;
        
        // 5. Stability Score (안정성 점수) - 다섯 번째 우선순위
        const stabilityScore = this.evaluateStableStones(newBoard, player);
        score += stabilityScore;
        
        return score;
    }

    /**
     * 수를 놓았을 때 뒤집히는 돌 개수 계산
     */
    countCaptures(board, move, player) {
        const [row, col] = move;
        let totalCaptures = 0;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const flips = this.wouldFlip(board, player, row, col, dr, dc);
            totalCaptures += flips.length;
        }
        
        return totalCaptures;
    }

    /**
     * 위협적인 수 평가
     */
    evaluateThreats(board, move, player) {
        const [row, col] = move;
        let threatScore = 0;
        
        // 모서리 근처 위험 위치 체크
        const dangerousPositions = [
            [0, 1], [1, 0], [1, 1],   // 좌상단
            [0, 6], [1, 6], [1, 7],   // 우상단
            [6, 0], [6, 1], [7, 1],   // 좌하단
            [6, 6], [6, 7], [7, 6]    // 우하단
        ];
        
        for (const [dangerRow, dangerCol] of dangerousPositions) {
            if (row === dangerRow && col === dangerCol) {
                threatScore -= 50; // 위험한 위치는 큰 감점
                break;
            }
        }
        
        // 모서리 확보 가능성 체크
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        for (const [cornerRow, cornerCol] of corners) {
            if (this.canReachCorner(board, move, player, cornerRow, cornerCol)) {
                threatScore += 200; // 모서리 확보 가능성은 큰 가점
            }
        }
        
        // 상대방 기동성 제한 체크
        const newBoard = this.makeMove(board, player, move);
        const opponent = player === 'black' ? 'white' : 'black';
        const opponentMoves = this.getValidMoves(newBoard, opponent);
        if (opponentMoves.length === 0) {
            threatScore += 300; // 상대방이 수를 놓을 수 없으면 매우 좋음
        }
        
        return threatScore;
    }

    /**
     * 특정 모서리에 도달할 수 있는지 확인
     */
    canReachCorner(board, move, player, cornerRow, cornerCol) {
        const [row, col] = move;
        
        // 모서리와의 거리 계산
        const rowDistance = Math.abs(row - cornerRow);
        const colDistance = Math.abs(col - cornerCol);
        
        // 모서리 근처에 있고, 모서리까지의 경로가 열려있는지 확인
        if (rowDistance <= 2 && colDistance <= 2) {
            // 모서리까지의 경로에 상대방 돌이 있는지 확인
            const pathOpen = this.isPathToCornerOpen(board, row, col, cornerRow, cornerCol, player);
            return pathOpen;
        }
        
        return false;
    }

    /**
     * 모서리까지의 경로가 열려있는지 확인
     */
    isPathToCornerOpen(board, startRow, startCol, cornerRow, cornerCol, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 시작점에서 모서리까지의 방향 계산
        const dr = cornerRow > startRow ? 1 : cornerRow < startRow ? -1 : 0;
        const dc = cornerCol > startCol ? 1 : cornerCol < startCol ? -1 : 0;
        
        let currentRow = startRow + dr;
        let currentCol = startCol + dc;
        
        // 모서리까지 경로 확인
        while (currentRow !== cornerRow || currentCol !== cornerCol) {
            if (board[currentRow][currentCol] === opponent) {
                return false; // 경로가 막혀있음
            }
            currentRow += dr;
            currentCol += dc;
        }
        
        return true; // 경로가 열려있음
    }

    /**
     * 고급 평가 함수를 사용한 수 선택
     */
    getAdvancedMove(board, player, validMoves) {
        const opponent = player === 'black' ? 'white' : 'black';
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        // 난이도에 따른 탐색 깊이 설정
        const maxDepth = this.getMaxDepth();
        
        for (const move of validMoves) {
            const newBoard = this.makeMove(board, player, move);
            const score = this.alphaBeta(newBoard, maxDepth - 1, false, player, opponent, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    /**
     * 고급 수 평가 함수
     */
    evaluateMoveAdvanced(board, player, move) {
        const [row, col] = move;
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 1. 기본 위치 가중치
        let score = this.positionWeights[row][col];
        
        // 2. 상대방 기동성 제한 점수 (핵심 전략)
        const newBoard = this.makeMove(board, player, move);
        const opponentMoves = this.getValidMoves(newBoard, opponent);
        const mobilityScore = (64 - opponentMoves.length) * 10; // 상대방 수가 적을수록 높은 점수
        score += mobilityScore;
        
        // 3. 자신의 기동성 점수
        const myMoves = this.getValidMoves(newBoard, player);
        score += myMoves.length * 2;
        
        // 4. 돌 개수 점수
        const myStones = this.countStones(newBoard, player);
        const opponentStones = this.countStones(newBoard, opponent);
        score += (myStones - opponentStones) * 5;
        
        // 5. 안정적인 돌 점수
        const stableScore = this.evaluateStableStones(newBoard, player);
        score += stableScore;
        
        // 6. 몬테카를로 시뮬레이션 점수
        const monteCarloScore = this.monteCarloSimulation(newBoard, player);
        score += monteCarloScore;
        
        return score;
    }

    /**
     * 안정적인 돌 평가 (뒤집힐 수 없는 돌)
     */
    evaluateStableStones(board, player) {
        let score = 0;
        
        // 모서리는 항상 안정적
        if (board[0][0] === player) score += 50;
        if (board[0][7] === player) score += 50;
        if (board[7][0] === player) score += 50;
        if (board[7][7] === player) score += 50;
        
        // 모서리와 연결된 가장자리도 안정적일 수 있음
        for (let i = 1; i < 7; i++) {
            if (board[0][i] === player && board[0][i-1] === player && board[0][i+1] === player) {
                score += 20;
            }
            if (board[7][i] === player && board[7][i-1] === player && board[7][i+1] === player) {
                score += 20;
            }
            if (board[i][0] === player && board[i-1][0] === player && board[i+1][0] === player) {
                score += 20;
            }
            if (board[i][7] === player && board[i-1][7] === player && board[i+1][7] === player) {
                score += 20;
            }
        }
        
        return score;
    }

    /**
     * 몬테카를로 시뮬레이션
     */
    monteCarloSimulation(board, player) {
        let totalScore = 0;
        const simulations = Math.min(this.monteCarloParams.simulations, this.remainingSquares * 50);
        
        for (let i = 0; i < simulations; i++) {
            const simulationScore = this.runRandomSimulation(board, player);
            totalScore += simulationScore;
        }
        
        return totalScore / simulations;
    }

    /**
     * 랜덤 시뮬레이션 실행
     */
    runRandomSimulation(board, player) {
        const simBoard = board.map(row => [...row]);
        const opponent = player === 'black' ? 'white' : 'black';
        let currentPlayer = player;
        let depth = 0;
        
        while (depth < this.monteCarloParams.maxDepth) {
            const validMoves = this.getValidMoves(simBoard, currentPlayer);
            
            if (validMoves.length === 0) {
                currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
                const opponentMoves = this.getValidMoves(simBoard, currentPlayer);
                if (opponentMoves.length === 0) break;
            } else {
                // 랜덤하게 수 선택
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                this.makeMoveInPlace(simBoard, currentPlayer, randomMove);
                currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            }
            
            depth++;
        }
        
        // 최종 보드 평가
        return this.evaluateBoard(simBoard, player);
    }

    /**
     * 보드 상태 평가
     */
    evaluateBoard(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        let score = 0;
        
        // 1. 돌 개수 차이 (게임 후반에 더 중요)
        const playerStones = this.countStones(board, player);
        const opponentStones = this.countStones(board, opponent);
        const stoneDifference = playerStones - opponentStones;
        
        // 게임 단계에 따른 돌 개수 가중치 조정
        if (this.remainingSquares <= 20) {
            score += stoneDifference * 20; // 엔드게임에서는 돌 개수가 매우 중요
        } else if (this.remainingSquares <= 40) {
            score += stoneDifference * 15; // 미들게임에서는 중간 중요도
        } else {
            score += stoneDifference * 8;  // 오프닝에서는 덜 중요
        }
        
        // 2. 위치 가중치
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === player) {
                    score += this.positionWeights[row][col];
                } else if (board[row][col] === opponent) {
                    score -= this.positionWeights[row][col];
                }
            }
        }
        
        // 3. 기동성 점수 (게임 초반에 더 중요)
        const playerMoves = this.getValidMoves(board, player);
        const opponentMoves = this.getValidMoves(board, opponent);
        const mobilityDifference = playerMoves.length - opponentMoves.length;
        
        if (this.remainingSquares >= 40) {
            score += mobilityDifference * 8;  // 오프닝에서는 기동성이 매우 중요
        } else if (this.remainingSquares >= 20) {
            score += mobilityDifference * 5;  // 미들게임에서는 중간 중요도
        } else {
            score += mobilityDifference * 2;  // 엔드게임에서는 덜 중요
        }
        
        // 4. 안정적인 돌 점수
        const stableScore = this.evaluateStableStones(board, player);
        score += stableScore;
        
        // 5. 전략적 패턴 점수
        const patternScore = this.evaluateStrategicPatterns(board, player);
        score += patternScore;
        
        return score;
    }

    /**
     * 전략적 패턴 평가
     */
    evaluateStrategicPatterns(board, player) {
        let score = 0;
        
        // 모서리 확보 전략
        score += this.evaluateCornerStrategy(board, player);
        
        // 가장자리 안정성 평가
        score += this.evaluateEdgeStability(board, player);
        
        // 중앙 지배력 평가
        score += this.evaluateCenterControl(board, player);
        
        // 위험한 돌 회피
        score += this.evaluateDangerousPositions(board, player);
        
        return score;
    }

    /**
     * 모서리 전략 평가
     */
    evaluateCornerStrategy(board, player) {
        let score = 0;
        
        // 모서리 점수
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        for (const [row, col] of corners) {
            if (board[row][col] === player) {
                score += 100; // 모서리는 매우 중요
            } else if (board[row][col] === null) {
                // 모서리 근처에 상대방 돌이 있으면 위험
                const adjacentPositions = this.getAdjacentPositions(row, col);
                for (const [adjRow, adjCol] of adjacentPositions) {
                    if (board[adjRow][adjCol] === player) {
                        score += 30; // 모서리 확보 가능성
                    }
                }
            }
        }
        
        return score;
    }

    /**
     * 가장자리 안정성 평가
     */
    evaluateEdgeStability(board, player) {
        let score = 0;
        
        // 가로 가장자리
        for (let col = 1; col < 7; col++) {
            if (board[0][col] === player) {
                score += this.evaluateEdgePosition(board, 0, col, player);
            }
            if (board[7][col] === player) {
                score += this.evaluateEdgePosition(board, 7, col, player);
            }
        }
        
        // 세로 가장자리
        for (let row = 1; row < 7; row++) {
            if (board[row][0] === player) {
                score += this.evaluateEdgePosition(board, row, 0, player);
            }
            if (board[row][7] === player) {
                score += this.evaluateEdgePosition(board, row, 7, player);
            }
        }
        
        return score;
    }

    /**
     * 특정 가장자리 위치 평가
     */
    evaluateEdgePosition(board, row, col, player) {
        let score = 0;
        
        // 모서리와의 거리에 따른 점수
        if (col === 1 || col === 6) {
            score += 15; // 모서리 근처는 안정적
        } else if (col === 2 || col === 5) {
            score += 10; // 중간 정도 안정적
        } else {
            score += 5;  // 덜 안정적
        }
        
        // 연결된 돌들 확인
        const connectedStones = this.countConnectedStones(board, row, col, player);
        score += connectedStones * 5;
        
        return score;
    }

    /**
     * 중앙 지배력 평가
     */
    evaluateCenterControl(board, player) {
        let score = 0;
        
        // 중앙 4x4 영역
        for (let row = 2; row < 6; row++) {
            for (let col = 2; col < 6; col++) {
                if (board[row][col] === player) {
                    score += 3;
                } else if (board[row][col] === null) {
                    // 중앙 빈 칸 근처에 상대방 돌이 있으면 위험
                    const adjacentOpponent = this.countAdjacentOpponent(board, row, col, player);
                    if (adjacentOpponent > 0) {
                        score -= adjacentOpponent * 2;
                    }
                }
            }
        }
        
        return score;
    }

    /**
     * 위험한 위치 평가
     */
    evaluateDangerousPositions(board, player) {
        let score = 0;
        
        // 모서리 근처 위험 위치들
        const dangerousPositions = [
            [0, 1], [1, 0], [1, 1],   // 좌상단
            [0, 6], [1, 6], [1, 7],   // 우상단
            [6, 0], [6, 1], [7, 1],   // 좌하단
            [6, 6], [6, 7], [7, 6]    // 우하단
        ];
        
        for (const [row, col] of dangerousPositions) {
            if (board[row][col] === player) {
                score -= 20; // 위험한 위치에 돌이 있으면 감점
            }
        }
        
        return score;
    }

    /**
     * 인접한 위치들 가져오기
     */
    getAdjacentPositions(row, col) {
        const positions = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    positions.push([newRow, newCol]);
                }
            }
        }
        return positions;
    }

    /**
     * 연결된 돌 개수 세기
     */
    countConnectedStones(board, row, col, player) {
        let count = 0;
        const directions = [[0, 1], [1, 0]]; // 가로, 세로만
        
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            // 한 방향으로 연결된 돌 세기
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === player) {
                count++;
                r += dr;
                c += dc;
            }
            
            // 반대 방향으로 연결된 돌 세기
            r = row - dr;
            c = col - dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === player) {
                count++;
                r -= dr;
                c -= dc;
            }
        }
        
        return count;
    }

    /**
     * 인접한 상대방 돌 개수 세기
     */
    countAdjacentOpponent(board, row, col, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        let count = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    if (board[newRow][newCol] === opponent) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }

    /**
     * 돌 개수 계산
     */
    countStones(board, color) {
        return board.flat().filter(cell => cell === color).length;
    }

    /**
     * 유효한 수 찾기
     */
    getValidMoves(board, player) {
        const validMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(board, player, row, col)) {
                    validMoves.push([row, col]);
                }
            }
        }
        return validMoves;
    }

    /**
     * 특정 위치가 유효한 수인지 확인
     */
    isValidMove(board, player, row, col) {
        if (board[row][col] !== null) return false;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            if (this.wouldFlip(board, player, row, col, dr, dc).length > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * 특정 방향으로 뒤집힐 돌들 계산
     */
    wouldFlip(board, player, row, col, dr, dc) {
        const flips = [];
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (board[r][c] === null) break;
            if (board[r][c] === player) {
                return flips;
            }
            flips.push([r, c]);
            r += dr;
            c += dc;
        }
        
        return [];
    }

    /**
     * 가상으로 수를 놓아보기 (새 보드 반환)
     */
    makeMove(board, player, move) {
        const newBoard = board.map(row => [...row]);
        const [row, col] = move;
        
        newBoard[row][col] = player;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const flips = this.wouldFlip(board, player, row, col, dr, dc);
            for (const [fr, fc] of flips) {
                newBoard[fr][fc] = player;
            }
        }

        return newBoard;
    }

    /**
     * 보드에 직접 수를 놓기 (시뮬레이션용)
     */
    makeMoveInPlace(board, player, move) {
        const [row, col] = move;
        
        board[row][col] = player;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const flips = this.wouldFlip(board, player, row, col, dr, dc);
            for (const [fr, fc] of flips) {
                board[fr][fc] = player;
            }
        }
    }

    /**
     * AI 설정 (전문가 모드 전용)
     */
    setDifficulty(difficulty) {
        this.difficulty = 'expert'; // 항상 전문가 모드
        // 전문가 모드 파라미터 고정
        this.monteCarloParams.simulations = 2000;
    }

    /**
     * 현재 난이도 반환
     */
    getDifficulty() {
        return this.difficulty;
    }
}

// 전역으로 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OthelloAI_v1;
}
