import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-black text-white border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        <h1 className="font-bold text-xl">
          XiaoJujuN
        </h1>

        <div className="flex gap-6">
          <Link href="/">Home</Link>
          <Link href="/works">作品</Link>
          <Link href="/contact">Contact</Link>
        </div>

      </div>
    </nav>
  );
}