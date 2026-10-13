import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    title: "what we collect",
    body: [
      "if you make an account: your email, username, and a hashed version of your password. we never see or store your actual password.",
      "the photos you upload (clothing items and inspiration outfits) and the style tags generated for them.",
      "if you join the waitlist: your email address.",
      "guests don't give us any personal information. guest uploads are tied to a browser session.",
    ],
  },
  {
    title: "how it's used",
    body: [
      "photos are sent to openai's api to generate style tags, outfit ideas, and missing-piece suggestions. openai's own privacy policy covers how they handle that data.",
      "we don't sell your data, show ads, or use your photos to train ai models.",
    ],
  },
  {
    title: "where it's stored",
    body: [
      "account data and photos are stored with our database host. photos are private: only the account or guest session that uploaded a photo can load it.",
    ],
  },
  {
    title: "deleting your data",
    body: [
      "you can delete any photo from your closet or inspiration gallery at any time, which removes it from storage.",
      "to delete your whole account, email help@stylematch.org from the address you signed up with.",
    ],
  },
  {
    title: "contact",
    body: ["questions about this policy: help@stylematch.org"],
  },
];

export default function Privacy() {
  return <LegalPage title="privacy policy" updated="october 12, 2026" sections={SECTIONS} />;
}
