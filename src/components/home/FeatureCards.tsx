import {
  Download,
  EyeOff,
  DollarSign,
  Radio,
  BarChart2,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Download,
    title: "Download Videos HD",
    description:
      "Download TikTok videos in full HD quality with no watermark, completely free.",
  },
  {
    icon: EyeOff,
    title: "Anonymous Stories",
    description:
      "View and download TikTok stories without the creator ever knowing you watched.",
  },
  {
    icon: DollarSign,
    title: "Earnings & Profile Value",
    description:
      "Estimate how much a TikTok account earns and its approximate market value.",
  },
  {
    icon: Radio,
    title: "Live Download",
    description:
      "Record TikTok live streams directly in your browser — up to 5 minutes.",
  },
  {
    icon: BarChart2,
    title: "Profile Analytics",
    description:
      "Engagement rate, follower growth charts, posting frequency, and more.",
  },
  {
    icon: Globe,
    title: "Browse Anonymously",
    description:
      "View any public TikTok profile or video without logging in or being tracked.",
  },
];

export function FeatureCards() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-center mb-8">What You Can Do</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((feat) => (
          <Card key={feat.title} className="border-border hover:border-purple-500/40 transition-colors">
            <CardContent className="pt-6 space-y-2">
              <feat.icon className="h-8 w-8 text-purple-500" />
              <h3 className="font-semibold">{feat.title}</h3>
              <p className="text-sm text-muted-foreground">{feat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
