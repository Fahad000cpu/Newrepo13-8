// src/components/ad-card.tsx
"use client";

import type { Ad } from "@/types";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";

export function AdCard({ ad }: { ad: Ad }) {

  const handleCtaClick = () => {
    window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-xl border-2 border-accent/50">
      <CardHeader className="relative p-0">
        <Badge variant="secondary" className="absolute top-2 left-2 z-10">Advertisement</Badge>
        <Image
          src={ad.imageUrl}
          alt={ad.title}
          width={600}
          height={600}
          className="aspect-square w-full object-cover"
          data-ai-hint={ad.dataAiHint}
        />
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="font-headline text-lg font-bold">{ad.title}</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">{ad.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={handleCtaClick} className="w-full" variant="outline">
          {ad.ctaText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
