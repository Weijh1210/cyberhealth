import type { Metadata,Viewport } from 'next';
import '../app.css';

export const metadata: Metadata = {
  title: 'CyberHealth · 摸鱼养生局',
  description: 'Small Moves, Lasting Habits. 学习与工作的智能微休息助手。',
  appleWebApp:{capable:true,statusBarStyle:'default',title:'摸鱼养生局'},
  icons:{apple:'/icons/icon-192.png'},
};

export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#315e42'};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
