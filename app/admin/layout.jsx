export default function AdminLayout({ children }) {
  // Note: In Next.js App Router, app/admin/layout.jsx wraps both /admin and
  // /admin/login. Server-side session + role verification is enforced in
  // app/admin/page.jsx and middleware.js so /admin/login never self-redirects.
  return (
    <div className="min-h-screen bg-[#080A0A]">
      {children}
    </div>
  )
}
