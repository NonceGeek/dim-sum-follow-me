"use client";
import { useState } from "react";
import category from "@/data/category";
import categoryGfxm from "@/data/category_gfxm";
import categoryShilizi from "@/data/category_shilizi";
import { useRouter } from "next/navigation";
import { useQuestionStore } from "@/stores/questionStore";
import classNames from "classnames";

type CategoryItem = {
  key: string | number;
  name: string;
  questions: unknown[];
};

export default function Category({
  params,
  corpusId = "wanjui",
}: {
  params?: any;
  corpusId?: string;
}) {
  const { setQuestions } = useQuestionStore();
  const [activedCard, setActivedCard] = useState(0);
  const router = useRouter();

  const categories: CategoryItem[] =
    corpusId === "gfxm1"
      ? [categoryGfxm.gfxm1]
      : corpusId === "shi-li-zhi"
        ? categoryShilizi
        : category;

  const start: any = (item: CategoryItem) => {
    setQuestions(item.questions as []);
    router.push("/game/" + item?.key);
  };

  const selectCard = (index: number) => {
    setActivedCard(index);
  };
  return (
    <div className="m-4 catergory-container">
      {categories.map((item, index) => (
        <div
          key={index}
          className={classNames("flex mt-2 p-4 w-full border-3 rounded-2xl", {
            "border-green-200": index === activedCard,
          })}
          onClick={() => selectCard(index)}
        >
          {index === activedCard ? (
            // actived card
            <div className="w-full duration-400">
              <div className="flex">
                <div className="circle-container">
                  <div className="outer-circle"></div>
                  <div className="inner-circle-active"></div>
                </div>
                <div className="pl-4">
                  <p>{item.name}</p>
                  <div>{`共有${item.questions.length || 0}句常用语句`}</div>
                </div>
              </div>
              <div className="text-end">
                <button
                  className="border-2 px-3 py-1 rounded-2xl border-green-200 text-green-200"
                  onClick={() => start(item, index)}
                >
                  开始
                </button>
              </div>
            </div>
          ) : (
            // inactived card
            <div className="flex">
              <div className="circle-container">
                <div className="outer-circle"></div>
                <div className="inner-circle-inactive"></div>
              </div>
              <div className="pl-4">
                <p>{item.name}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
