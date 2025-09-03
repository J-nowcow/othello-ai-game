# Othello WPC MCP 설정 가이드

이 프로젝트는 오델로 게임의 WPC(Weighted Piece Counter) 가중치를 MCP(Model Context Protocol)를 통해 Cursor에 주입하는 설정을 포함합니다.

## 📁 프로젝트 구조

```
20250903_MCP/
├── .cursor/
│   └── mcp.json                    # MCP 서버 설정
├── othello-papers/
│   ├── paper.md                    # 논문 요약 및 WPC 가중치 설명
│   └── wpc.json                    # 64칸 가중치 JSON 데이터
├── othello-mcp-server/
│   ├── package.json                 # MCP 서버 의존성
│   ├── server.js                    # MCP 서버 메인 코드
│   ├── test.js                      # 테스트 스크립트
│   └── README.md                    # 서버 사용법 설명
├── othello_frontend/                # 기존 오델로 프론트엔드
└── README-MCP.md                    # 이 파일
```

## 🚀 MCP 서버 설정 방법

### 1. 의존성 설치

```bash
cd othello-mcp-server
npm install
```

### 2. MCP 서버 테스트

```bash
cd othello-mcp-server
node test.js
```

### 3. Cursor에서 사용하기

1. **프로젝트 열기**: 이 폴더를 Cursor에서 열기
2. **자동 인식**: `.cursor/mcp.json` 파일이 자동으로 MCP 서버를 등록
3. **도구 사용**: 대화에서 MCP 도구들이 자동으로 사용 가능

## 🔧 제공되는 MCP 도구들

### `get_wpc_weights`
- **설명**: 오델로 WPC 가중치 표를 반환
- **사용법**: `get_wpc_weights()`

### `score_board`
- **설명**: 8×8 보드 상태를 받아 WPC 점수 계산
- **사용법**: `score_board({ board: [[...]] })`
- **입력**: 8×8 배열 (-1: 흑, 0: 빈칸, 1: 백)

### `explain_square`
- **설명**: 특정 칸의 가중치와 의미 설명
- **사용법**: `explain_square({ row: 0, col: 0 })`
- **입력**: row, col (0-7 범위)

## 📊 WPC 가중치 표

```
1.00 -0.25  0.10  0.05  0.05  0.10 -0.25  1.00
-0.25 -0.25  0.01  0.01  0.01  0.01 -0.25 -0.25
0.10  0.01  0.05  0.02  0.02  0.05  0.01  0.10
0.05  0.01  0.02  0.01  0.01  0.02  0.01  0.05
0.05  0.01  0.02  0.01  0.01  0.02  0.01  0.05
0.10  0.01  0.05  0.02  0.02  0.05  0.01  0.10
-0.25 -0.25  0.01  0.01  0.01  0.01 -0.25 -0.25
1.00 -0.25  0.10  0.05  0.05  0.10 -0.25  1.00
```

## 🎯 다른 프로젝트에서 참조하기

### 방법 1: 직접 복사
```bash
# 필요한 폴더들만 복사
cp -r othello-papers /path/to/your/project/
cp -r othello-mcp-server /path/to/your/project/
cp .cursor/mcp.json /path/to/your/project/.cursor/
```

### 방법 2: 심볼릭 링크
```bash
# 프로젝트 간 공유
ln -s /path/to/this/project/othello-papers /path/to/your/project/
ln -s /path/to/this/project/othello-mcp-server /path/to/your/project/
```

### 방법 3: 전역 MCP 설정
```bash
# ~/.cursor/mcp.json에 추가
{
  "mcpServers": {
    "othello-wpc": {
      "command": "node",
      "args": ["/full/path/to/othello-mcp-server/server.js"]
    }
  }
}
```

## 📚 참고 문헌

- **Simon Lucas (2008)**: Learning to Play Othello with N-Tuple Systems
- **Marcin Szubert et al. (2009)**: Coevolutionary Temporal Difference Learning for Othello  
- **Paul Rosenbloom (1982)**: A World-Championship-Level Othello Program

## 🔍 문제 해결

### MCP 서버가 인식되지 않는 경우
1. Cursor 재시작
2. `.cursor/mcp.json` 파일 경로 확인
3. `node` 명령어가 PATH에 있는지 확인
4. `othello-mcp-server` 폴더의 의존성 설치 확인

### 서버 실행 오류
```bash
cd othello-mcp-server
npm install
node server.js
```

## 💡 활용 예시

### AI 개선
```javascript
// 기존 AI에 WPC 평가 함수 적용
const wpcScore = await score_board({ board: currentBoard });
const moveScore = evaluateMove(move) + wpcScore * 0.3;
```

### 게임 분석
```javascript
// 현재 보드 상태 분석
const analysis = await explain_square({ row: 3, col: 3 });
console.log(`위치 [3,3] 분석: ${analysis}`);
```

### 학습 도구
```javascript
// 모든 코너 위치 설명
for (let i = 0; i < 8; i += 7) {
  for (let j = 0; j < 8; j += 7) {
    const explanation = await explain_square({ row: i, col: j });
    console.log(explanation);
  }
}
```

---

**설정 완료 후 Cursor를 재시작하면 MCP 도구들이 자동으로 사용 가능해집니다!**
