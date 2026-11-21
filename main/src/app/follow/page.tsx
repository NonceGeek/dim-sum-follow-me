"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import Category from "@/components/Category";
import UserProfile from "@/components/UserProfile";
import FollowItemView from "@/components/FollowItemView";
import {
  fetchCorpusItem,
  transformCorpusItemToQuestion,
} from "@/utils/corpusItem";

/*
  EXAMPLE URL:
  http://localhost:3002/follow?uuid=29b4b051-d865-4878-8ae7-1de3960fe0ee
*/

function FollowPageContent() {
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid");
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!!uuid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid) return;
    fetchCorpusItem(uuid)
      .then(setItem)
      .catch((err) => {
        setError(err?.message || "加载失败");
      })
      .finally(() => setLoading(false));
  }, [uuid]);

  if (uuid) {
    if (loading) return <div className="p-8 text-center">加载中…</div>;
    if (error) return <div className="p-8 text-center text-red">{error}</div>;
    if (item) {
      const question = transformCorpusItemToQuestion(item);
      return (
        <div className="">
          <UserProfile />
          <FollowItemView questions={[question]} />
          <Footer />
        </div>
      );
    }
  }

  return (
    <div className="">
      <UserProfile />
      <p className="mt-5 ml-8 font-script text-xl font-bold text-ink">请选择场景并开始跟读！</p>
      <Category />
      <Footer />
    </div>
  );
}

export default function FollowPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">加载中…</div>}>
      <FollowPageContent />
    </Suspense>
  );
}
