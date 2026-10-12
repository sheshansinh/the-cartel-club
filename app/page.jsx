import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import Hero from '@/components/home/hero'
import MemberActivityBanner from '@/components/home/member-activity-banner'
import PoolGame from '@/components/home/pool-game'
import BookingSection from '@/components/home/booking-section'
import AboutSection from '@/components/home/about-section'
import GamingArena from '@/components/home/gaming-arena'
import WhyChooseUs from '@/components/home/why-choose-us'
import GalleryPreview from '@/components/home/gallery-preview'
import HowItWorks from '@/components/home/how-it-works'
import EventsSection from '@/components/home/events-section'
import Testimonials from '@/components/home/testimonials'
import FinalCTA from '@/components/home/final-cta'

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      <Navbar />
      <div className="grain-overlay" />
      
      <Hero />
      <MemberActivityBanner />
      <PoolGame />
      <BookingSection />
      <AboutSection />
      <GamingArena />
      <WhyChooseUs />
      <GalleryPreview />
      <HowItWorks />
      <EventsSection />
      <Testimonials />
      <FinalCTA />
      
      <Footer />
    </main>
  )
}
