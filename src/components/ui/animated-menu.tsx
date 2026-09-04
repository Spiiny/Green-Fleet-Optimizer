import React from "react";
import { motion } from "framer-motion";

interface TextRollProps {
  children: string;
  baseDelay?: number;
  useHover?: boolean;
}

export function TextRoll({ children, baseDelay = 0, useHover = false }: TextRollProps) {
  return (
    <span className="relative inline-block overflow-hidden align-top">
      <motion.span
        className="inline-block"
        initial={{ y: 0 }}
        variants={{
          initial: { y: 0 },
          hovered: { y: "-100%" },
        }}
        transition={{
          duration: 0.35,
          ease: [0.33, 1, 0.68, 1],
          delay: baseDelay * 0.02,
        }}
      >
        {children.split("").map((char, index) => (
          <span key={index} className="inline-block">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </motion.span>
      <motion.span
        className="absolute top-0 left-0 inline-block text-[#AFD2FA]"
        initial={{ y: "100%" }}
        variants={{
          initial: { y: "100%" },
          hovered: { y: 0 },
        }}
        transition={{
          duration: 0.35,
          ease: [0.33, 1, 0.68, 1],
          delay: baseDelay * 0.02,
        }}
      >
        {children.split("").map((char, index) => (
          <span key={index} className="inline-block">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
