const images = [
  "/Photo1.png",
  "/Photo2.png",
  "/Photo3.png",
  "/Photo4.png",
  "/Photo5.png",
  "/Photo6.png",
  "/Photo7.png",
  "/Photo8.png",
  "/Photo9.png",
  "/Photo10.png",
  "/Photo11.png",
  "/Photo12.png",
];

export default function WorksPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-10">我的作品</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image}
              className="rounded-2xl overflow-hidden border border-zinc-800"
            >
              <img
                src={image}
                alt="My work"
                className="w-full h-80 object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}