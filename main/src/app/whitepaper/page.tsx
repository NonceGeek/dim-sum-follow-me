import type { ReactNode } from "react";
import fs from "fs";
import path from "path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { headingAnchorId, headingText } from "@/utils/headingAnchor";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";

function headingWithAnchor(
  Tag: "h1" | "h2" | "h3",
  className: string,
  { children }: { children?: ReactNode },
) {
  const text = headingText(children);
  const id = headingAnchorId(text);

  return (
    <Tag id={id} className={`${className} whitepaper-heading-anchor`}>
      <a href={`#${id}`} className="whitepaper-heading-link" aria-label={`链接到：${text}`}>
        {children}
      </a>
    </Tag>
  );
}

const markdownComponents: Components = {
  h1: (props) => headingWithAnchor("h1", "whitepaper-title", props),
  h2: (props) => headingWithAnchor("h2", "", props),
  h3: (props) => headingWithAnchor("h3", "", props),
  a: ({ href, children }) => {
    if (href?.startsWith("#")) {
      return (
        <a
          href={href}
          className="text-link underline decoration-marker/60 underline-offset-2 hover:text-link-hover"
        >
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link underline decoration-marker/60 underline-offset-2 hover:text-link-hover"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string") return null;
    const resolvedSrc = src.startsWith("./") ? `/${src.slice(2)}` : src;
    const isQr = alt === "my_qr" || resolvedSrc.includes("my_qr");
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt ?? ""}
        className={
          isQr
            ? "my-4 w-full max-w-[170px] rounded-sm border border-pencil-mark"
            : "my-4 w-full max-w-lg rounded-sm border border-pencil-mark"
        }
      />
    );
  },
};

export default function WhitepaperPage() {
  const filePath = path.join(process.cwd(), "public", "whitepaper.md");
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="pb-12">
      <div className="mx-5 py-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">{"<返回"}</Link>
        </Button>
      </div>
      <Paper
        as="article"
        stock="paper"
        tape="both"
        tilt={false}
        className="whitepaper-content mx-4 max-w-3xl px-5 py-8 sm:mx-6 sm:px-10 md:mx-auto"
      >
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </Paper>
    </div>
  );
}
