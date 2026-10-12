import { Clock, Hammer } from 'lucide-react'

/**
 * Placeholder shown for admin modules not yet implemented.
 * Gives a clean UX instead of a blank page or error.
 */
export default function ComingSoon({ title, phase }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#B6F36B]/10 border border-[#B6F36B]/20 flex items-center justify-center mb-6">
        <Hammer className="w-7 h-7 text-[#B6F36B]" />
      </div>
      <h2 className="text-2xl font-bold font-space-grotesk text-[#F4F1E8] mb-2">
        {title}
      </h2>
      <p className="text-[#929B95] max-w-sm">
        This module is scheduled for{' '}
        <span className="text-[#B6F36B] font-medium">Phase {phase}</span>.
        It will be fully operational once that phase is complete.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-[#929B95]/60">
        <Clock className="w-3.5 h-3.5" />
        <span>Coming in Phase {phase}</span>
      </div>
    </div>
  )
}
