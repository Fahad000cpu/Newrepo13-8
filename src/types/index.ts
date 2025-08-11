export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  likes: number;
  comments: number;
  tags: string[];
  dataAiHint?: string;
  buyUrl?: string;
};

export type Ad = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  dataAiHint?: string;
};
