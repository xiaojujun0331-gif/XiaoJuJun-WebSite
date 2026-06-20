export default function About() {
  return (
    <section className="py-24 bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6">
        
        <h2 className="text-4xl font-bold mb-8">
          About Me
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-center">

          <div>
            <img
              src="/profile.jpg"
              alt="Profile"
              className="rounded-2xl w-full"
            />
          </div>

          <div>
            <p className="text-gray-300 leading-8">
              Hi, I'm XiaoJujuN.
              I'm passionate about esports, content creation,
              and building my own personal brand online.
            </p>

            <p className="text-gray-300 leading-8 mt-4">
              I enjoy watching competitive games,
              creating entertaining content,
              and sharing my journey with the community.
            </p>

            <div className="flex gap-4 mt-8">

              <div className="bg-zinc-900 p-4 rounded-xl">
                🎮 Esports
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl">
                🎥 Content Creator
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl">
                🎭 Cosplay
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}