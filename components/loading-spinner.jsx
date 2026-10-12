export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#080A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#B6F36B] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#929B95]">Loading...</p>
      </div>
    </div>
  )
}
