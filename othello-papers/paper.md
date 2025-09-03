# Othello WPC (Weighted Piece Counter) 논문 요약

## 주요 논문들

### 1. Simon Lucas (2008) - Learning to Play Othello with N-Tuple Systems
- **출처**: repository.essex.ac.uk
- **핵심**: 고전적인 8×8 가중치 매트릭스 제시
- **WPC 개념**: 각 칸에 정적 가중치를 부여하여 보드 상태를 평가하는 방법

### 2. Marcin Szubert et al. (CIG 2009) - Coevolutionary Temporal Difference Learning for Othello
- **출처**: cs.put.poznan.pl
- **핵심**: 64칸 가중치 표와 WPC 공식 정의
- **용도**: "표준 휴리스틱 플레이어"로 사용

### 3. Paul Rosenbloom (1982) - A World-Championship-Level Othello Program
- **출처**: stacks.stanford.edu
- **핵심**: "weighted-square strategy" 최초 언급
- **역사적 의의**: 고전적 참고 문헌

## WPC 가중치 표 (8×8)

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

## 가중치 의미

- **코너 (1.00)**: 가장 높은 가중치, 게임에서 매우 중요
- **X-square (-0.25)**: 코너 근처, 상대방이 코너를 차지할 수 있게 하는 위치
- **C-square (0.10)**: 코너와 X-square 사이, 중간 정도의 가치
- **중앙 (0.01~0.05)**: 낮은 가중치, 게임 초기에는 중요하지 않음

## WPC 공식

```
WPC Score = Σ(board[i][j] × weights[i][j])
```

여기서 `board[i][j]`는 각 칸의 돌 상태(-1: 흑, 0: 빈칸, 1: 백)이고, `weights[i][j]`는 해당 칸의 가중치입니다.
