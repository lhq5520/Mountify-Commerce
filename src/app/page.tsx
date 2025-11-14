import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-4">Welcome to My Shop</h1>
      <p className="text-gray-600 mb-6">Explore our products</p>

      <Link
        href="/products"
        className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
      >
        View Products
      </Link>
    </main>
  );
}
