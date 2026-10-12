import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import './design.css';
export const metadata: Metadata = {title:'Le Club du Vin — Good wine. Your way.',description:'Your cellar, your people, your ever-evolving palate. A personal wine journal and tasting club.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
