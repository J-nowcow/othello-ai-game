import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// WPC 가중치 로드 (루트 폴더 기준)
const wpcWeights = JSON.parse(
  readFileSync(join(__dirname, '../othello-papers/wpc.json'), 'utf8')
);

const server = new Server(
  {
    name: 'othello-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// WPC 가중치 반환
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_wpc_weights':
      return {
        content: [
          {
            type: 'text',
            text: `WPC 가중치를 반환합니다:\n\n${JSON.stringify(wpcWeights, null, 2)}`,
          },
        ],
      };

    case 'score_board':
      const { board } = args;
      if (!board || !Array.isArray(board) || board.length !== 8) {
        return {
          content: [
            {
              type: 'text',
              text: '올바른 8x8 보드 배열을 제공해주세요.',
            },
          ],
        };
      }
      
      const score = calculateWPCScore(board);
      return {
        content: [
          {
            type: 'text',
            text: `보드 WPC 점수: ${score.toFixed(3)}\n\n보드 상태:\n${board.map(row => row.join(' ')).join('\n')}`,
          },
        ],
      };

    case 'explain_square':
      const { row, col } = args;
      if (row < 0 || row > 7 || col < 0 || col > 7) {
        return {
          content: [
            {
              type: 'text',
              text: '올바른 위치를 입력해주세요 (0-7 범위).',
            },
          ],
        };
      }
      
      const weight = wpcWeights.weights[row][col];
      const explanation = explainSquare(row, col, weight);
      return {
        content: [
          {
            type: 'text',
            text: explanation,
          },
        ],
      };

    default:
      return {
        content: [
          {
            type: 'text',
            text: `알 수 없는 도구: ${name}`,
          },
        ],
      };
  }
});

// WPC 점수 계산
function calculateWPCScore(board) {
  let score = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      score += board[i][j] * wpcWeights.weights[i][j];
    }
  }
  return score;
}

// 특정 칸 설명
function explainSquare(row, col, weight) {
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

// 도구 정의
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'get_wpc_weights',
        description: '오델로 WPC 가중치 표를 반환합니다.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'score_board',
        description: '8x8 보드 상태를 받아 WPC 점수를 계산합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            board: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
                minItems: 8,
                maxItems: 8,
              },
              minItems: 8,
              maxItems: 8,
              description: '8x8 보드 배열 (-1: 흑, 0: 빈칸, 1: 백)',
            },
          },
          required: ['board'],
        },
      },
      {
        name: 'explain_square',
        description: '특정 칸의 가중치와 의미를 설명합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            row: {
              type: 'number',
              minimum: 0,
              maximum: 7,
              description: '행 인덱스 (0-7)',
            },
            col: {
              type: 'number',
              minimum: 0,
              maximum: 7,
              description: '열 인덱스 (0-7)',
            },
          },
          required: ['row', 'col'],
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Othello MCP 서버가 시작되었습니다.');
