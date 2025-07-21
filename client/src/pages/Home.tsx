import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';

export default function Home() {
  return (
    <>
      <section className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-8 text-zinc-300">
            <span className="gradient-text">find your perfect style match</span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            upload your inspiration photos and wardrobe items to get ai-powered style tags and outfit recommendations
          </p>
          {/* Featured Swipe Discovery */}
          <div className="mb-12">
            <div className="relative bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-purple-900/20 border border-purple-500/30 rounded-2xl p-8 mb-8">
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  NEW
                </div>
              </div>
              
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse opacity-30"></div>
                </div>
              </div>
              
              <h3 className="text-2xl font-light text-center mb-3">
                <span className="gradient-text">Discover Your Style</span>
              </h3>
              <p className="text-zinc-400 text-center mb-6 max-w-md mx-auto">
                Swipe through curated outfit inspiration to create your personalized style profile in minutes
              </p>
              
              <div className="flex justify-center">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 py-3 text-sm font-medium" asChild>
                  <Link href="/swipe-onboarding">
                    <Heart className="mr-2 h-4 w-4" />
                    Start Style Discovery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
            <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-6 text-sm" asChild>
              <Link href="/inspiration-upload">
                upload inspiration
              </Link>
            </Button>
            <Button className="bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-6 text-sm" asChild>
              <Link href="/closet-upload">
                add to my closet
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-light tracking-tight mb-6 text-zinc-300">get outfit recommendations</h2>
          <p className="text-zinc-500 mb-12 max-w-2xl mx-auto">
            once you've added items to your closet, our ai will suggest outfit combinations based on your style preferences
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-zinc-800 p-8 flex flex-col items-center justify-between bg-zinc-900/50 rounded-lg">
              <div>
                <h3 className="text-xl font-light mb-4 text-zinc-400">match with closet</h3>
                <p className="text-zinc-500 mb-8">
                  discover items in your closet that match your inspiration photos
                </p>
              </div>
              <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm" asChild>
                <Link href="/inspiration">
                  view your matches
                </Link>
              </Button>
            </div>
            
            <div className="border border-zinc-800 p-8 flex flex-col items-center justify-between bg-zinc-900/50 rounded-lg">
              <div>
                <h3 className="text-xl font-light mb-4 text-zinc-400">create outfits</h3>
                <p className="text-zinc-500 mb-8">
                  build the perfect outfit with ai-powered combinations from your closet
                </p>
              </div>
              <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm" asChild>
                <Link href="/outfit-creator">
                  outfit creator
                </Link>
              </Button>
            </div>
            
            <div className="border border-zinc-800 p-8 flex flex-col items-center justify-between bg-gradient-to-br from-zinc-900 to-zinc-900/80 rounded-lg">
              <div>
                <h3 className="text-xl font-light mb-4">
                  <span className="gradient-text">identify missing pieces</span>
                </h3>
                <p className="text-zinc-500 mb-8">
                  our ai analyzes your inspiration and suggests items to complete your look
                </p>
              </div>
              <Button className="bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/50 hover:to-rose-900/50 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm" asChild>
                <Link href="/inspiration">
                  try missing pieces
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-light tracking-tight mb-6 text-zinc-300 text-center">how it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                <span className="text-2xl text-zinc-400">1</span>
              </div>
              <h3 className="text-xl mb-4 text-zinc-300">upload your closet</h3>
              <p className="text-zinc-500">
                add your clothes to your digital closet for AI analysis and tagging
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                <span className="text-2xl text-zinc-400">2</span>
              </div>
              <h3 className="text-xl mb-4 text-zinc-300">share inspiration</h3>
              <p className="text-zinc-500">
                upload photos of outfits you love to get style insights
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                <span className="text-2xl text-zinc-400">3</span>
              </div>
              <h3 className="text-xl mb-4">
                <span className="gradient-text">discover missing pieces</span>
              </h3>
              <p className="text-zinc-500">
                get AI recommendations for items that will complete your look
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
