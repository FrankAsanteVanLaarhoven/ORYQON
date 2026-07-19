'use client';

import { AnimatePresence, motion } from 'motion/react';

/** Transient transparent-glass wipe played during a section switch. */
export default function GlassWipe({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="oc-glasswipe"
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0 0 0)' }}
          exit={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
        />
      ) : null}
    </AnimatePresence>
  );
}
