# 전역 MCP 설정 방법

다른 프로젝트에서도 이 Othello WPC MCP 서버를 사용하려면 전역 설정을 할 수 있습니다.

## 🌍 전역 설정 (모든 프로젝트에서 사용)

### 1. 전역 MCP 설정 파일 생성

```bash
# 홈 디렉토리에 .cursor 폴더 생성
mkdir -p ~/.cursor

# 전역 MCP 설정 파일 생성
touch ~/.cursor/mcp.json
```

### 2. 전역 MCP 설정 내용

`~/.cursor/mcp.json`에 다음 내용 추가:

```json
{
  "mcpServers": {
    "othello-wpc": {
      "command": "node",
      "args": ["/Users/hyunwoo/Desktop/클테코/20250903_MCP/othello-mcp-server/server.js"],
      "cwd": "/Users/hyunwoo/Desktop/클테코/20250903_MCP/othello-mcp-server"
    }
  }
}
```

**주의**: `args`의 경로를 실제 프로젝트 경로로 수정해야 합니다.

### 3. 환경변수 사용 (권장)

더 유연한 설정을 위해 환경변수를 사용할 수 있습니다:

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export OTHELLO_MCP_PATH="/Users/hyunwoo/Desktop/클테코/20250903_MCP"
```

그리고 `~/.cursor/mcp.json`에서:

```json
{
  "mcpServers": {
    "othello-wpc": {
      "command": "node",
      "args": ["${env:OTHELLO_MCP_PATH}/othello-mcp-server/server.js"],
      "cwd": "${env:OTHELLO_MCP_PATH}/othello-mcp-server"
    }
  }
}
```

## 🔄 프로젝트별 설정 vs 전역 설정

### 프로젝트별 설정 (`.cursor/mcp.json`)
- ✅ 프로젝트에만 적용
- ✅ 팀원과 공유 가능
- ✅ 프로젝트별 다른 버전 사용 가능

### 전역 설정 (`~/.cursor/mcp.json`)
- ✅ 모든 프로젝트에서 사용 가능
- ✅ 한 번 설정하면 끝
- ❌ 프로젝트별 다른 버전 사용 어려움

## 🚀 사용 방법

### 1. 전역 설정 후
```bash
# 어떤 프로젝트든 Cursor에서 열면
# othello-wpc MCP 도구들이 자동으로 사용 가능
```

### 2. 도구 사용 예시
```javascript
// get_wpc_weights() - WPC 가중치 반환
// score_board({ board: [...] }) - 보드 점수 계산
// explain_square({ row: 0, col: 0 }) - 위치 설명
```

## 🔧 문제 해결

### 경로 문제
```bash
# 절대 경로 확인
ls -la /Users/hyunwoo/Desktop/클테코/20250903_MCP/othello-mcp-server/

# 심볼릭 링크로 해결
ln -s /Users/hyunwoo/Desktop/클테코/20250903_MCP/othello-mcp-server ~/othello-mcp-server
```

### 권한 문제
```bash
# 파일 권한 확인
ls -la ~/.cursor/mcp.json

# 권한 수정
chmod 644 ~/.cursor/mcp.json
```

### 서버 실행 문제
```bash
# MCP 서버 테스트
cd /Users/hyunwoo/Desktop/클테코/20250903_MCP/othello-mcp-server
node server.js
```

## 📝 설정 확인

### 1. Cursor에서 확인
- Cursor 재시작
- MCP 도구들이 사용 가능한지 확인

### 2. 터미널에서 확인
```bash
# MCP 서버 상태 확인
ps aux | grep "othello-mcp-server"

# 로그 확인
tail -f ~/.cursor/mcp-server.log
```

---

**전역 설정 완료 후 모든 Cursor 프로젝트에서 Othello WPC MCP 도구를 사용할 수 있습니다!**
