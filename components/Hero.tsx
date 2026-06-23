import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="max-w-4xl text-center -mt-42">
        <p className="text-blue-400 text-lg mb-4">
          Esports • Cosplay • Content Creator
        </p>

        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          XiaoJujun
        </h1>

        <p className="text-gray-300 text-lg md:text-xl mb-8">
          一个专注于电竞观赛、CSGO内容、Cosplay形象与个人IP打造的创作者网站。
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/works"
            className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black px-6 py-3 rounded-full font-semibold"
            >
              查看作品
          </Link>

          <Link
            href="/contact"
            className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black px-6 py-3 rounded-full font-semibold"
            >
              联系我
            </Link>

          <Link
            href="https://www.youtube.com/@%E5%B0%8F%E7%8B%99%E5%90%9B"
            className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black px-6 py-3 rounded-full font-semibold"
            >
              YouTube 主页
            </Link>

            <Link
            href="https://www.tiktok.com/@xiaojujunfps"
            className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black px-6 py-3 rounded-full font-semibold"
            >
              TikTok 主页
            </Link>
        </div>
      </div>
    </section>
  );
}