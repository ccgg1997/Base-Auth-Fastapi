import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function MenuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return children;
}
