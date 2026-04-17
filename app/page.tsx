import { demos, categories } from '@/lib/demos';
import Home from '@/components/Home';

export default function Page() {
  return <Home demos={demos} categories={categories} />;
}
