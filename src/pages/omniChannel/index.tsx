import dynamic from "next/dynamic";
import React from 'react';
const ChatWidget = dynamic(() => import('./ChatWidget').then(mod=>mod.ChatWidget), { ssr: false });

import { StateProvider } from './ChatWidgetContext';

export default function ChatWidgetWrapper () {
  return (
    <StateProvider>
      <ChatWidget />
    </StateProvider>
  );
};
