'use client'

import HeroSection from '@/components/landing/HeroSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import LiveDemoSection from '@/components/landing/LiveDemoSection'
import UseCasesSection from '@/components/landing/UseCasesSection'
import TechStackSection from '@/components/landing/TechStackSection'
import GetStartedSection from '@/components/landing/GetStartedSection'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section with gradient background */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Live Demo Section */}
      <LiveDemoSection />

      {/* Use Cases Section */}
      <UseCasesSection />

      {/* Tech Stack Section */}
      <TechStackSection />

      {/* Get Started Section */}
      <GetStartedSection />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-2xl font-bold mb-4">GenCrawl</h3>
              <p className="text-gray-400">
                Intelligent web crawling powered by natural language.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#demo" className="hover:text-white transition">Live Demo</a></li>
                <li><a href="/dashboard" className="hover:text-white transition">Dashboard</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://github.com/yourusername/gencrawl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
                <li><a href="https://github.com/yourusername/gencrawl/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Documentation</a></li>
                <li><a href="https://github.com/yourusername/gencrawl/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Report Issues</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://discord.gg/gencrawl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Discord</a></li>
                <li><a href="https://twitter.com/gencrawl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Twitter</a></li>
                <li><a href="https://github.com/yourusername/gencrawl/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Discussions</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} GenCrawl. MIT License. Open Source & Free Forever.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
