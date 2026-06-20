const galleryItems = [
  {
    title: "钱包空空的一天",
    image: "/Photo1.png",
  },
  {
    title: "路线计划",
    image: "/Photo2.png",
  },
  {
    title: "Look in my eyes",
    image: "/Photo3.png",
  },
];

export default function Gallery() {
  return (
    <section className="py-24 bg-black text-white">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold mb-4">
          Gallery
        </h2>

        <p className="text-gray-400 mb-10">
          A collection of my esports, cosplay, and content creation moments.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.title}
              className="
                relative
                group
                overflow-hidden
                rounded-2xl
                border
                border-zinc-800
              "
            >
              <img
                src={item.image}
                alt={item.title}
                className="
                  w-full
                  h-80
                  object-cover
                  transition-all
                  duration-500
                  group-hover:scale-110
                "
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-black/70
                  opacity-0
                  group-hover:opacity-100
                  transition-all
                  duration-300
                  flex
                  items-center
                  justify-center
                "
              >
                <h3 className="text-2xl font-bold text-white">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}