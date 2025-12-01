import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen w-full justify-between font-inter">
        {children}

        <div className="auth-asset">
          <div className="w-[700px] h-[700px]">
            <Image
              src="/icons/auth-image.svg"
              alt="Auth image"
              width={700}
              height={700}
              className="w-full h-full object-contain"
              priority
            />

          </div>
        </div>
    </main>
  );
}