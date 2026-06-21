import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import ChatWidget from "@/components/ChatWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavbarWrapper />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}