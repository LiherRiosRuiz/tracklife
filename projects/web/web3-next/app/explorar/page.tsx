"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type FeedPost } from "@/lib/api";
import { FeedList } from "@/components/FeedList";

export default function ExplorarPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    api.feed().then((r) => setPosts(r.feed.slice(0, 10))).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-accent">TRACKLIFE</h1>
        <Link href="/registro" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">
          Únete gratis
        </Link>
      </div>
      <h2 className="mb-4 text-lg font-semibold">Explora la comunidad</h2>
      <FeedList posts={posts} showKudos={false} />
    </div>
  );
}
