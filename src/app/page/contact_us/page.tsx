import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — TikTok Story Viewer",
  description: "Get in touch with the TikTok Story Viewer team.",
  alternates: { canonical: "/page/contact_us" },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have a question, suggestion, or issue? Send us a message.
      </p>
      <ContactForm />
    </div>
  );
}
