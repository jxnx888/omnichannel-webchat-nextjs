
import React from 'react';
import { ChatWidget } from './ChatWidget';
import { StateProvider } from './ChatWidgetContext';

export const ChatWidgetWrapper = () => {
  return (
    <StateProvider>
      <ChatWidget />
    </StateProvider>
  );
};
