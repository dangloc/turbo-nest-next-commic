"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    icon: "😀",
    label: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘",
      "😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏",
      "😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤",
      "😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭",
      "🤫","🤥","😶","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😵",
    ],
  },
  {
    icon: "👍",
    label: "Hands",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️",
      "✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","💪","🦾","🖐️",
      "✋","🤚","👋","🖖","🫶","🫰","🫵","🫱","🫲",
    ],
  },
  {
    icon: "❤️",
    label: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","❤️‍🩹","💕","💞",
      "💓","💗","💖","💘","💝","💟","♥️","💔","💋","💌","🫀",
    ],
  },
  {
    icon: "🌸",
    label: "Nature",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
      "🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐝","🌸","🌺","🌻","🌹","🌷","🌼","💐",
      "🍀","🌿","🌱","🌲","🌳","🌴","🌵","🍄","🌊","🔥","⭐","🌙","☀️","⛅","🌈",
      "❄️","⚡","🌍","🌏","🪻","🫧",
    ],
  },
  {
    icon: "🍕",
    label: "Food",
    emojis: [
      "🍕","🍔","🌮","🌯","🥙","🥚","🍳","🥞","🍗","🍖","🌭","🍟","🍿","🥫","🍱",
      "🍜","🍝","🍣","🍤","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭",
      "☕","🫖","🍵","🧃","🥤","🧋","🍺","🍻","🥂","🍷","🫗",
    ],
  },
  {
    icon: "🎉",
    label: "Objects",
    emojis: [
      "🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","🏅","✨","🌟","💫","⚡","🔥",
      "💡","🔦","📱","💻","🎮","🎯","🎲","🎸","🎹","🎵","🎶","📚","📖","✏️","📝",
      "💰","💳","💎","🔒","🔓","🔑","🧲","🚀","✈️","🏖️","🏔️","🌃","🎭","🎨","🖼️",
    ],
  },
] as const;

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const category = CATEGORIES[activeIndex];

  return (
    <div className="flex h-64 w-64 flex-col border border-border bg-background shadow-lg">
      <div className="flex shrink-0 border-b border-border">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            type="button"
            title={cat.label}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "flex flex-1 items-center justify-center py-1.5 text-sm transition-colors",
              i === activeIndex
                ? "bg-muted"
                : "hover:bg-muted/50",
            )}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        <div className="grid grid-cols-8 gap-px">
          {category.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              title={emoji}
              className="flex h-8 w-8 items-center justify-center text-base transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
