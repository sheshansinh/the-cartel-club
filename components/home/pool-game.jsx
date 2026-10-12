"use client"

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react'

// ---------- World constants (logical units; canvas scales to fit) ----------
const W = 1100, H = 600, RAIL = 50, FW = 1000, FH = 500, MAXV = 1500
let R = 15 // ball radius (bigger on phones, see setScale)
const POCKETS = [
  { x: 0, y: 0, r: 32 }, { x: FW, y: 0, r: 32 },
  { x: 0, y: FH, r: 32 }, { x: FW, y: FH, r: 32 },
  { x: FW / 2, y: -5, r: 28 }, { x: FW / 2, y: FH + 5, r: 28 },
]
const COLORS = [null, '#f5c518', '#1f4fd8', '#e02e2e', '#5b2a86', '#f07d1a', '#1e8a4c', '#8b1d1d', '#111111']
const RACK = [1, 2, 3, 4, 8, 5, 6, 7, 9, 10]

// Phones render the table small, so use bigger balls and pockets there
function setScale(mobile) {
  R = mobile ? 24 : 15
  POCKETS.forEach((p, i) => { p.r = i < 4 ? (mobile ? 46 : 32) : (mobile ? 40 : 28) })
}

function makeBalls() {
  const balls = [{ n: 0, x: 250, y: FH / 2, vx: 0, vy: 0, sink: 0 }]
  let i = 0
  for (let r = 0; r < 4; r++)
    for (let c = 0; c <= r; c++) {
      balls.push({
        n: RACK[i++],
        x: 700 + r * (2 * R + 0.4) * 0.866,
        y: FH / 2 + (c - r / 2) * (2 * R + 0.4),
        vx: 0, vy: 0, sink: 0,
      })
    }
  return balls
}

// ---------- Physics ----------
function step(g, dt) {
  const bs = g.balls
  for (const b of bs) {
    if (b.sink) {
      b.sink += dt * 4
      b.x += (b.pk.x - b.x) * dt * 12
      b.y += (b.pk.y - b.y) * dt * 12
      continue
    }
    b.x += b.vx * dt
    b.y += b.vy * dt
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > 0) {
      const ns = Math.max(0, sp - (150 + sp * 0.45) * dt) // rolling friction
      if (ns < 6) { b.vx = b.vy = 0 } else { b.vx *= ns / sp; b.vy *= ns / sp }
    }
    for (const p of POCKETS) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
        b.sink = 0.001; b.pk = p; b.vx = b.vy = 0
        g.onPocket(b)
        break
      }
    }
    if (b.sink) continue
    const nearPocket = POCKETS.some(p => Math.hypot(b.x - p.x, b.y - p.y) < p.r + R + 8)
    if (!nearPocket) {
      const e = 0.78
      if (b.x < R) { g.sfx(Math.abs(b.vx), 'wall'); b.x = R; b.vx = Math.abs(b.vx) * e }
      else if (b.x > FW - R) { g.sfx(Math.abs(b.vx), 'wall'); b.x = FW - R; b.vx = -Math.abs(b.vx) * e }
      if (b.y < R) { g.sfx(Math.abs(b.vy), 'wall'); b.y = R; b.vy = Math.abs(b.vy) * e }
      else if (b.y > FH - R) { g.sfx(Math.abs(b.vy), 'wall'); b.y = FH - R; b.vy = -Math.abs(b.vy) * e }
    }
  }
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i]
    if (a.sink) continue
    for (let j = i + 1; j < bs.length; j++) {
      const b = bs[j]
      if (b.sink) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const d2 = dx * dx + dy * dy
      if (d2 >= 4 * R * R || d2 === 0) continue
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d
      const ov = (2 * R - d) / 2
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov
      const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
      if (vn > 0) {
        const imp = vn * 0.98
        a.vx -= imp * nx; a.vy -= imp * ny
        b.vx += imp * nx; b.vy += imp * ny
        g.sfx(vn, 'ball')
      }
    }
  }
}

export default function PoolGame() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const gRef = useRef(null)
  const [hud, setHud] = useState({ score: 0, shots: 0, streak: 0, left: 10, won: false })
  const [best, setBest] = useState(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem('poolGameBestScore') || '0') || 0) } catch {}
  }, [])

  useEffect(() => {
    if (hud.score > best) {
      setBest(hud.score)
      try { localStorage.setItem('poolGameBestScore', String(hud.score)) } catch {}
    }
  }, [hud.score, best])

  useEffect(() => { if (gRef.current) gRef.current.muted = muted }, [muted])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas.getContext('2d')
    let audio = null
    const size = { w: 0, h: 0, dpr: 1 }

    setScale(wrap.getBoundingClientRect().width < 640)
    const g = {
      balls: makeBalls(), drag: null, moving: false, scratch: false,
      potted: 0, streak: 0, score: 0, shots: 0, won: false, muted: false,
    }
    gRef.current = g

    const sync = () => setHud({
      score: g.score, shots: g.shots, streak: g.streak,
      left: g.balls.filter(b => b.n > 0).length, won: g.won,
    })

    g.sfx = (v, kind) => {
      if (g.muted || !audio || v < 15) return
      const vol = Math.min(v / 700, 1) * 0.25
      const o = audio.createOscillator(), gn = audio.createGain()
      o.type = kind === 'wall' ? 'triangle' : 'sine'
      o.frequency.value = kind === 'wall' ? 140 : kind === 'pocket' ? 90 : 900
      gn.gain.setValueAtTime(vol, audio.currentTime)
      gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (kind === 'pocket' ? 0.25 : 0.06))
      o.connect(gn); gn.connect(audio.destination)
      o.start(); o.stop(audio.currentTime + 0.3)
    }
    g.onPocket = (b) => {
      g.sfx(500, 'pocket')
      if (b.n === 0) g.scratch = true
      else g.potted++
    }
    g.reset = () => {
      setScale(wrap.getBoundingClientRect().width < 640)
      g.balls = makeBalls(); g.drag = null; g.moving = false; g.scratch = false
      g.potted = 0; g.streak = 0; g.score = 0; g.shots = 0; g.won = false
      sync()
    }

    const endShot = () => {
      g.moving = false
      let pts = 0
      if (g.potted > 0) {
        g.streak++
        pts += Math.round(g.potted * 10 * (1 + (g.streak - 1) * 0.5))
      } else g.streak = 0
      if (g.scratch) {
        pts -= 5; g.streak = 0
        let x = 250
        const free = (px) => g.balls.every(b => Math.hypot(b.x - px, b.y - FH / 2) > 2 * R + 1)
        while (!free(x) && x > R + 4) x -= 2 * R
        g.balls.push({ n: 0, x, y: FH / 2, vx: 0, vy: 0, sink: 0 })
      }
      g.score = Math.max(0, g.score + pts)
      if (!g.balls.some(b => b.n > 0)) g.won = true
      g.potted = 0; g.scratch = false
      sync()
    }

    // ---------- Layout ----------
    const layout = () => {
      const r = wrap.getBoundingClientRect()
      size.dpr = Math.min(window.devicePixelRatio || 1, 2)
      size.w = r.width; size.h = r.height
      canvas.width = Math.round(r.width * size.dpr)
      canvas.height = Math.round(r.height * size.dpr)
    }
    const ro = new ResizeObserver(layout)
    ro.observe(wrap)
    layout()

    const view = () => {
      const s = Math.min(size.w / W, size.h / H)
      return { s, ox: (size.w - W * s) / 2, oy: (size.h - H * s) / 2 }
    }
    const toWorld = (e) => {
      const r = canvas.getBoundingClientRect()
      const { s, ox, oy } = view()
      return { x: (e.clientX - r.left - ox) / s - RAIL, y: (e.clientY - r.top - oy) / s - RAIL }
    }

    // ---------- Input ----------
    const aimInfo = () => {
      const d = g.drag
      if (!d) return null
      const dx = d.sx - d.cx, dy = d.sy - d.cy
      const len = Math.hypot(dx, dy)
      if (len < 12) return null
      return { dx: dx / len, dy: dy / len, power: Math.min(len / 220, 1) }
    }
    const down = (e) => {
      if (g.moving || g.won) return
      if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)() } catch {} }
      canvas.setPointerCapture(e.pointerId)
      const p = toWorld(e)
      g.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y }
    }
    const move = (e) => {
      if (!g.drag) return
      const p = toWorld(e)
      g.drag.cx = p.x; g.drag.cy = p.y
    }
    const up = () => {
      const a = aimInfo()
      const cue = g.balls.find(b => b.n === 0)
      g.drag = null
      if (!a || !cue || g.moving) return
      cue.vx = a.dx * a.power * MAXV
      cue.vy = a.dy * a.power * MAXV
      g.moving = true; g.shots++
      g.sfx(a.power * 900, 'ball')
      sync()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', () => { g.drag = null })

    // ---------- Rendering ----------
    const drawBall = (b) => {
      const k = b.sink ? Math.max(0, 1 - b.sink) : 1
      if (k <= 0) return
      ctx.save()
      ctx.translate(b.x, b.y); ctx.scale(k, k)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath(); ctx.ellipse(3, 4, R, R * 0.9, 0, 0, 7); ctx.fill()
      ctx.save()
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.clip()
      const stripe = b.n > 8
      const col = b.n === 0 ? '#f4f1e8' : COLORS[b.n > 8 ? b.n - 8 : b.n]
      ctx.fillStyle = stripe ? '#f4f1e8' : col
      ctx.fillRect(-R, -R, 2 * R, 2 * R)
      if (stripe) { ctx.fillStyle = col; ctx.fillRect(-R, -R * 0.55, 2 * R, R * 1.1) }
      if (b.n > 0) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(0, 0, R * 0.48, 0, 7); ctx.fill()
        ctx.fillStyle = '#000'; ctx.font = `bold ${R * 0.62}px Arial`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(b.n, 0, 0.5)
      }
      const sh = ctx.createRadialGradient(-R * 0.4, -R * 0.45, 1, 0, 0, R * 1.1)
      sh.addColorStop(0, 'rgba(255,255,255,0.65)')
      sh.addColorStop(0.35, 'rgba(255,255,255,0)')
      sh.addColorStop(1, 'rgba(0,0,0,0.4)')
      ctx.fillStyle = sh; ctx.fillRect(-R, -R, 2 * R, 2 * R)
      ctx.restore(); ctx.restore()
    }

    const drawAim = (cue, a) => {
      let tMin = Infinity, hit = null
      const m = 2 * R
      for (const b of g.balls) {
        if (b === cue || b.sink) continue
        const mx = b.x - cue.x, my = b.y - cue.y
        const proj = mx * a.dx + my * a.dy
        if (proj <= 0) continue
        const perp2 = mx * mx + my * my - proj * proj
        if (perp2 < m * m) {
          const t = proj - Math.sqrt(m * m - perp2)
          if (t < tMin) { tMin = t; hit = b }
        }
      }
      const tw = (v, d, lo, hi) => d > 0 ? (hi - v) / d : d < 0 ? (lo - v) / d : Infinity
      const tWall = Math.min(tw(cue.x, a.dx, R, FW - R), tw(cue.y, a.dy, R, FH - R))
      const t = Math.min(tMin, tWall)
      const ex = cue.x + a.dx * t, ey = cue.y + a.dy * t
      ctx.save()
      ctx.setLineDash([8, 7]); ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(244,241,232,0.7)'
      ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke()
      if (hit && t === tMin) {
        let tx = hit.x - ex, ty = hit.y - ey
        const l = Math.hypot(tx, ty) || 1
        ctx.strokeStyle = '#B6F36B'
        ctx.beginPath(); ctx.moveTo(hit.x, hit.y); ctx.lineTo(hit.x + (tx / l) * 80, hit.y + (ty / l) * 80); ctx.stroke()
      }
      ctx.restore()
    }

    const drawCue = (cue, a) => {
      const pull = a.power * 90
      ctx.save()
      ctx.translate(cue.x, cue.y); ctx.rotate(Math.atan2(a.dy, a.dx))
      const x0 = -(R + 4 + pull), len = 420
      const gr = ctx.createLinearGradient(x0, 0, x0 - len, 0)
      gr.addColorStop(0, '#f1d9a8'); gr.addColorStop(0.7, '#b8793a'); gr.addColorStop(1, '#3a2312')
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.moveTo(x0, -1.8); ctx.lineTo(x0 - len, -5); ctx.lineTo(x0 - len, 5); ctx.lineTo(x0, 1.8)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#4aa3ff'; ctx.fillRect(x0 - 4, -1.8, 4, 3.6)
      ctx.restore()
      // power bar
      const bx = 20, by = FH - 24, bw = 180
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx, by, bw, 10)
      const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      pg.addColorStop(0, '#B6F36B'); pg.addColorStop(0.6, '#f5c518'); pg.addColorStop(1, '#e02e2e')
      ctx.fillStyle = pg; ctx.fillRect(bx, by, bw * a.power, 10)
    }

    const draw = () => {
      const { s, ox, oy } = view()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(size.dpr * s, 0, 0, size.dpr * s, size.dpr * ox, size.dpr * oy)

      const wood = ctx.createLinearGradient(0, 0, 0, H)
      wood.addColorStop(0, '#8a5530'); wood.addColorStop(0.5, '#5e3519'); wood.addColorStop(1, '#3f230f')
      ctx.fillStyle = wood
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, 30); ctx.fill()
      ctx.strokeStyle = '#2d1a0b'; ctx.lineWidth = 4; ctx.stroke()
      ctx.fillStyle = '#e9d9a6'
      for (let i = 1; i < 8; i++) {
        if (i === 4) continue
        for (const y of [RAIL / 2, H - RAIL / 2]) { ctx.beginPath(); ctx.arc(RAIL + i * FW / 8, y, 3.5, 0, 7); ctx.fill() }
      }
      for (let i = 1; i < 4; i++)
        for (const x of [RAIL / 2, W - RAIL / 2]) { ctx.beginPath(); ctx.arc(x, RAIL + i * FH / 4, 3.5, 0, 7); ctx.fill() }

      ctx.save()
      ctx.translate(RAIL, RAIL)
      ctx.fillStyle = '#0d3f2a'; ctx.fillRect(-10, -10, FW + 20, FH + 20)
      const cloth = ctx.createRadialGradient(FW / 2, FH / 2, 60, FW / 2, FH / 2, FW * 0.62)
      cloth.addColorStop(0, '#23915f'); cloth.addColorStop(1, '#15633f')
      ctx.fillStyle = cloth; ctx.fillRect(0, 0, FW, FH)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(250, 0); ctx.lineTo(250, FH); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath(); ctx.arc(250, FH / 2, 3, 0, 7); ctx.arc(700, FH / 2, 3, 0, 7); ctx.fill()

      for (const p of POCKETS) {
        ctx.fillStyle = '#050505'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
        ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3; ctx.stroke()
      }
      for (const b of g.balls) drawBall(b)

      if (!g.moving && !g.won) {
        const cue = g.balls.find(b => b.n === 0)
        const a = aimInfo()
        if (cue && a) { drawAim(cue, a); drawCue(cue, a) }
      }
      ctx.restore()
    }

    // ---------- Main loop ----------
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const n = Math.ceil(dt / (1 / 240))
      for (let i = 0; i < n; i++) step(g, dt / n)
      const before = g.balls.length
      g.balls = g.balls.filter(b => b.sink < 1)
      const active = g.balls.some(b => b.sink || b.vx || b.vy)
      if (g.moving && !active) endShot()
      else if (before !== g.balls.length) sync()
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
    }
  }, [])

  const stat = (label, value, accent) => (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-[#080A0A]/80 border border-[#B6F36B]/20 min-w-[72px]">
      <span className="text-[10px] tracking-widest text-[#929B95]">{label}</span>
      <span className={`text-lg font-bold ${accent ? 'text-[#B6F36B]' : 'text-[#F4F1E8]'}`}>{value}</span>
    </div>
  )

  return (
    <section id="game" className="py-16 md:py-24 bg-[#111615]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <p className="text-[#B6F36B] font-semibold text-sm mb-4 tracking-widest">YOUR TURN</p>
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">TAKE THE SHOT.</h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Test your aim. Sink the balls. Can you clear the table?
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4">
            {stat('SCORE', hud.score, true)}
            {stat('SHOTS', hud.shots)}
            {stat('STREAK', `x${hud.streak}`)}
            {stat('LEFT', hud.left)}
            {stat('BEST', best)}
            <button
              onClick={() => gRef.current?.reset()}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#B6F36B]/20 hover:bg-[#B6F36B]/30 text-[#B6F36B] border border-[#B6F36B]/50 text-sm font-medium transition-colors"
            >
              <RotateCcw size={16} /> RESTART
            </button>
            <button
              onClick={() => setMuted(m => !m)}
              aria-label="Toggle sound"
              className="p-3 rounded-lg bg-[#080A0A]/80 border border-[#B6F36B]/20 text-[#929B95] hover:text-[#B6F36B] transition-colors"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div ref={wrapRef} className="relative w-full aspect-[11/6] rounded-xl overflow-hidden shadow-2xl border border-[#D6B36A]/30 bg-[#080A0A]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" style={{ touchAction: 'none' }} />
            {hud.won && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080A0A]/85 backdrop-blur-sm text-center p-4">
                <Trophy className="text-[#B6F36B]" size={44} />
                <h3 className="text-3xl md:text-4xl font-bold text-[#F4F1E8]">TABLE CLEARED!</h3>
                <p className="text-[#929B95]">Score {hud.score} · {hud.shots} shots</p>
                <button
                  onClick={() => gRef.current?.reset()}
                  className="mt-2 px-6 py-3 rounded-lg bg-[#B6F36B] text-[#080A0A] font-bold hover:brightness-110 transition"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-[#929B95] text-sm">
            Press anywhere and drag <span className="text-[#F4F1E8]">backwards</span> to aim, pull farther for more power, release to shoot.
            Pot balls for +10 (streaks multiply). Scratch costs 5.
          </p>
        </div>
      </div>
    </section>
  )
}