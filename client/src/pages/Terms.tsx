import React from 'react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">terms of service</h1>
        <p className="text-zinc-400">last updated: april 1, 2025</p>
        <Separator className="my-6 bg-zinc-800" />
      </div>
      
      <section className="space-y-8 text-zinc-300">
        <div>
          <h2 className="text-xl mb-3">1. acceptance of terms</h2>
          <p className="text-zinc-400 mb-3">
            by accessing or using the stylematch application ("app"), you agree to be bound by these terms of service. if you do not agree to these terms, please do not use the app.
          </p>
          <p className="text-zinc-400">
            we may update these terms from time to time, and your continued use of the app following such changes constitutes your acceptance of the revised terms.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">2. service description</h2>
          <p className="text-zinc-400 mb-3">
            stylematch is an ai-powered fashion assistant application that allows users to:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>upload and organize clothing images from their personal wardrobe</li>
            <li>upload inspiration images to analyze fashion styles</li>
            <li>receive ai-generated style tags and outfit recommendations</li>
            <li>identify missing pieces to complete outfits</li>
            <li>discover new outfit combinations from existing wardrobe items</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">3. user accounts</h2>
          <p className="text-zinc-400 mb-3">
            you may be required to create an account to access certain features of the app. you are responsible for maintaining the confidentiality of your account information and for all activities under your account.
          </p>
          <p className="text-zinc-400">
            we reserve the right to terminate or suspend your account at our sole discretion if we believe you have violated these terms or for any other reason.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">4. user content</h2>
          <p className="text-zinc-400 mb-3">
            by uploading images to the app, you grant stylematch a non-exclusive, worldwide, royalty-free license to use, store, and process those images solely for the purpose of providing and improving our services to you.
          </p>
          <p className="text-zinc-400 mb-3">
            you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>you own or have the necessary rights to the content you upload</li>
            <li>your content does not violate the rights of any third party</li>
            <li>your content complies with all applicable laws and regulations</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">5. prohibited content</h2>
          <p className="text-zinc-400 mb-3">
            you may not upload content that:
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2">
            <li>is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
            <li>infringes on any patent, trademark, trade secret, copyright, or other intellectual property rights</li>
            <li>contains nudity, pornography, or sexually explicit material</li>
            <li>promotes discrimination, bigotry, racism, hatred, or harm against any individual or group</li>
            <li>is deceptive, false, or misleading</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">6. ai-generated recommendations</h2>
          <p className="text-zinc-400 mb-3">
            the app utilizes artificial intelligence to analyze images and generate style recommendations. while we strive for accuracy, we cannot guarantee the perfect accuracy or quality of these recommendations.
          </p>
          <p className="text-zinc-400">
            ai-generated content, including style tags, missing piece recommendations, and outfit combinations, are provided "as is" without warranties of any kind.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">7. intellectual property</h2>
          <p className="text-zinc-400 mb-3">
            the app, including its text, graphics, logos, icons, and software, is the property of stylematch or its licensors and is protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-zinc-400">
            you may not modify, reproduce, distribute, create derivative works from, publicly display, or exploit in any way any content, software, or materials available through the app without our prior written consent.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">8. limitation of liability</h2>
          <p className="text-zinc-400 mb-3">
            to the maximum extent permitted by law, stylematch and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the app or any content provided by or through the app.
          </p>
          <p className="text-zinc-400">
            in no event shall our total liability to you for all claims arising from or related to the app exceed the amount paid by you, if any, for accessing the app during the twelve months prior to such claim.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">9. indemnification</h2>
          <p className="text-zinc-400">
            you agree to indemnify and hold harmless stylematch and its officers, directors, employees, and agents from and against any claims, disputes, demands, liabilities, damages, losses, and expenses, including reasonable legal and accounting fees, arising out of or in any way connected with your access to or use of the app or your violation of these terms.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">10. governing law</h2>
          <p className="text-zinc-400">
            these terms shall be governed by and construed in accordance with the laws of the state of california, without regard to its conflict of law principles.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl mb-3">11. contact us</h2>
          <p className="text-zinc-400">
            if you have any questions about these terms, please contact us at <a href="mailto:legal@stylematch.org" className="text-blue-400 hover:underline">legal@stylematch.org</a>.
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