import React from "react";
import TopNavBar from "@/components/TopNavBar";
import ChatArea from "@/components/ChatArea";
import config from "@/config";
import { DynamicSidebars } from "@/components/DynamicSidebars";

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavBar />
      <DynamicSidebars>
        <ChatArea />
      </DynamicSidebars>
    </div>
  );
}
