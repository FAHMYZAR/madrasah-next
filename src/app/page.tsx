import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h1 className="text-4xl font-bold leading-tight">
            Tempat Terbaik untuk Belajar,
            <br />
            <span className="text-emerald-600">Berkembang, dan Berprestasi</span>
          </h1>
          <p className="text-gray-600 mt-4 max-w-2xl">
            Dengan lingkungan belajar yang nyaman dan program akademik yang unggul, kami membantu setiap siswa mencapai potensi terbaiknya.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/login" className="px-5 py-3 rounded-md bg-gray-900 text-white">Masuk Admin</Link>
            <Link href="/admin" className="px-5 py-3 rounded-md border border-gray-300 bg-white">Dashboard</Link>
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 border-y border-emerald-100">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-xl bg-white p-6 border border-emerald-100">
            <h2 className="text-2xl font-semibold">Seberapa Jauh Kamu Menguasai Materi?</h2>
            <p className="text-gray-600 mt-3">
              Asah pemahamanmu dengan kuis berbasis kurikulum. Jawab pertanyaan, lihat hasil langsung, dan tingkatkan kemampuanmu.
            </p>
            <button className="mt-5 px-4 py-2 rounded-md bg-emerald-600 text-white">Coba Sekarang</button>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-6 text-gray-500 text-center">Quiz Illustration Placeholder</div>
        </div>
      </section>
    </main>
  );
}
