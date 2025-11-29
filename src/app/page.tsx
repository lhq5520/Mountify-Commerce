import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-600">
            Welcome to Mountify
          </span>
        </h1>

        <p className="text-gray-600 text-lg mb-10">
          Discover Premium Products Crafted with Quality and Passion.
        </p>

        <Link
          href="/products"
          className="inline-block px-8 py-3 rounded-xl bg-black text-white font-medium text-lg shadow-lg hover:shadow-xl hover:bg-gray-800 transition-all duration-200"
        >
          Browse Products →
        </Link>
      </div>

      <div className="mt-16 w-full max-w-md h-1 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 rounded-full opacity-50" />
    </main>
  );
}
