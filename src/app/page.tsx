'use client';

import { useState, useEffect, useCallback } from 'react';

type Board = (number | null)[][];

const TILE_COLORS: Record<number, { bg: string; color: string }> = {
  2:    { bg: '#eee4da', color: '#776e65' },
  4:    { bg: '#ede0c8', color: '#776e65' },
  8:    { bg: '#f2b179', color: '#f9f6f2' },
  16:   { bg: '#f59563', color: '#f9f6f2' },
  32:   { bg: '#f67c5f', color: '#f9f6f2' },
  64:   { bg: '#f65e3b', color: '#f9f6f2' },
  128:  { bg: '#edcf72', color: '#f9f6f2' },
  256:  { bg: '#edcc61', color: '#f9f6f2' },
  512:  { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
};

function createEmptyBoard(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(null));
}

function addRandomTile(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push([r, c]); }));
  if (!empty.length) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

function moveLeft(board: Board): { board: Board; score: number } {
  let score = 0;
  const newBoard = board.map(row => {
    const filtered = row.filter(Boolean) as number[];
    const merged: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        score += filtered[i] * 2;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    while (merged.length < 4) merged.push(0);
    return merged.map(v => v || null);
  });
  return { board: newBoard, score };
}

function rotateBoard(board: Board): Board {
  return board[0].map((_, i) => board.map(row => row[i]).reverse());
}

function move(board: Board, direction: string): { board: Board; score: number } {
  let b = board;
  let totalScore = 0;

  if (direction === 'left') {
    const r = moveLeft(b);
    return r;
  }
  if (direction === 'right') {
    b = b.map(row => [...row].reverse());
    const r = moveLeft(b);
    return { board: r.board.map(row => [...row].reverse()), score: r.score };
  }
  if (direction === 'up') {
    b = rotateBoard(b);
    const r = moveLeft(b);
    b = rotateBoard(rotateBoard(rotateBoard(r.board)));
    return { board: b, score: r.score };
  }
  if (direction === 'down') {
    b = rotateBoard(rotateBoard(rotateBoard(b)));
    const r = moveLeft(b);
    b = rotateBoard(r.board);
    return { board: b, score: r.score };
  }
  return { board, score: totalScore };
}

function boardsEqual(a: Board, b: Board): boolean {
  return a.every((row, r) => row.every((cell, c) => cell === b[r][c]));
}

function isGameOver(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!board[r][c]) return false;
      if (c < 3 && board[r][c] === board[r][c + 1]) return false;
      if (r < 3 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

function hasWon(board: Board): boolean {
  return board.some(row => row.some(cell => cell === 2048));
}

export default function Game() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const handleMove = useCallback((direction: string) => {
    if (gameOver) return;
    setBoard(prev => {
      const { board: newBoard, score: gained } = move(prev, direction);
      if (boardsEqual(prev, newBoard)) return prev;
      const withTile = addRandomTile(newBoard);
      setScore(s => {
        const next = s + gained;
        setBest(b => Math.max(b, next));
        return next;
      });
      if (hasWon(withTile)) setWon(true);
      if (isGameOver(withTile)) setGameOver(true);
      return withTile;
    });
  }, [gameOver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        ArrowLeft: 'left', ArrowRight: 'right',
        ArrowUp: 'up', ArrowDown: 'down',
      };
      if (map[e.key]) { e.preventDefault(); handleMove(map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  // Touch support
  useEffect(() => {
    let startX = 0, startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }
    };
    window.addEventListener('touchstart', onStart);
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, [handleMove]);

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '64px', fontWeight: 800, color: '#776e65', lineHeight: 1 }}>2048</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['分數', score], ['最高', best]].map(([label, val]) => (
            <div key={label as string} style={{ background: '#bbada0', borderRadius: '6px', padding: '8px 16px', textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '11px', color: '#eee4da', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Subheader */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#776e65' }}>合併數字，達成 <strong>2048</strong>！</p>
        <button onClick={restart} style={{ background: '#8f7a66', color: '#f9f6f2', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          新遊戲
        </button>
      </div>

      {/* Board */}
      <div style={{ background: '#bbada0', borderRadius: '12px', padding: '12px', position: 'relative', userSelect: 'none' }}>
        {(gameOver || won) && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '12px',
            background: 'rgba(238,228,218,0.85)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}>
            <p style={{ fontSize: '36px', fontWeight: 800, color: won ? '#f65e3b' : '#776e65' }}>
              {won ? '你贏了！🎉' : '遊戲結束'}
            </p>
            <button onClick={restart} style={{ marginTop: '16px', background: '#8f7a66', color: '#f9f6f2', border: 'none', borderRadius: '6px', padding: '12px 24px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
              再玩一次
            </button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const colors = cell ? (TILE_COLORS[cell] || { bg: '#3c3a32', color: '#f9f6f2' }) : null;
              return (
                <div key={`${r}-${c}`} style={{
                  background: colors ? colors.bg : 'rgba(238,228,218,0.35)',
                  borderRadius: '6px',
                  aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: cell && cell >= 1000 ? '22px' : '32px',
                  fontWeight: 800,
                  color: colors ? colors.color : 'transparent',
                  transition: 'background 0.1s',
                }}>
                  {cell || ''}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p style={{ marginTop: '16px', fontSize: '13px', color: '#776e65', textAlign: 'center' }}>
        使用方向鍵或滑動來移動方塊
      </p>
    </div>
  );
}
