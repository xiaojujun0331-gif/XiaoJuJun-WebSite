import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-tight text-white">
          XiaoJuJun
        </Link>

        <div className="flex items-center gap-5 text-sm font-medium">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition"
          >
            Home
          </Link>

          <Link
            href="/works"
            className="text-zinc-400 hover:text-white transition"
          >
            Works
          </Link>

          <Link
            href="/game"
            className="text-zinc-400 hover:text-white transition"
          >
            Game
          </Link>

          <Link
            href="/contact"
            className="text-zinc-400 hover:text-white transition"
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}