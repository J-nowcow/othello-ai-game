// AI 계산을 위한 Web Worker
importScripts('othello-ai-v2-core.js');

self.onmessage = function(e) {
    const { board, player, validMoves, timeLimit } = e.data;
    
    try {
        // AI 인스턴스 생성
        const ai = new OthelloAI_v2('expert');
        
        // 시작 시간 기록
        const startTime = Date.now();
        
        // AI가 다음 수를 결정
        const aiMove = ai.getNextMove(board, player, validMoves, startTime, timeLimit);
        
        // 결과 반환
        self.postMessage({
            success: true,
            move: aiMove,
            timeTaken: Date.now() - startTime
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

// 타임아웃 감지
setTimeout(() => {
    self.postMessage({
        success: false,
        error: 'Worker timeout',
        fallbackMove: null
    });
}, 6000); // 6초 후 강제 종료
