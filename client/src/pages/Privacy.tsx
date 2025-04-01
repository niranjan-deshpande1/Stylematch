import React from 'react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">privacy policy</h1>
        <p className="text-zinc-400">last updated: april 1, 2025</p>
        <Separator className="my-6 bg-zinc-800" />
      </div>
      
      <section className="space-y-8 text-zinc-300">
        <div>
          <h2 className="text-xl mb-3">1. introduction</h2>
          <p className="text-zinc-400 mb-3">
            at stylematch, we value your privacy and are committed to protecting your personal data. this privacy policy explains how we collect, use, and safeguard your information when you use our application.
          </p>
          <p className="text-zinc-400">
            by using the stylematch application, you consent to the data practices described in this policy.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">2. information we collect</h2>
          <h3 className="text-lg mb-2">2.1 images and photos</h3>
          <p className="text-zinc-400 mb-3">
            we collect the clothing and inspiration images you upload to the application. these images are used to provide you with style recommendations, outfit combinations, and wardrobe management features.
          </p>
          
          <h3 className="text-lg mb-2">2.2 usage data</h3>
          <p className="text-zinc-400">
            we may collect information about how you interact with our application, including the features you use, items you save, and preferences you set.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">3. how we use your information</h2>
          <p className="text-zinc-400 mb-3">
            we use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>provide, maintain, and improve our services</li>
            <li>analyze your clothing and style preferences to generate personalized recommendations</li>
            <li>process your uploaded images to extract style tags and attributes</li>
            <li>identify missing pieces in your wardrobe based on your inspiration images</li>
            <li>allow you to share outfits on social media platforms (only when you explicitly choose to do so)</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">4. ai image analysis</h2>
          <p className="text-zinc-400 mb-3">
            our application uses openai's api to analyze the images you upload. the images are processed to extract style tags, item characteristics, and other attributes necessary for providing our services.
          </p>
          <p className="text-zinc-400">
            please note that your images may be transmitted to openai's servers for processing, subject to their privacy policies and data handling practices.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">5. data storage and retention</h2>
          <p className="text-zinc-400 mb-3">
            your uploaded images and generated data are stored on our servers for as long as you maintain an active account. you can delete any image from your account at any time, which will remove it from our servers.
          </p>
          <p className="text-zinc-400">
            we do not use your uploaded images or style data to train our AI systems.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">6. sharing your information</h2>
          <p className="text-zinc-400 mb-3">
            we do not sell, trade, or otherwise transfer your personal information to outside parties except in the following cases:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>with service providers who assist us in operating our application (such as openai for image analysis)</li>
            <li>when you explicitly choose to share content to social media platforms</li>
            <li>if required by law or to protect our rights</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">7. your privacy choices</h2>
          <p className="text-zinc-400 mb-3">
            you have the right to:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>access the personal information we hold about you</li>
            <li>request that we correct or delete your personal information</li>
            <li>opt out of certain data processing activities</li>
            <li>delete any or all of your uploaded images at any time</li>
            <li>close your account and have all your data deleted</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">8. changes to this policy</h2>
          <p className="text-zinc-400 mb-3">
            we may update this privacy policy from time to time. we will notify you of any changes by posting the new policy on this page and updating the "last updated" date.
          </p>
          <p className="text-zinc-400">
            it is your responsibility to review this policy periodically for changes.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">9. contact us</h2>
          <p className="text-zinc-400">
            if you have any questions about this privacy policy, please contact us at <a href="mailto:privacy@stylematch.org" className="text-blue-400 hover:underline">privacy@stylematch.org</a>.
          </p>
        </div>
      </section>
      
      <div className="mt-12 text-center">
        <Link href="/">
          <span className="text-zinc-400 hover:text-white transition-colors">← back to home</span>
        </Link>
      </div>
    </div>
  );
}