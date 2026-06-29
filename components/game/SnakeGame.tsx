"use client";

import { useEffect, useRef, useState } from "react";
import type { SnakeDifficulty, SnakeStyle } from "@/components/game/GameCenter";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

type Position = {
  x: number;
  y: number;
};

type SnakeGameProps = {
  snakeStyle: SnakeStyle;
  difficulty: SnakeDifficulty;
  onBack: () => void;
};

function getBoardSize(style: SnakeStyle) {
  if (style === "nokia") {
    return {
      width: 44,
      height: 16,
    };
  }

  return {
    width: 20,
    height: 20,
  };
}

function getInitialDirection() {
  return "RIGHT" as Direction;
}

function getInitialSnake(style: SnakeStyle): Position[] {
  if (style === "nokia") {
    return [
      { x: 12, y: 8 },
      { x: 11, y: 8 },
      { x: 10, y: 8 },
      { x: 9, y: 8 },
      { x: 8, y: 8 },
    ];
  }

  return [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
}

function getInitialFood(style: SnakeStyle): Position {
  if (style === "nokia") {
    return { x: 30, y: 6 };
  }

  return { x: 14, y: 10 };
}

function getRandomFood(
  snake: Position[],
  boardWidth: number,
  boardHeight: number
) {
  while (true) {
    const food = {
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * boardHeight),
    };

    const isOnSnake = snake.some(
      (part) => part.x === food.x && part.y === food.y
    );

    if (!isOnSnake) return food;
  }
}

function getStyleTitle(style: SnakeStyle) {
  if (style === "classic") return "Classic Snake";
  if (style === "nokia") return "Nokia Snake";
  return "Cat Eats Fish";
}

function getDifficultyTitle(difficulty: SnakeDifficulty) {
  if (difficulty === "invincible") return "Invincible";
  if (difficulty === "easy") return "Easy";
  return "Hard";
}

function getBestScoreKey(style: SnakeStyle, difficulty: SnakeDifficulty) {
  return `xiaojujun_snake_best_${style}_${difficulty}`;
}

function getBaseSpeed(style: SnakeStyle, difficulty: SnakeDifficulty) {
  if (style === "nokia") {
    if (difficulty === "invincible") return 140;
    if (difficulty === "easy") return 150;
    return 100;
  }

  if (difficulty === "invincible") return 170;
  if (difficulty === "easy") return 170;
  return 110;
}

function getSpeed(
  score: number,
  style: SnakeStyle,
  difficulty: SnakeDifficulty
) {
  const baseSpeed = getBaseSpeed(style, difficulty);

  if (difficulty === "invincible") {
    return Math.max(75, baseSpeed - score * 1);
  }

  if (difficulty === "easy") {
    return Math.max(70, baseSpeed - score * 2);
  }

  return Math.max(50, baseSpeed - score * 3);
}

function getRank(score: number) {
  if (score >= 25) return "S Rank · Snake Master";
  if (score >= 15) return "A Rank · Fast Player";
  if (score >= 8) return "B Rank · Good Try";
  return "C Rank · Keep Training";
}

function formatNokiaScore(score: number) {
  return String(score).padStart(4, "0");
}

export default function SnakeGame({
  snakeStyle,
  difficulty,
  onBack,
}: SnakeGameProps) {
  const board = getBoardSize(snakeStyle);
  const boardWidth = board.width;
  const boardHeight = board.height;

  const [snake, setSnake] = useState<Position[]>(() =>
    getInitialSnake(snakeStyle)
  );
  const [food, setFood] = useState<Position>(() => getInitialFood(snakeStyle));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const snakeRef = useRef<Position[]>(getInitialSnake(snakeStyle));
  const foodRef = useRef<Position>(getInitialFood(snakeStyle));
  const scoreRef = useRef(0);
  const directionRef = useRef<Direction>(getInitialDirection());
  const nextDirectionRef = useRef<Direction>(getInitialDirection());

  const isNokia = snakeStyle === "nokia";
  const isCat = snakeStyle === "cat";

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  function saveBestScore(finalScore: number) {
    setBestScore((prev) => {
      const nextBest = Math.max(prev, finalScore);

      localStorage.setItem(
        getBestScoreKey(snakeStyle, difficulty),
        String(nextBest)
      );

      return nextBest;
    });
  }

  function endGame() {
    setIsPlaying(false);
    setIsGameOver(true);
    saveBestScore(scoreRef.current);
  }

  function resetGame() {
    const initialSnake = getInitialSnake(snakeStyle);
    const initialFood = getInitialFood(snakeStyle);
    const initialDirection = getInitialDirection();

    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);

    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    scoreRef.current = 0;
    directionRef.current = initialDirection;
    nextDirectionRef.current = initialDirection;
  }

  function pauseGame() {
    setIsPlaying(false);
  }

  function changeDirection(newDirection: Direction) {
    const currentDirection = directionRef.current;

    if (currentDirection === "UP" && newDirection === "DOWN") return;
    if (currentDirection === "DOWN" && newDirection === "UP") return;
    if (currentDirection === "LEFT" && newDirection === "RIGHT") return;
    if (currentDirection === "RIGHT" && newDirection === "LEFT") return;

    nextDirectionRef.current = newDirection;
  }

  function stepGame() {
    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    const direction = nextDirectionRef.current;

    directionRef.current = direction;

    const head = currentSnake[0];
    let newHead = { ...head };

    if (direction === "UP") {
      newHead = { x: head.x, y: head.y - 1 };
    }

    if (direction === "DOWN") {
      newHead = { x: head.x, y: head.y + 1 };
    }

    if (direction === "LEFT") {
      newHead = { x: head.x - 1, y: head.y };
    }

    if (direction === "RIGHT") {
      newHead = { x: head.x + 1, y: head.y };
    }

    const hitWall =
      newHead.x < 0 ||
      newHead.x >= boardWidth ||
      newHead.y < 0 ||
      newHead.y >= boardHeight;

    if (hitWall) {
      if (difficulty === "invincible") {
        if (newHead.x < 0) newHead.x = boardWidth - 1;
        if (newHead.x >= boardWidth) newHead.x = 0;
        if (newHead.y < 0) newHead.y = boardHeight - 1;
        if (newHead.y >= boardHeight) newHead.y = 0;
      } else {
        endGame();
        return;
      }
    }

    const nextSnake = [newHead, ...currentSnake];
    const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;

    if (!ateFood) {
      nextSnake.pop();
    }

    const hitSelf = nextSnake
      .slice(1)
      .some((part) => part.x === newHead.x && part.y === newHead.y);

    if (hitSelf) {
      endGame();
      return;
    }

    setSnake(nextSnake);
    snakeRef.current = nextSnake;

    if (ateFood) {
      const newScore = scoreRef.current + 1;

      setScore(newScore);
      scoreRef.current = newScore;

      const newFood = getRandomFood(nextSnake, boardWidth, boardHeight);
      setFood(newFood);
      foodRef.current = newFood;
    }
  }

  useEffect(() => {
    const savedBest = localStorage.getItem(
      getBestScoreKey(snakeStyle, difficulty)
    );

    setBestScore(savedBest ? Number(savedBest) : 0);

    const initialSnake = getInitialSnake(snakeStyle);
    const initialFood = getInitialFood(snakeStyle);
    const initialDirection = getInitialDirection();

    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(false);

    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    scoreRef.current = 0;
    directionRef.current = initialDirection;
    nextDirectionRef.current = initialDirection;
  }, [snakeStyle, difficulty]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        changeDirection("UP");
      }

      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        changeDirection("DOWN");
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        changeDirection("LEFT");
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        changeDirection("RIGHT");
      }

      if (event.key === " " && !isPlaying) {
        event.preventDefault();
        resetGame();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, snakeStyle, difficulty]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      stepGame();
    }, getSpeed(score, snakeStyle, difficulty));

    return () => clearInterval(timer);
  }, [isPlaying, score, snakeStyle, difficulty]);

  function renderNokiaFood() {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          <div className="absolute left-1/2 top-1/2 w-[22%] h-[80%] bg-[#10380f] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 w-[80%] h-[22%] bg-[#10380f] -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  function renderNokiaBoard() {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[1220px]">
          <div className="bg-[#a6c800] border-[4px] border-[#264500] p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[#10380f] text-3xl md:text-5xl font-black tracking-[0.2em] leading-none">
                {formatNokiaScore(score)}
              </div>

              <div className="font-mono text-[#10380f] text-xl md:text-3xl font-black tracking-[0.08em] leading-none">
                BEST {formatNokiaScore(bestScore)}
              </div>
            </div>

            <div className="border-t-[2px] border-[#264500] mb-4" />

            <div
              className="grid border-[4px] border-[#264500] bg-[#a6c800] overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${boardWidth}, 1fr)`,
                aspectRatio: `${boardWidth} / ${boardHeight}`,
              }}
            >
              {Array.from({ length: boardWidth * boardHeight }).map(
                (_, index) => {
                  const x = index % boardWidth;
                  const y = Math.floor(index / boardWidth);

                  const snakeIndex = snake.findIndex(
                    (part) => part.x === x && part.y === y
                  );

                  const isSnake = snakeIndex !== -1;
                  const isFood = food.x === x && food.y === y;

                  return (
                    <div key={index} className="relative w-full h-full">
                      {isFood && renderNokiaFood()}

                      {isSnake && (
                        <div className="absolute inset-[12%] bg-[#10380f]" />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderModernBoard() {
    return (
      <div
        className={`rounded-3xl p-4 md:p-6 shadow-2xl border ${
          isCat
            ? "bg-zinc-950 border-pink-500/30"
            : "bg-zinc-950 border-zinc-800"
        }`}
      >
        <div
          className={`grid overflow-hidden mx-auto border ${
            isCat
              ? "bg-black border-pink-500/20 rounded-2xl"
              : "bg-zinc-900 border-zinc-800 rounded-2xl"
          }`}
          style={{
            gridTemplateColumns: `repeat(${boardWidth}, 1fr)`,
            width: "min(88vw, 560px)",
            height: "min(88vw, 560px)",
            aspectRatio: "1 / 1",
          }}
        >
          {Array.from({ length: boardWidth * boardHeight }).map((_, index) => {
            const x = index % boardWidth;
            const y = Math.floor(index / boardWidth);

            const snakeIndex = snake.findIndex(
              (part) => part.x === x && part.y === y
            );

            const isSnake = snakeIndex !== -1;
            const isHead = snakeIndex === 0;
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={index}
                className="relative flex items-center justify-center border border-black/20"
              >
                {isFood &&
                  (isCat ? (
                    <span className="text-[clamp(10px,2.2vw,24px)] leading-none">
                      🐟
                    </span>
                  ) : (
                    <div className="w-[70%] h-[70%] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
                  ))}

                {isSnake &&
                  (isCat ? (
                    <span className="text-[clamp(10px,2.2vw,24px)] leading-none">
                      {isHead ? "🐱" : "🐾"}
                    </span>
                  ) : (
                    <div
                      className={`w-[78%] h-[78%] rounded-md ${
                        isHead
                          ? "bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]"
                          : "bg-zinc-400"
                      }`}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-white transition mb-4"
          >
            ← Back to Snake Setup
          </button>

          <p className="text-sm text-zinc-500 mb-2">
            Snake Challenge · {getDifficultyTitle(difficulty)}
          </p>

          <h1 className="text-3xl md:text-5xl font-black">
            {getStyleTitle(snakeStyle)}
          </h1>
        </div>

        <div className="flex gap-3">
          {!isPlaying ? (
            <button
              onClick={resetGame}
              className="px-5 py-3 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition"
            >
              {isGameOver ? "Restart" : "Start"}
            </button>
          ) : (
            <button
              onClick={pauseGame}
              className="px-5 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-black hover:bg-zinc-700 transition"
            >
              Pause
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div>
          {isNokia ? renderNokiaBoard() : renderModernBoard()}

          <div className="mt-6 grid grid-cols-3 gap-3 max-w-[260px] mx-auto lg:hidden">
            <div></div>

            <button
              onClick={() => changeDirection("UP")}
              className="h-14 rounded-2xl bg-white text-black font-black active:scale-95"
            >
              ↑
            </button>

            <div></div>

            <button
              onClick={() => changeDirection("LEFT")}
              className="h-14 rounded-2xl bg-white text-black font-black active:scale-95"
            >
              ←
            </button>

            <button
              onClick={() => {
                if (!isPlaying) resetGame();
              }}
              className="h-14 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-xs font-bold active:scale-95"
            >
              START
            </button>

            <button
              onClick={() => changeDirection("RIGHT")}
              className="h-14 rounded-2xl bg-white text-black font-black active:scale-95"
            >
              →
            </button>

            <div></div>

            <button
              onClick={() => changeDirection("DOWN")}
              className="h-14 rounded-2xl bg-white text-black font-black active:scale-95"
            >
              ↓
            </button>

            <div></div>
          </div>
        </div>

        <aside className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Score</div>
              <div className="text-3xl font-black">{score}</div>
            </div>

            <div className="bg-black border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Best</div>
              <div className="text-3xl font-black">{bestScore}</div>
            </div>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-6">
            <div className="text-xs text-zinc-500 mb-1">Rank</div>
            <div className="text-lg font-bold">{getRank(score)}</div>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-6">
            <div className="text-xs text-zinc-500 mb-1">Mode</div>
            <div className="font-bold">
              {getStyleTitle(snakeStyle)} · {getDifficultyTitle(difficulty)}
            </div>
          </div>

          {difficulty === "invincible" && (
            <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="font-black text-green-300">Invincible Mode</div>
              <p className="text-sm text-zinc-400 mt-1">
                撞墙会从另一边出现。
              </p>
            </div>
          )}

          {isGameOver && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="font-black text-red-300">Game Over</div>
              <p className="text-sm text-zinc-400 mt-1">
                你的最终分数是 {score}。再挑战一次看看能不能破纪录。
              </p>
            </div>
          )}

          {!isPlaying ? (
            <button
              onClick={resetGame}
              className="w-full px-5 py-4 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition"
            >
              {isGameOver ? "Restart Game" : "Start Game"}
            </button>
          ) : (
            <button
              onClick={pauseGame}
              className="w-full px-5 py-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-black hover:bg-zinc-700 transition"
            >
              Pause
            </button>
          )}

          <div className="mt-6 text-sm text-zinc-500 leading-relaxed">
            <p className="font-bold text-zinc-300 mb-2">控制方式</p>
            <p>电脑：方向键 / WASD</p>
            <p>手机：使用下方方向按钮</p>
            <p className="mt-3">空格键可以快速开始新游戏。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}