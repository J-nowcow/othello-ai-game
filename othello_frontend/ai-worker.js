// AI 계산을 위한 Web Worker
importScripts('othello-ai-v2-core.js');

self.onmessage = function(e) {
    const { board, player, validMoves, timeLimit } = e.data;
    
    try {
        // AI 인스턴스 생성
        const ai = new OthelloAI_v2('expert');
        
        // 시작 시간 기록
        const startTime = Date.now();
        
        // 계산 결과 저장용 변수
        let bestMoveSoFar = validMoves[0];
        let bestScoreSoFar = -Infinity;
        let movesEvaluated = 0;
        
        // 각 수를 평가하면서 최선의 결과 저장
        for (const move of validMoves) {
            // 시간 제한 체크
            if (Date.now() - startTime > timeLimit) {
                console.log(`시간 제한 초과! ${movesEvaluated}개 수 평가 완료. 현재까지의 최선의 수 반환`);
                break;
            }
            
            try {
                // 현재 수 평가
                const newBoard = ai.makeMove(board, player, move);
                const score = ai.evaluateBoard_v2(newBoard, player);
                
                movesEvaluated++;
                
                // 더 좋은 수를 찾으면 업데이트
                if (score > bestScoreSoFar) {
                    bestScoreSoFar = score;
                    bestMoveSoFar = move;
                }
                
                // 진행 상황 로그
                if (movesEvaluated % 5 === 0) {
                    console.log(`AI 진행: ${movesEvaluated}/${validMoves.length} 수 평가 완료, 현재 최선: ${bestScoreSoFar}`);
                }
                
            } catch (error) {
                console.log(`수 ${move} 평가 중 오류:`, error.message);
                continue;
            }
        }
        
        // 결과 반환
        self.postMessage({
            success: true,
            move: bestMoveSoFar,
            score: bestScoreSoFar,
            movesEvaluated: movesEvaluated,
            totalMoves: validMoves.length,
            timeTaken: Date.now() - startTime,
            timeoutOccurred: Date.now() - startTime > timeLimit
        });
        
    } catch (error) {
        // 오류 발생 시
        self.postMessage({
            success: false,
            error: error.message,
            fallbackMove: validMoves[0] || null
        });
    }
};

// 타임아웃 감지 (Worker 자체 타임아웃)
setTimeout(() => {
    self.postMessage({
        success: false,
        error: 'Worker timeout',
        fallbackMove: null
    });
}, 6000); // 6초 후 강제 종료
