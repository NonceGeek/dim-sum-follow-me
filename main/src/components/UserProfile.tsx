"use client";
import { useEffect, useState } from "react";
import classNames from "classnames";

const AVATAR_STORAGE_KEY = "shadowing_avatar";
const AVATARS = Array.from({ length: 7 }, (_, i) => `/avatars/avatar_${i}.gif`);

function pickRandomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

const UserProfile = ({ className }: { className?: string }) => {
  const [avatarSrc, setAvatarSrc] = useState(AVATARS[0]);

  useEffect(() => {
    const saved = sessionStorage.getItem(AVATAR_STORAGE_KEY);
    if (saved && AVATARS.includes(saved)) {
      setAvatarSrc(saved);
      return;
    }
    const picked = pickRandomAvatar();
    sessionStorage.setItem(AVATAR_STORAGE_KEY, picked);
    setAvatarSrc(picked);
  }, []);

  return (
    <div
      className={classNames(
        "user-profile-wrapper flex mx-5 py-4 items-center",
        className
      )}
    >
      <div
        id="avator"
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper ring-2 ring-ink/70"
      >
        <img
          src={avatarSrc}
          alt="User avatar"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="ml-3 whitespace-nowrap font-script text-base font-bold text-ink sm:text-lg">
        你好，探险家❤️!
      </div>
    </div>
  );
};

export default UserProfile;
