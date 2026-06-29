"use client";

import { useState } from "react";
import SnakeGame from "@/components/game/SnakeGame";

export type SnakeStyle = "classic" | "nokia" | "cat";
export type SnakeDifficulty = "invincible" | "easy" | "hard";

type GameId =
  | "snake"
  | "breakout"
  | "game2048"
  | "memory"
  | "flappy"
  | "reaction"
  | "catch"
  | "dodge"
  | "lucky";

type GameCard = {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  available: boolean;
};

const games: GameCard[] = [
  {
    id: "snake",
    title: "Snake Challenge",
    description: "经典贪吃蛇，多风格和难度选择。",
    icon: "🐍",
    available: true,
  },
  {
    id: "breakout",
    title: "Breakout",
    description: "经典打砖块小游戏。",
    icon: "🧱",
    available: false,
  },
  {
    id: "game2048",
    title: "2048",
    description: "数字合成挑战。",
    icon: "🔢",
    available: false,
  },
  {
    id: "memory",
    title: "Memory Card",
    description: "翻牌记忆小游戏。",
    icon: "🃏",
    available: false,
  },
  {
    id: "flappy",
    title: "Flappy",
    description: "躲避障碍飞行挑战。",
    icon: "🐤",
    available: false,
  },
  {
    id: "reaction",
    title: "Reaction Test",
    description: "测试你的电竞反应速度。",
    icon: "⚡",
    available: false,
  },
  {
    id: "catch",
    title: "Catch Coins",
    description: "接住掉落的金币和道具。",
    icon: "🪙",
    available: false,
  },
  {
    id: "dodge",
    title: "Dodge Game",
    description: "左右移动躲避障碍物。",
    icon: "🚗",
    available: false,
  },
  {
    id: "lucky",
    title: "Lucky Draw",
    description: "抽取你的今日游戏属性。",
    icon: "🎁",
    available: false,
  },
];

const styles: {
  id: SnakeStyle;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "classic",
    title: "Classic",
    description: "黑色电竞风，白色蛇身，适合现在网站风格。",
    icon: "⚡",
  },
  {
    id: "nokia",
    title: "Nokia",
    description: "复古绿色屏幕，像以前 Nokia 手机里的小游戏。",
    icon: "📟",
  },
  {
    id: "cat",
    title: "Cat Eats Fish",
    description: "猫猫吃鱼版本，后面可以换成 PNG 图案。",
    icon: "🐱",
  },
];

const difficulties: {
  id: SnakeDifficulty;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "invincible",
    title: "Invincible",
    description: "无敌模式，撞墙会穿过去，不容易 Game Over。",
    icon: "🛡️",
  },
  {
    id: "easy",
    title: "Easy",
    description: "简单模式，速度比较慢，适合轻松玩。",
    icon: "🎮",
  },
  {
    id: "hard",
    title: "Hard",
    description: "困难模式，速度更快，分数越高越刺激。",
    icon: "🔥",
  },
];

export default function GameCenter() {
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<SnakeStyle>("classic");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<SnakeDifficulty>("easy");
  const [gameStarted, setGameStarted] = useState(false);

  function backToGameCenter() {
    setSelectedGame(null);
    setGameStarted(false);
  }

  function backToSnakeSetup() {
    setGameStarted(false);
  }

  if (selectedGame === "snake" && gameStarted) {
    return (
      <main className="min-h-screen bg-black text-white px-6 pt-28 pb-12">
        <section className="max-w-6xl mx-auto">
          <SnakeGame
            snakeStyle={selectedStyle}
            difficulty={selectedDifficulty}
            onBack={backToSnakeSetup}
          />
        </section>
      </main>
    );
  }

  if (selectedGame === "snake") {
    return (
      <main className="min-h-screen bg-black text-white px-6 pt-28 pb-12">
        <section className="max-w-6xl mx-auto">
          <button
            onClick={backToGameCenter}
            className="text-sm text-zinc-500 hover:text-white transition mb-6"
          >
            ← Back to Mini Game Center
          </button>

          <div className="text-center mb-10">
            <p className="text-sm text-zinc-500 mb-2">Snake Challenge</p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Choose Your Snake Mode
            </h1>

            <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
              选择你想玩的贪吃蛇风格和难度。之后还可以继续加更多模式和图片素材。
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-2xl font-black mb-5">Choose Style</h2>

                <div className="grid md:grid-cols-3 gap-4">
                  {styles.map((style) => {
                    const active = selectedStyle === style.id;

                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`text-left rounded-3xl border p-5 transition ${
                          active
                            ? "bg-white text-black border-white"
                            : "bg-black text-white border-zinc-800 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="text-4xl mb-4">{style.icon}</div>

                        <div className="font-black text-lg">
                          {style.title}
                        </div>

                        <p
                          className={`text-sm mt-2 ${
                            active ? "text-zinc-700" : "text-zinc-500"
                          }`}
                        >
                          {style.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-2xl font-black mb-5">Choose Difficulty</h2>

                <div className="grid md:grid-cols-3 gap-4">
                  {difficulties.map((difficulty) => {
                    const active = selectedDifficulty === difficulty.id;

                    return (
                      <button
                        key={difficulty.id}
                        onClick={() => setSelectedDifficulty(difficulty.id)}
                        className={`text-left rounded-3xl border p-5 transition ${
                          active
                            ? "bg-white text-black border-white"
                            : "bg-black text-white border-zinc-800 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="text-4xl mb-4">
                          {difficulty.icon}
                        </div>

                        <div className="font-black text-lg">
                          {difficulty.title}
                        </div>

                        <p
                          className={`text-sm mt-2 ${
                            active ? "text-zinc-700" : "text-zinc-500"
                          }`}
                        >
                          {difficulty.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl sticky top-28">
              <h2 className="text-2xl font-black mb-4">Ready?</h2>

              <div className="space-y-3 mb-6">
                <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Game</div>
                  <div className="font-bold">Snake Challenge</div>
                </div>

                <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Style</div>
                  <div className="font-bold">
                    {selectedStyle === "classic" && "Classic"}
                    {selectedStyle === "nokia" && "Nokia"}
                    {selectedStyle === "cat" && "Cat Eats Fish"}
                  </div>
                </div>

                <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Difficulty</div>
                  <div className="font-bold">
                    {selectedDifficulty === "invincible" && "Invincible"}
                    {selectedDifficulty === "easy" && "Easy"}
                    {selectedDifficulty === "hard" && "Hard"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setGameStarted(true)}
                className="w-full px-5 py-4 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition"
              >
                Start Game
              </button>

              <p className="text-sm text-zinc-500 mt-5 leading-relaxed">
                图片素材之后再放也可以。现在 Classic / Nokia / Cat 都先用颜色和
                emoji 做出来。
              </p>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 pt-28 pb-12">
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm text-zinc-500 mb-2">Mini Game Center</p>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            XiaoJuJun Game Zone
          </h1>

          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
            这里会放不同类型的小游戏。现在先开放 Snake Challenge，
            其他小游戏之后可以慢慢加。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => {
            return (
              <button
                key={game.id}
                onClick={() => {
                  if (!game.available) return;
                  setSelectedGame(game.id);
                }}
                disabled={!game.available}
                className={`group relative min-h-[190px] rounded-3xl border p-6 text-left transition overflow-hidden ${
                  game.available
                    ? "bg-zinc-950 border-zinc-800 hover:bg-white hover:text-black hover:border-white hover:-translate-y-1"
                    : "bg-zinc-950/50 border-zinc-900 text-zinc-600 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl ${
                      game.available
                        ? "bg-white text-black group-hover:bg-black group-hover:text-white"
                        : "bg-zinc-900 text-zinc-600"
                    }`}
                  >
                    {game.icon}
                  </div>

                  {game.available ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 group-hover:bg-black group-hover:text-white group-hover:border-black">
                      Play
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-zinc-900 text-zinc-600 border border-zinc-800">
                      Coming Soon
                    </span>
                  )}
                </div>

                <div className="font-black text-xl mb-2">{game.title}</div>

                <p
                  className={`text-sm leading-relaxed ${
                    game.available
                      ? "text-zinc-500 group-hover:text-zinc-700"
                      : "text-zinc-700"
                  }`}
                >
                  {game.description}
                </p>

                {game.available && (
                  <div className="absolute bottom-5 right-5 text-sm font-bold opacity-0 group-hover:opacity-100 transition">
                    Start →
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}