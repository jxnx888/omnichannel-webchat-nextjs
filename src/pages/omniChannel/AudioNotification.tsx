import React, { useEffect, useRef } from "react";
import { BroadcastChannel } from "broadcast-channel";

export const AudioNotificationStateful = (props: IAudioNotificationStatefulParams) => {
  const { audioSrc, isAudioMuted } = props;
  const audioRef = useRef(new Audio(audioSrc));

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    BroadcastService.getMessageByEventName("NewMessageNotification").subscribe((msg: any) => {
      audioRef.current.play();
    });
  }, []);

  useEffect(() => {
    isAudioMuted ? audioRef.current.muted = true : audioRef.current.muted = false;
  }, [isAudioMuted]);

  return (
    <></>
  );
};

export default AudioNotificationStateful;
