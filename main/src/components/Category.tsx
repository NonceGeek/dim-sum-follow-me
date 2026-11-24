"use client";
import { useState } from "react";
import category from "@/data/category";
import categoryGfxm from "@/data/categoryGfxm";
import { categoryGushiji } from "@/data/categoryShilizi";
import categoryJingdiantaici from "@/data/categoryJingdiantaici";
import { useRouter } from "next/navigation";
import { useQuestionStore } from "@/stores/questionStore";
import classNames from "classnames";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    corpusId === "jingdiantaici"
      ? categoryJingdiantaici
      : corpusId === "gfxm1"
        ? categoryGfxm
        : corpusId === "gushiji"
          ? categoryGushiji
          : category;

  const start: any = (item: CategoryItem) => {
    setQuestions(item.questions as []);
    router.push("/game/" + item?.key);
  };

  const selectCard = (index: number) => {
    setActivedCard(index);
  };
  return (
    <RadioGroup
      value={String(activedCard)}
      onValueChange={(value) => selectCard(Number(value))}
      className="catergory-container mx-2 mt-4 flex flex-col gap-4 px-2 py-3 sm:mx-6"
      aria-label="选择子合集"
    >
      {categories.map((item, index) => (
        <Paper
          key={index}
          seed={`category-${item.key}`}
          stock={index === activedCard ? "sticky-yellow" : "card"}
          className={classNames("w-full cursor-pointer p-4", {
            "duration-400": index === activedCard,
          })}
          onClick={() => selectCard(index)}
        >
          {index === activedCard ? (
            // actived card
            <div className="w-full">
              <div className="flex items-start gap-4">
                <RadioGroupItem
                  value={String(index)}
                  id={`category-${index}`}
                  className="mt-1.5"
                />
                <div>
                  <label htmlFor={`category-${index}`} className="text-lg font-bold">
                    {item.name}
                  </label>
                  <div className="text-ink-soft">{`共有${item.questions.length || 0}句常用语句`}</div>
                </div>
              </div>
              <div className="text-end">
                <Button onClick={() => start(item, index)}>开始</Button>
              </div>
            </div>
          ) : (
            // inactived card
            <div className="flex items-start gap-4">
              <RadioGroupItem
                value={String(index)}
                id={`category-${index}`}
                className="mt-1.5"
              />
              <label htmlFor={`category-${index}`} className="cursor-pointer text-lg">
                {item.name}
              </label>
            </div>
          )}
        </Paper>
      ))}
    </RadioGroup>
  );
}
