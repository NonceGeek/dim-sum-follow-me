import type { Metadata } from "next";
import categoryJingdiantaici from "@/data/categoryJingdiantaici";

export const metadata: Metadata = {
  title: "经典台词跟读大赛 | 线下版",
  description: "经典粤片，你睇过；经典台词，来试下？",
};

const COLORS = {
  cream: "#FDF1D8",
  creamDeep: "#F9E3B4",
  yellow: "#F2BE4E",
  red: "#C0442B",
  redDark: "#8E2B1A",
  brown: "#5A2A1A",
  titleFill: "#FFF4DA",
};

const STEPS = [
  { title: "扫码进入", text: "手机扫右下角二维码" },
  { title: "选部电影", text: "揀一部你最钟意嘅粤片" },
  { title: "听一句", text: "睇清台词与建议情感" },
  { title: "跟一句", text: "入戏演绎，即时出分" },
];

const FEATURES = ["经典粤语台词", "即时跟读评分", "情感演绎挑战"];

// Outlined, shadowed title text like the printed poster
const titleStyle: React.CSSProperties = {
  color: COLORS.titleFill,
  letterSpacing: "0.05em",
};

// Old Chrome ignores paint-order on HTML text, so the outline is a separate layer behind the fill
function OutlinedText({ children }: { children: string }) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          color: COLORS.red,
          WebkitTextStroke: `0.5cqw ${COLORS.red}`,
          textShadow: `0 0.45cqw 0 ${COLORS.redDark}`,
        }}
      >
        {children}
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}

// Jagged split on top of a steamed bun, where the 叉烧 filling bursts out
function crackPoints(cx: number, cy: number, r: number): string {
  const radii = [1, 0.72, 0.92, 0.7, 0.98, 0.74, 0.9];
  return radii
    .map((k, i) => {
      const angle = (i / radii.length) * Math.PI * 2;
      return `${(cx + Math.cos(angle) * r * k).toFixed(1)},${(cy + Math.sin(angle) * r * k * 0.55).toFixed(1)}`;
    })
    .join(" ");
}

function ChaSiuBao({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h;
  const k = 0.5523;
  const dome = `M${left} ${cy} C${left} ${cy - h * k} ${cx - (w / 2) * k} ${top} ${cx} ${top} C${cx + (w / 2) * k} ${top} ${right} ${cy - h * k} ${right} ${cy} Q${cx} ${cy + h * 0.22} ${left} ${cy} Z`;
  const crackY = top + h * 0.22;
  const crackR = w * 0.2;
  return (
    <g>
      <ellipse cx={cx} cy={cy + 1} rx={w * 0.5} ry={h * 0.14} fill="#000" opacity="0.18" />
      <path d={dome} fill="url(#csb-dough)" stroke="#D8C4A0" strokeWidth="0.8" />
      <path
        d={`M${left + w * 0.12} ${cy - h * 0.25} Q${cx} ${cy - h * 0.05} ${right - w * 0.12} ${cy - h * 0.25}`}
        fill="none"
        stroke="#E6D6B8"
        strokeWidth="1"
        opacity="0.8"
      />
      <polygon
        points={crackPoints(cx, crackY, crackR)}
        fill="#FFFDF7"
        stroke="#FFFDF7"
        strokeWidth={crackR * 0.45}
        strokeLinejoin="round"
      />
      <polygon
        points={crackPoints(cx, crackY, crackR)}
        fill="url(#csb-filling)"
        stroke="#A92E1C"
        strokeWidth={crackR * 0.2}
        strokeLinejoin="round"
      />
      <circle cx={cx - crackR * 0.25} cy={crackY - crackR * 0.12} r={crackR * 0.16} fill="#E77A5C" opacity="0.85" />
      <circle cx={cx + crackR * 0.3} cy={crackY + crackR * 0.08} r={crackR * 0.1} fill="#5E160D" />
      <ellipse cx={cx - w * 0.22} cy={cy - h * 0.62} rx={w * 0.09} ry={h * 0.14} fill="#fff" opacity="0.7" />
    </g>
  );
}

function Steamer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 160 120" className={className} style={style} role="img" aria-label="一笼叉烧包">
      <defs>
        <radialGradient id="csb-dough" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FBF4E6" />
          <stop offset="100%" stopColor="#E9DBC0" />
        </radialGradient>
        <radialGradient id="csb-filling" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#D9533A" />
          <stop offset="65%" stopColor="#A92E1C" />
          <stop offset="100%" stopColor="#6E1A10" />
        </radialGradient>
        <linearGradient id="csb-bamboo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B07434" />
          <stop offset="30%" stopColor="#DDAA62" />
          <stop offset="70%" stopColor="#D49B52" />
          <stop offset="100%" stopColor="#9C6229" />
        </linearGradient>
        <linearGradient id="csb-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1CB86" />
          <stop offset="100%" stopColor="#C98C45" />
        </linearGradient>
      </defs>

      {/* steam */}
      <g fill="none" stroke="#C9A877" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M58 24 q-6 -7 0 -13 q6 -6 0 -12" />
        <path d="M82 18 q-6 -7 0 -13 q6 -6 0 -12" />
        <path d="M106 24 q-6 -7 0 -13 q6 -6 0 -12" />
      </g>

      {/* shadow under the basket */}
      <ellipse cx="80" cy="104" rx="72" ry="12" fill="#5A2A1A" opacity="0.18" />

      {/* bamboo side band with lashing */}
      <path d="M10 66 L10 94 A70 18 0 0 0 150 94 L150 66 A70 18 0 0 1 10 66 Z" fill="url(#csb-bamboo)" stroke="#7A4A1E" strokeWidth="1.5" />
      <path d="M10 76 A70 18 0 0 0 150 76" fill="none" stroke="#8A5524" strokeWidth="1" opacity="0.6" />
      <path d="M10 86 A70 18 0 0 0 150 86" fill="none" stroke="#8A5524" strokeWidth="1" opacity="0.6" />
      {[30, 55, 80, 105, 130].map((x) => (
        <rect key={x} x={x - 2} y={x === 80 ? 82 : 79} width="4" height="12" rx="1" fill="#7A4A1E" opacity="0.55" />
      ))}

      {/* rim and paper-lined interior */}
      <ellipse cx="80" cy="66" rx="70" ry="18" fill="url(#csb-rim)" stroke="#7A4A1E" strokeWidth="1.5" />
      <ellipse cx="80" cy="66" rx="62" ry="14" fill="#8C5A2B" />
      <ellipse cx="80" cy="67" rx="59" ry="12.5" fill="#F2E4C2" />

      {/* buns: back row, then front */}
      <ChaSiuBao cx={52} cy={63} w={48} h={27} />
      <ChaSiuBao cx={108} cy={63} w={48} h={27} />
      <ChaSiuBao cx={80} cy={75} w={54} h={30} />

      {/* front lip of the rim overlaps the buns */}
      <path d="M10 66 A70 18 0 0 0 150 66 L142 66 A62 14 0 0 1 18 66 Z" fill="url(#csb-rim)" />
      <path d="M10 66 A70 18 0 0 0 150 66" fill="none" stroke="#7A4A1E" strokeWidth="1.5" />
      <path d="M18 66 A62 14 0 0 0 142 66" fill="none" stroke="#8C5A2B" strokeWidth="1" />
    </svg>
  );
}

export default function PostPage() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: COLORS.yellow, fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}
    >
      {/* 16:9 stage that scales to fit a 55-inch TV (1920×1080 / 3840×2160) */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          aspectRatio: "16 / 9",
          background: COLORS.cream,
          containerType: "size",
          color: COLORS.brown,
        }}
      >
        {/* checkered top band */}
        {/* <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "6cqh",
            backgroundImage: `repeating-conic-gradient(${COLORS.yellow} 0 25%, ${COLORS.creamDeep} 0 50%)`,
            backgroundSize: "3.4cqh 3.4cqh",
          }}
        /> */}
        {/* soft background blobs */}
        <div
          className="absolute rounded-full"
          style={{ width: "42cqw", height: "42cqw", right: "-12cqw", top: "-14cqw", background: COLORS.creamDeep }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: "34cqw", height: "34cqw", left: "-14cqw", bottom: "-16cqw", background: COLORS.creamDeep }}
        />

        <div className="relative flex min-h-0 flex-1" style={{ padding: "8cqh 3.5cqw 2cqh", gap: "3cqw" }}>
          {/* Left: title, tagline, how to play */}
          <div className="flex flex-col" style={{ width: "40%" }}>
            <div className="relative">
              
              {/* <Steamer
                className="absolute"
                style={{ width: "9.5cqw", left: "-1.2cqw", top: "-2.2cqw", transform: "rotate(-6deg)" }}
              /> */}
              <img
                src="/logos/logo_dim_sum.png"
                alt="点心跟住读"
                className="absolute"
                style={{
                  width: "7cqw",
                  height: "7cqw",
                  left: "0",
                  top: "-1cqw",
                  transform: "rotate(-6deg)",
                  mixBlendMode: "multiply",
                }}
              />
              <h1 className="font-black leading-none" style={{ ...titleStyle, fontSize: "5.4cqw", paddingLeft: "8cqw" }}>
                <OutlinedText>经典台词</OutlinedText>
              </h1>
              <h1 className="font-black leading-none" style={{ ...titleStyle, fontSize: "5.4cqw", marginTop: "0.8cqw" }}>
                <OutlinedText>跟读大赛</OutlinedText>
              </h1>
            </div>

            <div
              className="self-start rounded-full font-bold text-white"
              style={{
                background: COLORS.red,
                fontSize: "1.7cqw",
                padding: "0.6cqw 2cqw",
                marginTop: "1.4cqw",
                boxShadow: `0 0.3cqw 0 ${COLORS.redDark}`,
              }}
            >
              线下版 · 高交会现场挑战
            </div>

            <p className="font-bold" style={{ fontSize: "2.1cqw", marginTop: "1.4cqw", lineHeight: 1.4 }}>
              经典粤片，你睇过；
              <br />
              经典台词，来试下？
            </p>

            <div className="grid grid-cols-2" style={{ gap: "0.8cqw", marginTop: "1.4cqw" }}>
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="flex items-center rounded-2xl"
                  style={{ background: "#FFF9EC", border: `0.15cqw solid ${COLORS.red}`, padding: "0.9cqw", gap: "0.8cqw" }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full font-black text-white"
                    style={{ background: COLORS.red, width: "2.6cqw", height: "2.6cqw", fontSize: "1.5cqw" }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-black" style={{ fontSize: "1.45cqw", color: COLORS.red }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: "1.05cqw" }}>{step.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: "0.6cqw", marginTop: "1.2cqw" }}>
              {FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="whitespace-nowrap rounded-full font-bold text-white"
                  style={{ background: COLORS.red, fontSize: "1.05cqw", padding: "0.35cqw 0.9cqw" }}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Right: films and lines, QR code */}
          <div className="flex min-h-0 flex-1 flex-col" style={{ gap: "1.2cqw" }}>
            <div className="grid min-h-0 flex-1 grid-cols-2" style={{ gap: "1.2cqw" }}>
              {categoryJingdiantaici.map((film) => (
                <div
                  key={film.key}
                  className="flex flex-col rounded-3xl"
                  style={{
                    background: "#FFF9EC",
                    border: `0.2cqw solid ${COLORS.red}`,
                    boxShadow: `0 0.35cqw 0 ${COLORS.red}`,
                    padding: "1cqw 1.3cqw",
                  }}
                >
                  <div className="font-black" style={{ fontSize: "1.8cqw", color: COLORS.red }}>
                    《{film.name}》
                  </div>
                  <ul className="flex flex-col" style={{ gap: "0.5cqw", marginTop: "0.5cqw" }}>
                    {film.questions.map((q) => (
                      <li key={q.originalText} className="flex items-baseline justify-between" style={{ gap: "0.8cqw" }}>
                        <span className="font-bold" style={{ fontSize: "1.45cqw", lineHeight: 1.35 }}>
                          {q.originalText}
                        </span>
                        {q.style && (
                          <span
                            className="shrink-0 rounded-full font-bold"
                            style={{
                              background: COLORS.yellow,
                              color: COLORS.brown,
                              fontSize: "1.05cqw",
                              padding: "0.15cqw 0.8cqw",
                            }}
                          >
                            {q.style}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* QR code card fills the last grid slot */}
              <div
                className="flex items-center rounded-3xl"
                style={{ background: COLORS.red, padding: "1.2cqw", gap: "1.2cqw" }}
              >
                <img
                  src="/logos/qr-code.png"
                  alt="扫码试玩 点心跟住读"
                  className="rounded-xl bg-white"
                  style={{ width: "9cqw", height: "9cqw", padding: "0.4cqw" }}
                />
                <div className="text-white">
                  <div className="font-black" style={{ fontSize: "2cqw" }}>
                    扫码即玩
                  </div>
                  <div style={{ fontSize: "1.15cqw", marginTop: "0.4cqw", lineHeight: 1.45 }}>
                    选「经典台词跟读大赛」
                    <br />
                    揀部电影，即刻开演！
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer band */}
        <div
          className="relative flex items-center justify-between"
          style={{ background: COLORS.yellow, padding: "1.3cqw 3.5cqw" }}
        >
          <div className="font-black" style={{ fontSize: "1.6cqw" }}>
            点心跟住读 —— 「让语言学习回归模仿的本质」
          </div>
          <div className="text-right" style={{ fontSize: "1cqw", lineHeight: 1.5 }}>
            主办：
            <br />
            粤语语料库建设与大模型评测广州市哲学社会科学重点实验室
          </div>
        </div>
      </div>
    </div>
  );
}
