import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Sparkles, DoorOpen, ArrowLeftRight, Code2, Heart, Rocket, Zap, Star } from 'lucide-react';

interface EasterEggModalProps {
  open: boolean;
  onClose: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  animation: 'computer' | 'swirl' | 'door' | 'sliding';
  color: string;
  emoji: string;
  portfolio?: string;
  placeholder: string;
  funFact: string;
}

const TEAM: TeamMember[] = [
  {
    id: 'archit',
    name: 'Archit',
    role: 'Full Backend & Project Manager',
    animation: 'computer',
    color: '#ffd630',
    emoji: '👨‍💻',
    portfolio: 'Professional Vibe Coder And Professional Ragebaiter :)',
    placeholder:
      'Full backend project manager plus main core principles and website principles functionality and first point of contact for any queries related to website. Building CivicEye to make cities and campuses better, one report at a time. Owns backend, DB, auth, deployment, and core principles that keep the product honest and fast.',
    funFact: 'First point of contact for any website queries. Loves turning black space into beautiful maps.',
  },
  {
    id: 'aswath',
    name: 'Aswath',
    role: 'AI Trainer & Safety Features',
    animation: 'swirl',
    color: '#91dcc4',
    emoji: '🤖',
    placeholder:
      'AI trainer and AI applications along with safety features for the site. Trains CivicLENS AI + on-device YOLO models, builds live AI detection, and ensures safety features like SOS and security reporting work flawlessly for campus and city.',
    funFact: 'Trains AI to spot potholes and garbage, and makes safety features actually safe.',
  },
  {
    id: 'himesh',
    name: 'Himesh',
    role: 'UI/UX — CivicEye & Security Systems',
    animation: 'door',
    color: '#ef6b59',
    emoji: '🎨',
    placeholder:
      'UI/UX for CivicEye and security systems. Designs the comic street-sign map skin for CivicEye, the security flows, SOS button, and the overall CivicEye experience that feels like a real startup product with no corners cut.',
    funFact: 'Designs CivicEye comic UI and security systems. If it looks good and feels safe, it’s Himesh.',
  },
  {
    id: 'koushik',
    name: 'Koushik',
    role: 'Planner & Minimalistic UI/UX — Amrita Eye',
    animation: 'sliding',
    color: '#a78bfa',
    emoji: '📐',
    placeholder:
      'Planner, Minimalistic UI/UX designer for Amrita Eye and project/ideas manager. Plans the product roadmap, designs the clean minimalist Amrita Eye experience, and manages ideas from campus map to indoor directions and campus reporting.',
    funFact: 'Planner and minimalist UI/UX for Amrita Eye. Campus issues only on custom map? His idea.',
  },
];

export function EasterEggModal({ open, onClose }: EasterEggModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/85 p-4 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[24px] border border-white/10 bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.3)] dark:bg-[#111] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A51636] text-white shadow-lg"
              >
                <Rocket className="h-7 w-7" />
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                You found the secret lab! 🎉
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                Built with passion at <b className="text-[#A51636]">Amrita Bengaluru</b> by a tiny team that loves clean maps and fun interactions.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <Code2 className="h-4 w-4" /> Triple-click logo to unlock
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TEAM.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.06 }}
                  onHoverStart={() => setHovered(member.id)}
                  onHoverEnd={() => setHovered(null)}
                  className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="absolute right-3 top-3 text-xl opacity-60">{member.emoji}</div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: member.color }}>
                    {member.animation === 'computer' ? <Monitor className="h-5 w-5 text-slate-900" /> : member.animation === 'swirl' ? <Sparkles className="h-5 w-5 text-slate-900" /> : member.animation === 'door' ? <DoorOpen className="h-5 w-5 text-slate-900" /> : <ArrowLeftRight className="h-5 w-5 text-slate-900" />}
                  </div>
                  <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{member.name}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{member.role}</p>
                  {member.id === 'archit' ? (
                    <p className="mt-1.5 rounded-full bg-[#ffd630]/20 px-2.5 py-1 text-[11px] font-bold text-[#8a6d00] dark:bg-[#ffd630]/10 dark:text-[#ffd630]">
                      {member.portfolio}
                    </p>
                  ) : null}

                  {/* Interactive animation area — clean, no overlapping text */}
                  <div className="relative mt-4 h-[150px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0f0f12]">
                    {/* Computer top-down for Archit */}
                    {member.animation === 'computer' ? (
                      <>
                        <div className="absolute inset-x-0 top-0 flex h-7 items-center gap-1.5 bg-slate-900 px-3">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          <span className="h-2 w-2 rounded-full bg-amber-300" />
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="ml-2 font-mono text-[10px] text-white/50">civiceye — bash</span>
                        </div>
                        <motion.div
                          initial={{ y: '-100%' }}
                          animate={{ y: hovered === member.id ? '0%' : '-100%' }}
                          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                          className="absolute inset-x-0 top-7 bottom-0 bg-[#0f172a] p-3 font-mono text-[11px] leading-relaxed text-emerald-300"
                        >
                          <div className="text-slate-400">$ npm run build</div>
                          <div>✓ 2536 modules</div>
                          <div className="text-amber-300">✓ built in 14s</div>
                          <div className="mt-2 text-sky-300">$ fix floor plans</div>
                          <div className="text-slate-300">→ A Block 1st floor</div>
                          <div className="text-slate-300">→ E Block square</div>
                          <div className="mt-2 flex items-center gap-1 text-amber-300">
                            <Zap className="h-3 w-3" /> You rock!
                          </div>
                        </motion.div>
                        <AnimatePresence>
                          {hovered !== member.id ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 top-7 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
                              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">Hover — computer open</span>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : null}

                    {/* Swirl for Aswath */}
                    {member.animation === 'swirl' ? (
                      <>
                        <motion.div
                          animate={hovered === member.id ? { rotate: 360 } : { rotate: 0 }}
                          transition={{ duration: 2, ease: 'linear', repeat: hovered === member.id ? Infinity : 0 }}
                          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#91dcc4]/60"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={hovered === member.id ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="absolute inset-0 flex items-center justify-center bg-white p-4 text-center dark:bg-[#111]"
                        >
                          <div>
                            <motion.div animate={hovered === member.id ? { rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.8, repeat: hovered === member.id ? Infinity : 0 }} className="text-3xl">🌀</motion.div>
                            <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">Swirl!</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{member.funFact}</div>
                          </div>
                        </motion.div>
                        <AnimatePresence>
                          {hovered !== member.id ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-slate-50/70 backdrop-blur-[1px] dark:bg-black/20">
                              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">Hover — swirl</span>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : null}

                    {/* Door open for Himesh */}
                    {member.animation === 'door' ? (
                      <>
                        <div className="absolute inset-0 bg-slate-100 dark:bg-[#0f0f12] flex items-center justify-center p-3 text-center">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Inside the lab</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{member.funFact}</div>
                          </div>
                        </div>
                        <motion.div
                          initial={{ x: 0 }}
                          animate={{ x: hovered === member.id ? '-92%' : '0%' }}
                          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                          className="absolute inset-y-0 left-0 w-[55%] bg-[#ffd630] border-r border-slate-900/10 flex items-center justify-center shadow-[4px_0_12px_rgba(0,0,0,0.15)]"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <DoorOpen className="h-6 w-6 text-slate-900" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Door</span>
                          </div>
                        </motion.div>
                        <AnimatePresence>
                          {hovered !== member.id ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
                              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">Hover — door open</span>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : null}

                    {/* Sliding both sides for Koushik */}
                    {member.animation === 'sliding' ? (
                      <>
                        <div className="absolute inset-0 bg-slate-50 dark:bg-[#0f0f12] flex items-center justify-center p-4 text-center">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Sliding reveal</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{member.funFact}</div>
                          </div>
                        </div>
                        <motion.div
                          initial={{ x: 0 }}
                          animate={{ x: hovered === member.id ? '-100%' : '0%' }}
                          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                          className="absolute inset-y-0 left-0 w-1/2 bg-[#a78bfa] flex items-center justify-center border-r border-white/20"
                        >
                          <ArrowLeftRight className="h-5 w-5 text-white" />
                        </motion.div>
                        <motion.div
                          initial={{ x: 0 }}
                          animate={{ x: hovered === member.id ? '100%' : '0%' }}
                          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                          className="absolute inset-y-0 right-0 w-1/2 bg-[#a78bfa] flex items-center justify-center border-l border-white/20"
                        >
                          <ArrowLeftRight className="h-5 w-5 text-white" />
                        </motion.div>
                        <AnimatePresence>
                          {hovered !== member.id ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
                              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">Hover — slide both sides</span>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <p className="text-[12.5px] leading-[1.5] text-slate-700 dark:text-slate-300">{member.placeholder}</p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Star className="h-3 w-3 text-amber-400" /> {member.funFact}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 rounded-[20px] bg-slate-900 p-6 text-white dark:bg-[#0a0a0f]">
              <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-white">
                <Heart className="h-4 w-4 text-rose-400" /> Honorable Mentions
              </h3>
              <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-slate-300">
                <p>
                  Huge thanks to <a href="https://arena.ai" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#91dcc4] underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white">arena.ai</a> — Agent Mode helped bring CivicEye to life. It’s a fun, powerful way to build with AI, handling code, builds, and deploys while we focused on the fun parts.
                </p>
                <p className="text-slate-400">
                  Also thanks to OpenStreetMap contributors and Amrita faculty for the public data that makes the campus map possible.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">Built with passion</span>
                <span className="rounded-full bg-[#ffd630] px-3 py-1 text-xs font-bold text-slate-900">No corners cut</span>
                <span className="rounded-full bg-[#91dcc4] px-3 py-1 text-xs font-bold text-slate-900">Startup quality</span>
                <span className="rounded-full bg-[#A51636] px-3 py-1 text-xs font-bold text-white">arena.ai ❤️</span>
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              Triple-click the CivicEye logo to open this again. Each card has its own interaction — computer top-down, swirl, door, and sliding doors.
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
