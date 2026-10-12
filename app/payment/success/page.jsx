import { Suspense } from 'react'
import PaymentSuccess from '@/components/payment/payment-success'

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080A0A] flex items-center justify-center text-[#B6F36B]">
          Loading confirmation...
        </div>
      }
    >
      <PaymentSuccess />
    </Suspense>
  )
}
