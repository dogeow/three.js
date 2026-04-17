export type Demo = {
  slug: string;
  name: string;
  title: string;
  desc: string;
  categories: string[];
  index: number | null;
  features: string[];
  extraCount: number;
  autoRegistered?: boolean;
};

export type Category = {
  name: string;
  start: string;
  end: string;
  dot: string;
  count: number;
};

import demosData from '@/data/demos.json';
import categoriesData from '@/data/categories.json';

export const demos: Demo[] = demosData as Demo[];
export const categories: Category[] = categoriesData as Category[];
