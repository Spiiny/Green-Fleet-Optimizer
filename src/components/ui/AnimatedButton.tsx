import React, { useState } from "react";
import { motion } from "framer-motion";
import { Ship } from "lucide-react";

interface CreepyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    coverClassName?: string;
    coverStyle?: React.CSSProperties;
}

export const CreepyButton = ({
    children,
    className = "",
    coverClassName = "",
    coverStyle = {},
    onClick,
    ...props
}: CreepyButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            className={`relative min-w-[9em] rounded-xl bg-black cursor-pointer outline-none select-none group tap-highlight-transparent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 ${className}`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            {...props}
        >
            {/* Ship Icon */}
            <motion.span
                className="absolute flex items-center justify-center right-[1em] bottom-[0.5em] z-0 pointer-events-none text-white"
                initial={{ opacity: 0, y: 6, scale: 0.7 }}
                animate={
                    isHovered
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 6, scale: 0.7 }
                }
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    mass: 0.8,
                }}
            >
                <Ship className="w-[1em] h-[1em]" strokeWidth={2.5} />
            </motion.span>

            {/* Button Cover */}
            <motion.span
                className={`absolute inset-0 block rounded-xl text-white font-bold tracking-wider shadow-[inset_0_0_0_0.125em_rgba(0,0,0,1)] flex items-center justify-center px-4 py-2 origin-[1.25em_50%] ${coverClassName}`}
                style={coverStyle}
                animate={{
                    rotate: isHovered ? -12 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    mass: 0.8,
                }}
            >
                {children}
            </motion.span>

            {/* Invisible placeholder to maintain size since cover is absolute */}
            <span className="block opacity-0 px-4 py-2 font-bold tracking-wider min-w-[9em]">
                {children}
            </span>
        </button>
    );
};

export default CreepyButton;
