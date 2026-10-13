import type { Metadata } from 'next';
import '../app.css';

export const metadata: Metadata = {
  title: '摸鱼养生局',
  description: '在合适的时刻，休息一下。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
