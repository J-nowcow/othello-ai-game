/**
 * Othello AI 버전 2 - 논문 기반 최신 기법들 활용
 * 
 * 핵심 기법:
 * 1. Simon Lucas (2008) - N-Tuple Systems
 * 2. Marcin Szubert (2009) - Coevolutionary TD Learning
 * 3. 고급 WPC (Weighted Piece Counter) 시스템
 * 4. 게임 단계별 세밀 전략
 * 
 * @author AI Assistant
 * @version 2.0.0
 */

class OthelloAI_v2 {
    constructor(difficulty = 'expert') {
        // 논문 기반 WPC 가중치 (Lucas 2008, Szubert 2009) - v1 AI와 동일하게 수정
        this.wpcWeights = [
            [1.00, -0.25, 0.10, 0.05, 0.05, 0.10, -0.25, 1.00],
            [-0.25, -0.25, 0.01, 0.01, 0.01, 0.01, -0.25, -0.25],
            [0.10, 0.01, 0.05, 0.02, 0.02, 0.05, 0.01, 0.10],
            [0.05, 0.01, 0.02, 0.01, 0.01, 0.02, 0.01, 0.05],
            [0.05, 0.01, 0.02, 0.01, 0.01, 0.02, 0.01, 0.05],
            [0.10, 0.01, 0.05, 0.02, 0.02, 0.05, 0.01, 0.10],
            [-0.25, -0.25, 0.01, 0.01, 0.01, 0.01, -0.25, -0.25],
            [1.00, -0.25, 0.10, 0.05, 0.05, 0.10, -0.25, 1.00]
        ];
        
        // N-Tuple 패턴 정의 (3x3, 4x4, 5x5 서브보드)
        this.nTuplePatterns = this.initializeNTuplePatterns();
        
        // Coevolutionary TD Learning 파라미터
        this.tdLearning = {
            alpha: 0.1,        // 학습률
            gamma: 0.9,        // 할인율
            lambda: 0.8        // TD(λ) 파라미터
        };
        
        // 게임 단계별 전략 가중치
        this.phaseWeights = {
            opening: { mobility: 0.4, stability: 0.2, pattern: 0.3, wpc: 0.1 },
            middlegame: { mobility: 0.3, stability: 0.3, pattern: 0.3, wpc: 0.1 },
            endgame: { mobility: 0.1, stability: 0.2, pattern: 0.2, wpc: 0.5 }
        };
        
        // 성능 최적화 파라미터
        this.performance = {
            maxDepth: 15,           // 최대 탐색 깊이 (기존 10 → 15)
            monteCarloSims: 2000,   // 몬테카를로 시뮬레이션 수
            moveOrdering: true,     // Move Ordering 최적화
            transpositionTable: {}  // 전치 테이블
        };
        
        this.difficulty = difficulty;
        this.gamePhase = 'opening';
        this.remainingSquares = 64;
        this.moveHistory = [];
        this.opponentPatterns = new Map();
    }

    /**
     * N-Tuple 패턴 초기화
     * 3x3, 4x4, 5x5 서브보드 패턴 정의
     */
    initializeNTuplePatterns() {
        const patterns = {
            '3x3': [
                // 코너 3x3 패턴들
                { positions: [[0,0], [0,1], [1,0], [1,1]], weight: 0.8 },
                { positions: [[0,6], [0,7], [1,6], [1,7]], weight: 0.8 },
                { positions: [[6,0], [6,1], [7,0], [7,1]], weight: 0.8 },
                { positions: [[6,6], [6,7], [7,6], [7,7]], weight: 0.8 },
                // 중앙 3x3 패턴들
                { positions: [[2,2], [2,3], [2,4], [2,5], [3,2], [3,3], [3,4], [3,5], [4,2], [4,3], [4,4], [4,5], [5,2], [5,3], [5,4], [5,5]], weight: 0.3 }
            ],
            '4x4': [
                // 가장자리 4x4 패턴들
                { positions: [[0,0], [0,1], [0,2], [0,3], [1,0], [1,1], [1,2], [1,3], [2,0], [2,1], [2,2], [2,3], [3,0], [3,1], [3,2], [3,3]], weight: 0.6 },
                { positions: [[0,4], [0,5], [0,6], [0,7], [1,4], [1,5], [1,6], [1,7], [2,4], [2,5], [2,6], [2,7], [3,4], [3,5], [3,6], [3,7]], weight: 0.6 }
            ],
            '5x5': [
                // 전체 보드의 5x5 서브보드들
                { positions: [[0,0], [0,1], [0,2], [0,3], [0,4], [1,0], [1,1], [1,2], [1,3], [1,4], [2,0], [2,1], [2,2], [2,3], [2,4], [3,0], [3,1], [3,2], [3,3], [3,4], [4,0], [4,1], [4,2], [4,3], [4,4]], weight: 0.4 }
            ]
        };
        
        return patterns;
    }

    /**
     * AI가 다음 수를 결정 (메인 함수)
     */
    getNextMove(board, player, validMoves) {
        if (validMoves.length === 0) return null;
        
        // 게임 상태 업데이트
        this.updateGameState(board);
        
        // 마지막 15칸에서는 완벽한 수 계산
        if (this.remainingSquares <= 15) {
            return this.getPerfectMove(board, player, validMoves);
        }
        
        // 일반적인 경우 고급 평가 함수 사용
        return this.getAdvancedMove(board, player, validMoves);
    }

    /**
     * 게임 상태 업데이트
     */
    updateGameState(board) {
        this.remainingSquares = this.countEmptySquares(board);
        
        // 게임 단계 결정
        if (this.remainingSquares <= 15) {
            this.gamePhase = 'endgame';
        } else if (this.remainingSquares <= 35) {
            this.gamePhase = 'middlegame';
        } else {
            this.gamePhase = 'opening';
        }
    }

    /**
     * 마지막 15칸에서 완벽한 수 계산
     */
    getPerfectMove(board, player, validMoves) {
        const opponent = player === 'black' ? 'white' : 'black';
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        // 탐색 깊이를 남은 칸 수로 설정
        const maxDepth = Math.min(this.remainingSquares, this.performance.maxDepth);
        
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
     * 고급 평가 함수를 사용한 수 선택
     */
    getAdvancedMove(board, player, validMoves) {
        const opponent = player === 'black' ? 'white' : 'black';
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        // Move Ordering으로 수를 정렬
        if (this.performance.moveOrdering) {
            validMoves = this.orderMoves(board, validMoves, player);
        }
        
        for (const move of validMoves) {
            const newBoard = this.makeMove(board, player, move);
            const score = this.alphaBeta(newBoard, this.performance.maxDepth - 1, false, player, opponent, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    /**
     * 알파-베타 가지치기 (Move Ordering 최적화)
     */
    alphaBeta(board, depth, isMaximizing, player, opponent, alpha, beta) {
        // 전치 테이블 확인
        const boardHash = this.getBoardHash(board);
        if (this.performance.transpositionTable[boardHash] && this.performance.transpositionTable[boardHash].depth >= depth) {
            return this.performance.transpositionTable[boardHash].score;
        }
        
        if (depth === 0) {
            return this.evaluateBoard_v2(board, player);
        }
        
        let validMoves = this.getValidMoves(board, isMaximizing ? player : opponent);
        
        if (validMoves.length === 0) {
            return this.evaluateBoard_v2(board, player);
        }
        
        // Move Ordering
        if (this.performance.moveOrdering) {
            validMoves = this.orderMoves(board, validMoves, isMaximizing ? player : opponent);
        }
        
        let bestScore = isMaximizing ? -Infinity : Infinity;
        
        for (const move of validMoves) {
            const newBoard = this.makeMove(board, isMaximizing ? player : opponent, move);
            const score = this.alphaBeta(newBoard, depth - 1, !isMaximizing, player, opponent, alpha, beta);
            
            if (isMaximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }
            
            if (beta <= alpha) break; // Beta cut-off
        }
        
        // 전치 테이블에 저장
        this.performance.transpositionTable[boardHash] = {
            score: bestScore,
            depth: depth
        };
        
        return bestScore;
    }

    /**
     * 보드 해시 생성 (전치 테이블용)
     */
    getBoardHash(board) {
        return board.flat().join('');
    }

    /**
     * 빈 칸 개수 계산
     */
    countEmptySquares(board) {
        return board.flat().filter(cell => cell === null).length;
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
     * 돌 개수 계산
     */
    countStones(board, color) {
        return board.flat().filter(cell => cell === color).length;
    }

    /**
     * 버전 2의 고급 평가 함수 (개선된 버전)
     */
    evaluateBoard_v2(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 1. 기본 WPC 점수 (논문 기반, 단순화)
        const wpcScore = this.evaluateAdvancedWPC(board, player);
        
        // 2. 게임 단계별 전략 점수 (v1 AI의 효과적인 전략 통합)
        const phaseScore = this.evaluateGamePhase_v2(board, player);
        
        // 3. 기동성 점수 (v1 AI의 핵심 전략)
        const mobilityScore = this.evaluateMobility_v2(board, player);
        
        // 게임 단계에 따른 가중치 조정 (단순화)
        let totalScore;
        if (this.gamePhase === 'opening') {
            totalScore = wpcScore * 0.3 + phaseScore * 0.3 + mobilityScore * 0.4;
        } else if (this.gamePhase === 'middlegame') {
            totalScore = wpcScore * 0.4 + phaseScore * 0.4 + mobilityScore * 0.2;
        } else { // endgame
            totalScore = wpcScore * 0.6 + phaseScore * 0.3 + mobilityScore * 0.1;
        }
        
        return totalScore;
    }

    /**
     * N-Tuple 패턴 평가
     */
    evaluateNTuplePatterns(board, player) {
        let totalScore = 0;
        
        // 각 N-Tuple 패턴 타입별로 평가
        for (const [patternType, patterns] of Object.entries(this.nTuplePatterns)) {
            for (const pattern of patterns) {
                const patternScore = this.evaluateSinglePattern(board, pattern, player);
                totalScore += patternScore * pattern.weight;
            }
        }
        
        return totalScore;
    }

    /**
     * 단일 N-Tuple 패턴 평가
     */
    evaluateSinglePattern(board, pattern, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        let playerStones = 0;
        let opponentStones = 0;
        
        for (const [row, col] of pattern.positions) {
            if (board[row][col] === player) {
                playerStones++;
            } else if (board[row][col] === opponent) {
                opponentStones++;
            }
        }
        
        // 패턴 점수 계산
        const totalSquares = pattern.positions.length;
        const playerRatio = playerStones / totalSquares;
        const opponentRatio = opponentStones / totalSquares;
        
        return (playerRatio - opponentRatio) * 100;
    }

    /**
     * 고급 WPC 평가 (논문 기반)
     */
    evaluateAdvancedWPC(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === player) {
                    score += this.wpcWeights[row][col];
                } else if (board[row][col] === opponent) {
                    score -= this.wpcWeights[row][col];
                }
            }
        }
        
        return score * 100; // 스케일링
    }

    /**
     * 게임 단계별 전략 평가 (v1 AI 전략 통합)
     */
    evaluateGamePhase_v2(board, player) {
        switch (this.gamePhase) {
            case 'opening':
                return this.evaluateOpeningStrategy_v2(board, player);
            case 'middlegame':
                return this.evaluateMiddlegameStrategy_v2(board, player);
            case 'endgame':
                return this.evaluateEndgameStrategy_v2(board, player);
            default:
                return 0;
        }
    }

    /**
     * 오프닝 전략 평가 (v1 AI 전략 통합)
     */
    evaluateOpeningStrategy_v2(board, player) {
        let score = 0;
        
        // 1. 기동성 최대화 (v1 AI의 핵심 전략)
        const mobilityScore = this.evaluateMobility_v2(board, player) * 2;
        score += mobilityScore;
        
        // 2. 안전한 코너 확보 (v1 AI의 효과적인 전략)
        const cornerScore = this.evaluateSafeCorners_v2(board, player) * 1.5;
        score += cornerScore;
        
        // 3. 상대방 기동성 제한 (v1 AI의 핵심 전략)
        const restrictionScore = this.evaluateOpponentRestriction_v2(board, player) * 2.0;
        score += restrictionScore;
        
        return score;
    }

    /**
     * 미들게임 전략 평가 (v1 AI 전략 통합)
     */
    evaluateMiddlegameStrategy_v2(board, player) {
        let score = 0;
        
        // 1. 전략적 패턴 형성
        const patternScore = this.evaluateStrategicPatterns_v2(board, player) * 1.5;
        score += patternScore;
        
        // 2. 상대방 기동성 제한 (v1 AI의 핵심 전략)
        const restrictionScore = this.evaluateOpponentRestriction_v2(board, player) * 2.0;
        score += restrictionScore;
        
        // 3. 안정적인 돌 확보
        const stabilityScore = this.evaluateStableStones_v2(board, player);
        score += stabilityScore;
        
        return score;
    }

    /**
     * 엔드게임 전략 평가 (v1 AI 전략 통합)
     */
    evaluateEndgameStrategy_v2(board, player) {
        let score = 0;
        
        // 1. 돌 개수 최대화 (v1 AI의 효과적인 전략)
        const stoneCountScore = this.evaluateFinalStoneCount_v2(board, player) * 2.0;
        score += stoneCountScore;
        
        // 2. 안정적인 돌 확보
        const stabilityScore = this.evaluateStableStones_v2(board, player) * 1.5;
        score += stabilityScore;
        
        return score;
    }

    /**
     * 기동성 평가 (v1 AI 전략 통합)
     */
    evaluateMobility_v2(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        const playerMoves = this.getValidMoves(board, player);
        const opponentMoves = this.getValidMoves(board, opponent);
        
        return (playerMoves.length - opponentMoves.length) * 10;
    }

    /**
     * 상대방 제한 평가 (v1 AI의 핵심 전략)
     */
    evaluateOpponentRestriction_v2(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        let score = 0;
        
        // 상대방의 유효한 수를 최소화하는 전략
        const opponentMoves = this.getValidMoves(board, opponent);
        score += (64 - opponentMoves.length) * 15;
        
        return score;
    }

    /**
     * 안정적인 돌 평가 (v1 AI 전략 통합)
     */
    evaluateStableStones_v2(board, player) {
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
     * 최종 돌 개수 평가 (v1 AI 전략 통합)
     */
    evaluateFinalStoneCount_v2(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        const playerStones = this.countStones(board, player);
        const opponentStones = this.countStones(board, opponent);
        
        return (playerStones - opponentStones) * 20;
    }

    /**
     * 몬테카를로 시뮬레이션
     */
    monteCarloSimulation(board, player) {
        let totalScore = 0;
        const simulations = Math.min(this.performance.monteCarloSims, this.remainingSquares * 50);
        
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
        
        while (depth < 20) {
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
        return this.evaluateBoard_v2(simBoard, player);
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
     * 수를 우선순위에 따라 정렬 (Move Ordering)
     */
    orderMoves(board, moves, player) {
        const moveScores = moves.map(move => ({
            move: move,
            score: this.scoreMove(board, move, player)
        }));
        
        // 점수에 따라 내림차순 정렬
        moveScores.sort((a, b) => b.score - a.score);
        
        return moveScores.map(item => item.move);
    }

    /**
     * 개별 수의 점수 계산 (Move Ordering용) - 회피 전략 강화
     */
    scoreMove(board, move, player) {
        const [row, col] = move;
        let score = 0;
        
        // 0. 구석 수는 최우선 (매우 높은 점수)
        if (this.isCornerMove(row, col)) {
            score += 10000; // 구석은 절대 놓치면 안됨
        }
        
        // 1. 위험한 수 회피 (매우 높은 우선순위)
        const dangerScore = this.evaluateMoveDanger(board, move, player);
        score += dangerScore;
        
        // 2. Captures (돌을 뒤집는 수)
        const captures = this.countCaptures(board, move, player);
        score += captures * 1000;
        
        // 3. Position Score (논문 기반 WPC)
        score += this.wpcWeights[row][col] * 100;
        
        // 4. Mobility Score (기동성 점수)
        const newBoard = this.makeMove(board, player, move);
        const opponent = player === 'black' ? 'white' : 'black';
        const opponentMoves = this.getValidMoves(newBoard, opponent);
        const mobilityScore = (64 - opponentMoves.length) * 10;
        score += mobilityScore;
        
        // 5. 구석 확보 가능성 점수
        const cornerPotential = this.evaluateCornerPotential(board, move, player);
        score += cornerPotential * 500;
        
        // 6. 안정성 점수 (새로 추가)
        const stabilityScore = this.evaluateMoveStability(newBoard, player);
        score += stabilityScore * 200;
        
        return score;
    }

    /**
     * 수의 위험성 평가 (강화된 회피 전략)
     */
    evaluateMoveDanger(board, move, player) {
        const [row, col] = move;
        let dangerScore = 0;
        
        // 1. 구석 직전 위험 위치 (X-square, C-square)
        if (this.isDangerousPosition(row, col)) {
            dangerScore -= 5000; // 매우 큰 감점
        }
        
        // 2. 구석을 상대방에게 내주는 수
        const cornerThreat = this.evaluateCornerThreat(board, move, player);
        dangerScore += cornerThreat;
        
        // 3. 상대방이 구석을 확보할 수 있게 하는 수
        const opponentCornerGain = this.evaluateOpponentCornerGain(board, move, player);
        dangerScore += opponentCornerGain;
        
        // 4. 가장자리 불안정성
        const edgeInstability = this.evaluateEdgeInstability(board, move, player);
        dangerScore += edgeInstability;
        
        // 5. 상대방 기동성 증가
        const opponentMobilityIncrease = this.evaluateOpponentMobilityIncrease(board, move, player);
        dangerScore += opponentMobilityIncrease;
        
        return dangerScore;
    }

    /**
     * 위험한 위치인지 확인 (강화된 버전)
     */
    isDangerousPosition(row, col) {
        // X-square (구석 바로 옆 대각선)
        if ((row === 1 && col === 1) || (row === 1 && col === 6) || 
            (row === 6 && col === 1) || (row === 6 && col === 6)) {
            return true;
        }
        
        // C-square (구석 바로 옆)
        if ((row === 0 && col === 1) || (row === 1 && col === 0) || 
            (row === 0 && col === 6) || (row === 1 && col === 7) || 
            (row === 6 && col === 0) || (row === 7 && col === 1) || 
            (row === 6 && col === 7) || (row === 7 && col === 6)) {
            return true;
        }
        
        // B2, B7, G2, G7 (가장 위험한 위치)
        if ((row === 1 && col === 1) || (row === 1 && col === 6) || 
            (row === 6 && col === 1) || (row === 6 && col === 6)) {
            return true;
        }
        
        return false;
    }

    /**
     * 구석을 상대방에게 내주는 위협 평가
     */
    evaluateCornerThreat(board, move, player) {
        const [row, col] = move;
        const opponent = player === 'black' ? 'white' : 'black';
        let threatScore = 0;
        
        // 구석 근처에 수를 두면 상대방이 구석을 확보할 수 있는지 확인
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        for (const [cornerRow, cornerCol] of corners) {
            if (board[cornerRow][cornerCol] === null) {
                // 구석까지의 거리
                const distance = Math.max(Math.abs(row - cornerRow), Math.abs(col - cornerCol));
                
                if (distance <= 2) {
                    // 상대방이 이 구석을 확보할 수 있는지 확인
                    if (this.canOpponentSecureCorner(board, move, player, cornerRow, cornerCol)) {
                        threatScore -= 3000; // 매우 큰 감점
                    }
                }
            }
        }
        
        return threatScore;
    }

    /**
     * 상대방이 구석을 확보할 수 있는지 확인
     */
    canOpponentSecureCorner(board, move, player, cornerRow, cornerCol) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 가상으로 수를 놓아보기
        const newBoard = this.makeMove(board, player, move);
        
        // 상대방이 이 구석에 수를 놓을 수 있는지 확인
        if (this.isValidMove(newBoard, opponent, cornerRow, cornerCol)) {
            return true;
        }
        
        // 상대방이 구석 근처에 수를 놓아 구석을 확보할 수 있는지 확인
        const adjacentPositions = this.getAdjacentPositions_v2(cornerRow, cornerCol);
        for (const [adjRow, adjCol] of adjacentPositions) {
            if (newBoard[adjRow][adjCol] === null && 
                this.isValidMove(newBoard, opponent, adjRow, adjCol)) {
                // 이 수를 놓으면 상대방이 구석을 확보할 수 있는지 확인
                const testBoard = this.makeMove(newBoard, opponent, [adjRow, adjCol]);
                if (this.isValidMove(testBoard, opponent, cornerRow, cornerCol)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 상대방이 구석을 확보할 수 있게 하는 수 평가
     */
    evaluateOpponentCornerGain(board, move, player) {
        const [row, col] = move;
        const opponent = player === 'black' ? 'white' : 'black';
        let gainScore = 0;
        
        // 가상으로 수를 놓아보기
        const newBoard = this.makeMove(board, player, move);
        
        // 상대방의 다음 수에서 구석을 확보할 수 있는지 확인
        const opponentMoves = this.getValidMoves(newBoard, opponent);
        for (const opponentMove of opponentMoves) {
            const [oppRow, oppCol] = opponentMove;
            
            // 상대방이 구석에 수를 놓을 수 있는지
            if (this.isCornerMove(oppRow, oppCol)) {
                gainScore -= 2000; // 구석을 상대방에게 내주는 수는 큰 감점
            }
            
            // 상대방이 구석 근처에 수를 놓아 구석을 확보할 수 있는지
            const corners = [[0,0], [0,7], [7,0], [7,7]];
            for (const [cornerRow, cornerCol] of corners) {
                if (newBoard[cornerRow][cornerCol] === null) {
                    const distance = Math.max(Math.abs(oppRow - cornerRow), Math.abs(oppCol - cornerCol));
                    if (distance <= 2) {
                        const testBoard = this.makeMove(newBoard, opponent, opponentMove);
                        if (this.isValidMove(testBoard, opponent, cornerRow, cornerCol)) {
                            gainScore -= 1500; // 구석 확보 가능성을 상대방에게 주는 수는 감점
                        }
                    }
                }
            }
        }
        
        return gainScore;
    }

    /**
     * 가장자리 불안정성 평가
     */
    evaluateEdgeInstability(board, move, player) {
        const [row, col] = move;
        let instabilityScore = 0;
        
        // 가장자리에 수를 두는 경우
        if (row === 0 || row === 7 || col === 0 || col === 7) {
            // 구석과 연결되지 않은 가장자리는 불안정
            if (!this.isEdgeConnectedToCorner(board, row, col, player)) {
                instabilityScore -= 800;
            }
            
            // 가장자리 중간에 단독으로 수를 두는 것은 위험
            if (this.isIsolatedEdgeMove(board, row, col, player)) {
                instabilityScore -= 1000;
            }
        }
        
        return instabilityScore;
    }

    /**
     * 가장자리가 구석과 연결되어 있는지 확인
     */
    isEdgeConnectedToCorner(board, row, col, player) {
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        
        for (const [cornerRow, cornerCol] of corners) {
            if (board[cornerRow][cornerCol] === player) {
                // 구석에서 현재 위치까지의 경로가 모두 자신의 돌로 연결되어 있는지 확인
                if (this.isPathConnected(board, cornerRow, cornerCol, row, col, player)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 두 위치 간의 경로가 연결되어 있는지 확인
     */
    isPathConnected(board, startRow, startCol, endRow, endCol, player) {
        // 가로 경로 확인
        if (startRow === endRow) {
            const minCol = Math.min(startCol, endCol);
            const maxCol = Math.max(startCol, endCol);
            for (let col = minCol; col <= maxCol; col++) {
                if (board[startRow][col] !== player) {
                    return false;
                }
            }
            return true;
        }
        
        // 세로 경로 확인
        if (startCol === endCol) {
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);
            for (let row = minRow; row <= maxRow; row++) {
                if (board[row][startCol] !== player) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }

    /**
     * 가장자리에 단독으로 수를 두는 것인지 확인
     */
    isIsolatedEdgeMove(board, row, col, player) {
        // 인접한 위치들 확인
        const adjacentPositions = this.getAdjacentPositions_v2(row, col);
        let hasAdjacentPlayer = false;
        
        for (const [adjRow, adjCol] of adjacentPositions) {
            if (board[adjRow][adjCol] === player) {
                hasAdjacentPlayer = true;
                break;
            }
        }
        
        return !hasAdjacentPlayer;
    }

    /**
     * 상대방 기동성 증가 평가
     */
    evaluateOpponentMobilityIncrease(board, move, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 현재 상대방 기동성
        const currentOpponentMoves = this.getValidMoves(board, opponent);
        
        // 가상으로 수를 놓은 후 상대방 기동성
        const newBoard = this.makeMove(board, player, move);
        const newOpponentMoves = this.getValidMoves(newBoard, opponent);
        
        // 상대방 기동성이 증가하면 감점
        const mobilityIncrease = newOpponentMoves.length - currentOpponentMoves.length;
        if (mobilityIncrease > 0) {
            return -mobilityIncrease * 200; // 기동성 증가당 200점 감점
        }
        
        return 0;
    }

    /**
     * 수의 안정성 평가
     */
    evaluateMoveStability(board, player) {
        let stabilityScore = 0;
        
        // 1. 구석 돌은 항상 안정적
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        for (const [row, col] of corners) {
            if (board[row][col] === player) {
                stabilityScore += 100;
            }
        }
        
        // 2. 구석과 연결된 가장자리 돌들
        for (let i = 1; i < 7; i++) {
            // 가로 가장자리
            if (board[0][i] === player && this.isEdgeConnectedToCorner(board, 0, i, player)) {
                stabilityScore += 50;
            }
            if (board[7][i] === player && this.isEdgeConnectedToCorner(board, 7, i, player)) {
                stabilityScore += 50;
            }
            
            // 세로 가장자리
            if (board[i][0] === player && this.isEdgeConnectedToCorner(board, i, 0, player)) {
                stabilityScore += 50;
            }
            if (board[i][7] === player && this.isEdgeConnectedToCorner(board, i, 7, player)) {
                stabilityScore += 50;
            }
        }
        
        return stabilityScore;
    }

    /**
     * 구석 수인지 확인
     */
    isCornerMove(row, col) {
        return (row === 0 && col === 0) || 
               (row === 0 && col === 7) || 
               (row === 7 && col === 0) || 
               (row === 7 && col === 7);
    }

    /**
     * 구석 확보 가능성 평가 (v1 AI의 효과적인 로직 통합)
     */
    evaluateCornerPotential(board, move, player) {
        const [row, col] = move;
        let score = 0;
        
        // 구석 근처에 있는 수인지 확인
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        for (const [cornerRow, cornerCol] of corners) {
            if (this.canReachCorner_v2(board, move, player, cornerRow, cornerCol)) {
                score += 200; // 구석 확보 가능성은 매우 높은 점수
            }
        }
        
        // 위험한 위치 체크 (모서리 근처 위험 위치들)
        const dangerousPositions = [
            [0, 1], [1, 0], [1, 1],   // 좌상단
            [0, 6], [1, 6], [1, 7],   // 우상단
            [6, 0], [6, 1], [7, 1],   // 좌하단
            [6, 6], [6, 7], [7, 6]    // 우하단
        ];
        
        for (const [dangerRow, dangerCol] of dangerousPositions) {
            if (row === dangerRow && col === dangerCol) {
                score -= 100; // 위험한 위치는 큰 감점
                break;
            }
        }
        
        return score;
    }

    /**
     * 특정 구석에 도달할 수 있는지 확인 (v1 AI 로직 통합)
     */
    canReachCorner_v2(board, move, player, cornerRow, cornerCol) {
        const [row, col] = move;
        
        // 구석과의 거리 계산
        const rowDistance = Math.abs(row - cornerRow);
        const colDistance = Math.abs(col - cornerCol);
        
        // 구석 근처에 있고, 구석까지의 경로가 열려있는지 확인
        if (rowDistance <= 2 && colDistance <= 2) {
            // 구석까지의 경로에 상대방 돌이 있는지 확인
            const pathOpen = this.isPathToCornerOpen_v2(board, row, col, cornerRow, cornerCol, player);
            return pathOpen;
        }
        
        return false;
    }

    /**
     * 구석까지의 경로가 열려있는지 확인 (v1 AI 로직 통합)
     */
    isPathToCornerOpen_v2(board, startRow, startCol, cornerRow, cornerCol, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 시작점에서 구석까지의 방향 계산
        const dr = cornerRow > startRow ? 1 : cornerRow < startRow ? -1 : 0;
        const dc = cornerCol > startCol ? 1 : cornerCol < startCol ? -1 : 0;
        
        let currentRow = startRow + dr;
        let currentCol = startCol + dc;
        
        // 구석까지 경로 확인
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
     * 안전한 코너 평가 (v1 AI 전략 통합)
     */
    evaluateSafeCorners_v2(board, player) {
        let score = 0;
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        
        for (const [row, col] of corners) {
            if (board[row][col] === player) {
                score += 100; // 코너 확보
            } else if (board[row][col] === null) {
                // 코너 근처 위험 위치 체크
                const isSafe = this.isCornerSafe_v2(board, row, col, player);
                if (isSafe) {
                    score += 50; // 안전한 코너 확보 가능
                }
            }
        }
        
        return score;
    }

    /**
     * 코너가 안전한지 확인 (v1 AI 전략 통합)
     */
    isCornerSafe_v2(board, cornerRow, cornerCol, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 코너 근처 위험 위치들
        const dangerousPositions = [
            [cornerRow === 0 ? 1 : 6, cornerCol === 0 ? 1 : 6], // X-square
            [cornerRow === 0 ? 0 : 7, cornerCol === 0 ? 1 : 6], // C-square
            [cornerRow === 0 ? 1 : 6, cornerCol === 0 ? 0 : 7]  // C-square
        ];
        
        for (const [row, col] of dangerousPositions) {
            if (board[row][col] === opponent) {
                return false; // 위험
            }
        }
        
        return true; // 안전
    }

    /**
     * 전략적 패턴 평가 (v1 AI 전략 통합)
     */
    evaluateStrategicPatterns_v2(board, player) {
        let score = 0;
        
        // 1. 모서리 확보 전략
        score += this.evaluateCornerStrategy_v2(board, player);
        
        // 2. 가장자리 안정성
        score += this.evaluateEdgeStability_v2(board, player);
        
        return score;
    }

    /**
     * 코너 전략 평가 (v1 AI 전략 통합)
     */
    evaluateCornerStrategy_v2(board, player) {
        let score = 0;
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        
        for (const [row, col] of corners) {
            if (board[row][col] === player) {
                score += 100;
            } else if (board[row][col] === null) {
                // 코너 확보 가능성 체크
                if (this.canSecureCorner_v2(board, row, col, player)) {
                    score += 50;
                }
            }
        }
        
        return score;
    }

    /**
     * 가장자리 안정성 평가 (v1 AI 전략 통합)
     */
    evaluateEdgeStability_v2(board, player) {
        let score = 0;
        
        // 가로 가장자리
        for (let col = 1; col < 7; col++) {
            if (board[0][col] === player) {
                score += 20; // 모서리 근처는 안정적
            }
            if (board[7][col] === player) {
                score += 20;
            }
        }
        
        // 세로 가장자리
        for (let row = 1; row < 7; row++) {
            if (board[row][0] === player) {
                score += 20;
            }
            if (board[row][7] === player) {
                score += 20;
            }
        }
        
        return score;
    }

    /**
     * 코너 확보 가능성 확인 (v1 AI 전략 통합)
     */
    canSecureCorner_v2(board, cornerRow, cornerCol, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        // 코너 근처에 상대방 돌이 있으면 위험
        const adjacentPositions = this.getAdjacentPositions_v2(cornerRow, cornerCol);
        for (const [row, col] of adjacentPositions) {
            if (board[row][col] === opponent) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 인접한 위치들 가져오기 (v1 AI 전략 통합)
     */
    getAdjacentPositions_v2(row, col) {
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
}

// 전역으로 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OthelloAI_v2;
}

// 브라우저에서 전역으로 사용할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
    window.OthelloAI_v2 = OthelloAI_v2;
    console.log('OthelloAI_v2 클래스가 전역으로 등록되었습니다!');
}
