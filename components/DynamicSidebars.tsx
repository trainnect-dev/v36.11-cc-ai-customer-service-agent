'use client';

import dynamic from "next/dynamic";
import config from "@/config";

const LeftSidebar = dynamic(() => import("@/components/LeftSidebar"), {
  ssr: false,
});

const RightSidebar = dynamic(() => import("@/components/RightSidebar"), {
  ssr: false,
});

export function DynamicSidebars({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden h-screen w-full">
      {config.includeLeftSidebar && <LeftSidebar />}
      {children}
      {config.includeRightSidebar && <RightSidebar />}
    </div>
  );
}
