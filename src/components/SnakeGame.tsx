"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID = 20;
const CELL = 14;
const SPEED = 120;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const dirRef = useRef<Dir>("RIGHT");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    let p: Point;
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (currentSnake.some((s) => s.x === p.x && s.y === p.y));
    return p;
  }, []);

  const reset = useCallback(() => {
    const initial = [{ x: 10, y: 10 }];
    setSnake(initial);
    setFood(spawnFood(initial));
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setStarted(true);
  }, [spawnFood]);

  // Handle keyboard + swipe
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!started && !gameOver) { reset(); return; }
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) return;
      const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (newDir !== opposite[dirRef.current]) {
        dirRef.current = newDir;
        setDir(newDir);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, gameOver, reset]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let startX = 0, startY = 0;
    const handleStart = (e: TouchEvent) => {
      if (!started && !gameOver) { reset(); return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      let newDir: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? "RIGHT" : "LEFT";
      } else {
        newDir = dy > 0 ? "DOWN" : "UP";
      }
      const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (newDir !== opposite[dirRef.current]) {
        dirRef.current = newDir;
        setDir(newDir);
      }
    };
    canvas.addEventListener("touchstart", handleStart, { passive: true });
    canvas.addEventListener("touchend", handleEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [started, gameOver, reset]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] };
        const d = dirRef.current;
        if (d === "UP") head.y--;
        if (d === "DOWN") head.y++;
        if (d === "LEFT") head.x--;
        if (d === "RIGHT") head.x++;

        // Wall collision (wrap)
        head.x = (head.x + GRID) % GRID;
        head.y = (head.y + GRID) % GRID;

        // Self collision
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => s + 1);
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, SPEED);
    return () => clearInterval(interval);
  }, [started, gameOver, food, spawnFood]);

  // Render
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const size = GRID * CELL;
    ctx.clearRect(0, 0, size, size);

    // Grid
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Food
    ctx.fillStyle = "#e8655a";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((s, i) => {
      const alpha = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = `rgba(232, 228, 223, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3);
      ctx.fill();
    });
  }, [snake, food]);

  const size = GRID * CELL;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-xl border border-[var(--color-border)]"
          style={{ background: "var(--color-surface-0)" }}
        />
        {(!started || gameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ background: "rgba(18,18,20,0.85)" }}>
            {gameOver ? (
              <>
                <p className="text-lg font-bold mb-1">Game Over</p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">Score: {score}</p>
                <button onClick={reset} className="btn-primary text-xs px-4 py-2">
                  Play Again
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">Snake</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Tap or press any arrow key</p>
              </>
            )}
          </div>
        )}
      </div>
      {started && !gameOver && (
        <p className="text-xs text-[var(--color-text-tertiary)]">Score: {score} &middot; Swipe or use arrow keys</p>
      )}
    </div>
  );
}
