import React, { useEffect, useState } from "react";

const CelebrationEffect = ({ type, message = "恭喜你！" }: any) => {
  const [active, setActive] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [balloons, setBalloons] = useState([]);
  const [fireworks, setFireworks] = useState([]);
  const [showText, setShowText] = useState(false);

  // 重置所有特效
  const resetEffects = () => {
    setConfetti([]);
    setBalloons([]);
    setFireworks([]);
    setShowText(false);
  };

  // 当特效类型变化时触发
  useEffect(() => {
    if (!type) return;

    setActive(true);
    resetEffects();

    // 根据类型生成特效
    if (type === "confetti" || type === "all") {
      generateConfetti();
    }

    if (type === "balloons" || type === "all") {
      generateBalloons();
    }

    if (type === "fireworks" || type === "all") {
      generateFireworks();
    }

    if (type === "text" || type === "all") {
      setShowText(true);
    }

    // 5秒后关闭特效
    const timer = setTimeout(() => {
      setActive(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [type]);

  // 生成彩带
  const generateConfetti = () => {
    const confettiCount = 150;
    const colors = [
      "bg-red-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
    ];

    const newConfetti: any = Array.from({ length: confettiCount }).map(
      (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        size: `${Math.random() * 10 + 5}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: `${Math.random() * 3 + 2}s`,
      })
    );

    setConfetti(newConfetti);
  };

  // 生成气球
  const generateBalloons = () => {
    const balloonCount = 20;
    const colors = [
      "bg-red-400",
      "bg-yellow-300",
      "bg-green-300",
      "bg-blue-300",
      "bg-purple-300",
      "bg-pink-300",
    ];

    const newBalloons: any = Array.from({ length: balloonCount }).map(
      (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        size: `${Math.random() * 40 + 30}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: `${Math.random() * 5 + 8}s`,
      })
    );

    setBalloons(newBalloons);
  };

  // 生成烟花
  const generateFireworks = () => {
    const fireworkCount = 5;
    const positions = [
      { left: "20%", top: "30%" },
      { left: "50%", top: "40%" },
      { left: "80%", top: "30%" },
      { left: "30%", top: "60%" },
      { left: "70%", top: "60%" },
    ];

    const newFireworks: any = Array.from({ length: fireworkCount }).map(
      (_, i) => ({
        id: i,
        ...positions[i],
        animationDelay: `${i * 0.5}s`,
        size: `${Math.random() * 100 + 150}px`,
      })
    );

    setFireworks(newFireworks);
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 彩带特效 */}
      {confetti.map((conf: any) => (
        <div
          key={conf.id}
          className={`absolute rounded-sm ${conf.color}`}
          style={{
            left: conf.left,
            top: "-20px",
            width: conf.size,
            height: conf.size,
            animation: `fall ${conf.duration} linear ${conf.animationDelay} forwards`,
            opacity: 0.8,
          }}
        />
      ))}

      {/* 气球特效 */}
      {balloons.map((balloon: any) => (
        <div
          key={balloon.id}
          className={`absolute rounded-full ${balloon.color}`}
          style={{
            left: balloon.left,
            bottom: "-50px",
            width: balloon.size,
            height: `calc(${balloon.size} * 1.2)`,
            animation: `floatUp ${balloon.duration} ease-in ${balloon.animationDelay} forwards`,
            opacity: 0.9,
            borderBottomLeftRadius: "50%",
            borderBottomRightRadius: "50%",
          }}
        />
      ))}

      {/* 烟花特效 */}
      {fireworks.map((fw: any) => (
        <div
          key={fw.id}
          className="absolute"
          style={{
            left: fw.left,
            top: fw.top,
            width: fw.size,
            height: fw.size,
            animation: `explode 1s ease-out ${fw.animationDelay} forwards`,
            opacity: 0,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-yellow-300"
              style={{
                left: "50%",
                top: "50%",
                transform: `rotate(${i * 30}deg) translateX(20px)`,
                animation: `fireworkTrail 0.5s ease-out ${fw.animationDelay} forwards`,
              }}
            />
          ))}
        </div>
      ))}

      {/* 文字特效 */}
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2
              className="font-script text-5xl md:text-7xl font-bold mb-4 tracking-wide text-marker"
              style={{
                animation:
                  "textPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
                textShadow: "0 0 20px rgba(248, 245, 238, 0.9)",
                transform: "scale(0)",
                opacity: 0,
              }}
            >
              {message}
            </h2>
            <div
              className="text-4xl"
              style={{
                animation: "fadeInStars 1s ease 0.5s forwards",
                opacity: 0,
              }}
            >
              {"✨".repeat(8)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CelebrationEffect;
