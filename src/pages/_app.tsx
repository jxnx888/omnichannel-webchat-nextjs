import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { MantineProvider } from '@mantine/core';

export default function App({Component, pageProps}: AppProps) {

  return <>
    <header>
      <a href={'/'}>Home</a>
      <br/>
      <a href={'/omniChannel'}>chat</a>
      <br/>
    </header>
    <MantineProvider>
      <Component {...pageProps} />
    </MantineProvider>
  </>;
}
