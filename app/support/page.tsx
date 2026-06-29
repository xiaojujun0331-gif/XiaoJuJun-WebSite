const koFiLink = "https://ko-fi.com/xiaojujun";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-28 px-6 pb-20">
      <section className="max-w-4xl mx-auto">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 md:p-12 shadow-2xl">
          <p className="text-sm text-zinc-500 mb-3">Support XiaoJuJun</p>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Buy Me a Coffee ☕
          </h1>

          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl mb-6">
            If you enjoy my streams, cosplay, gaming content, or future
            projects, you can support me with a small coffee.
          </p>

          <p className="text-zinc-400 leading-relaxed max-w-2xl mb-8">
            Your support helps me keep creating more content, improving my
            setup, and bringing more fun ideas to life.
          </p>

          <a
            href={koFiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-black font-black hover:bg-zinc-200 transition"
          >
            Buy Me a Coffee ☕
          </a>

          <div className="mt-10 rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-sm text-zinc-500 leading-relaxed">
              This is a voluntary tip to support the creator. It is not a
              charity donation, investment, purchase, or guaranteed service.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}