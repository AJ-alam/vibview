import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "Is VibView free to use?",
    a: "Yes, VibView is completely free. No subscription, no login, no hidden fees.",
  },
  {
    q: "Do I need a TikTok account to use VibView?",
    a: "No account is required. VibView only accesses public content that anyone can see on TikTok.",
  },
  {
    q: "Can I download videos without a watermark?",
    a: "Yes. VibView fetches the original, watermark-free version of TikTok videos wherever possible.",
  },
  {
    q: "Will the TikTok creator know I viewed their profile or stories?",
    a: "No. VibView does not interact with TikTok's servers as a logged-in user, so views are not recorded against any account.",
  },
  {
    q: "How accurate are the earnings estimates?",
    a: "Earnings and profile valuations are rough estimates based on public engagement data and industry RPM ranges. They are clearly labelled as estimates and should not be treated as financial data.",
  },
  {
    q: "Is downloading TikTok videos legal?",
    a: "Downloading videos for personal, non-commercial use is generally tolerated, but redistribution or commercial use without the creator's permission may violate TikTok's terms of service and copyright law. Always respect creators' rights.",
  },
];

export function FaqSection() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      <Accordion multiple={false} className="w-full">
        {FAQ.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
