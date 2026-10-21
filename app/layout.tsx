import './globals.css';
export const metadata = { title: '당근 컴퓨터 쌀먹 V2', description: '나의 PC 매입부터 부품 판매까지' };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="ko"><body>{children}</body></html>; }
