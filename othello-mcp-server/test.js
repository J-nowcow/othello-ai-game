// MCP 서버 테스트 스크립트
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// WPC 가중치 로드 (루트 폴더 기준)
const wpcWeights = JSON.parse(
  readFileSync(join(__dirname, '../othello-papers/wpc.json'), 'utf8')
);

console.log('=== WPC 가중치 테스트 ===\n');

// 1. 가중치 표시
console.log('WPC 가중치 표:');
wpcWeights.weights.forEach((row, i) => {
  console.log(`[${i}]: ${row.map(w => w.toFixed(2).padStart(6)).join(' ')}`);
});

console.log('\n=== 보드 점수 계산 테스트 ===\n');

// 2. 테스트 보드 생성 (초기 상태)
const testBoard = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, -1, 0, 0, 0],
  [0, 0, 0, -1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0]
];

console.log('테스트 보드:');
testBoard.forEach((row, i) => {
  const displayRow = row.map(cell => {
    if (cell === 1) return '●';      // 백
    else if (cell === -1) return '○'; // 흑
    else return '·';                  // 빈칸
  });
  console.log(`[${i}]: ${displayRow.join(' ')}`);
});

// 3. WPC 점수 계산
function calculateWPCScore(board) {
  let score = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      score += board[i][j] * wpcWeights.weights[i][j];
    }
  }
  return score;
}

const score = calculateWPCScore(testBoard);
console.log(`\nWPC 점수: ${score.toFixed(3)}`);

// 4. 특정 위치 설명
console.log('\n=== 위치별 설명 ===\n');

const positions = [
  ['코너', 'C-square', 'X-square', 'C-square', 'C-square', 'X-square', 'C-square', '코너'],
  ['X-square', 'X-square', '중앙', '중앙', '중앙', '중앙', 'X-square', 'X-square'],
  ['C-square', '중앙', '중앙', '중앙', '중앙', '중앙', '중앙', 'C-square'],
  ['C-square', '중앙', '중앙', '중앙', '중앙', '중앙', '중앙', 'C-square'],
  ['C-square', '중앙', '중앙', '중앙', '중앙', '중앙', '중앙', 'C-square'],
  ['C-square', '중앙', '중앙', '중앙', '중앙', '중앙', '중앙', 'C-square'],
  ['X-square', 'X-square', '중앙', '중앙', '중앙', '중앙', 'X-square', 'X-square'],
  ['코너', 'C-square', 'X-square', 'C-square', 'C-square', 'X-square', 'C-square', '코너']
];

function explainSquare(row, col, weight) {
  const position = positions[row][col];
  let description = '';
  
  if (position === '코너') {
    description = '가장 중요한 위치. 게임에서 차지하면 큰 이점을 가집니다.';
  } else if (position === 'X-square') {
    description = '코너 근처로, 상대방이 코너를 차지할 수 있게 하는 위험한 위치입니다.';
  } else if (position === 'C-square') {
    description = '코너와 X-square 사이로, 중간 정도의 가치를 가집니다.';
  } else {
    description = '중앙 지역으로, 게임 초기에는 상대적으로 중요하지 않습니다.';
  }
  
  return `위치 [${row}, ${col}]: ${position}\n가중치: ${weight}\n설명: ${description}`;
}

// 몇 가지 중요한 위치 설명
const importantPositions = [
  [0, 0], [0, 7], [7, 0], [7, 7],  // 코너
  [0, 1], [0, 6], [1, 0], [1, 7],  // X-square
  [1, 1], [1, 6], [6, 1], [6, 6]   // C-square
];

importantPositions.forEach(([row, col]) => {
  const weight = wpcWeights.weights[row][col];
  console.log(explainSquare(row, col, weight));
  console.log('');
});

console.log('테스트 완료!');
