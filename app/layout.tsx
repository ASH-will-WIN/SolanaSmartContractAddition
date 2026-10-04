import "./globals.css";
import "@xyflow/react/dist/style.css";
export const metadata = { title: "SOLstice · Devnet", description: "Real-world conditions, executed on-chain" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
