'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <>
      {React.Children.map(children, (child, i) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.05 }}
          className={className}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}
