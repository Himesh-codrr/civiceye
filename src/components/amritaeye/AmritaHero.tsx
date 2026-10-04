import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedText } from '@/components/ui/AnimatedText';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: { type: 'spring', duration: 0.45, bounce: 0 }
  },
};

export function AmritaHero() {
  return (
    <section
      id="hero"
      aria-labelledby="amrita-hero-title"
      className="relative pt-32 pb-24 lg:pt-48 lg:pb-36 overflow-hidden bg-transparent"
    >
      {/* Readability fade over the ASCII backdrop — keeps hero text crisp on
          any screen size, light or dark. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/70 dark:from-black/60 dark:via-black/30 dark:to-[#1A030A]/80" aria-hidden="true" />
      {/* Soft glow to lift the headline off the characters */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[#E52B50]/20 blur-[120px] dark:bg-[#E52B50]/25" aria-hidden="true" />

      <motion.div 
        className="relative z-10 mx-auto max-w-[1920px] px-6 lg:px-12 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Eyebrow */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E52B50]">
          <span className="h-2 w-2 rounded-full bg-[#E52B50]" aria-hidden="true" />
          <span>Amrita Eye · Campus Reporting</span>
        </motion.div>

        {/* Headline */}
        <h1
          id="amrita-hero-title"
          className="text-4xl sm:text-6xl md:text-7xl lg:text-[72px] xl:text-[72px] font-bold leading-[1.08] tracking-[-0.03em] text-white max-w-6xl mx-auto"
        >
          <span className="block">
            <AnimatedText text="Every" />{' '}
            <span className="font-serif italic font-normal text-[#E52B50]">
              <AnimatedText text="broken" />
            </span>{' '}
            <AnimatedText text="light" />
          </span>
          <span className="block mt-2 sm:mt-4">
            <AnimatedText text="on campus" />{' '}
            <span className="font-serif italic font-normal text-[#E52B50]">
              <AnimatedText text="has a witness." />
            </span>
          </span>
        </h1>

        <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-base font-normal leading-[1.5] text-white/75">
          Photograph the issue, confirm its location, and send a traceable report directly to the campus team responsible for fixing it.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            to="/report"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#A51636] px-8 text-base font-semibold text-white transition-opacity hover:opacity-90 active:scale-95 dark:bg-[#E52B50]"
          >
            Report an issue
          </Link>

          <Link
            to="/food-hygiene"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-[#A51636] bg-[#fffdf4] px-6 text-sm font-bold uppercase tracking-wider text-[#A51636] shadow-[4px_4px_0_#A51636] transition hover:-translate-y-0.5 hover:bg-[#ffd630] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#A51636]"
          >
            🍛 Mess / Food Hygiene — Anonymous
          </Link>

          <Link
            to="/map"
            className="inline-flex h-14 items-center justify-center rounded-full border border-neutral-300 bg-white px-8 text-base font-semibold text-[#1D1D1F] transition-colors hover:bg-neutral-50 dark:bg-transparent dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
          >
            View campus map
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
