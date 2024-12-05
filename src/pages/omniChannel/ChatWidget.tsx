'use client';
//https://github.com/microsoft/omnichannel-chat-sdk/blob/main/README.md
import { LoadingOverlay, Box, Button, Input, Select, Checkbox } from '@mantine/core';
import { useDisclosure } from "@mantine/hooks";
import clsx from "clsx";
import { getBrowserName, getDeviceName } from './utils/BrowserInfo';
import { decodeHtmlEntities } from './utils/decodeHtml';
import { NewMessageNotificationSoundBase64 } from './utils/notificationSoundBase64';
import { IRawMessage, OmnichannelChatSDK } from '@microsoft/omnichannel-chat-sdk';
import ChatSDKMessage from '@microsoft/omnichannel-chat-sdk/lib/core/messaging/ChatSDKMessage';
import OmnichannelMessage from '@microsoft/omnichannel-chat-sdk/lib/core/messaging/OmnichannelMessage';
import OmnichannelConfig from '@microsoft/omnichannel-chat-sdk/lib/core/OmnichannelConfig';
import StartChatOptionalParams from '@microsoft/omnichannel-chat-sdk/lib/core/StartChatOptionalParams';
import IFileMetadata from '@microsoft/omnichannel-ic3core/lib/model/IFileMetadata';
import IMessage from '@microsoft/omnichannel-ic3core/lib/model/IMessage';
import dayjs from 'dayjs';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

import styles from './ChatWidget.module.css';
import { ActionType, Store } from './ChatWidgetContext';

export type OptionValueProps = {
  id: string;
  value: string;
};
export type ChoicesProps = {
  title: string;
  value: string;
};
export type ActionProps = {
  type: string;
  data: {
    type?: string;
  };
  title: string;
};
/*type IDprops={
  id: string;
  IsRequired: boolean;
  IsOption: boolean;
  Order: number;
  QuestionText: string;
  Name: string;
  defaultValue: string;
}*/
type TextBlockField ={
  type: 'TextBlock';
  text: string;
  weight?: 'bolder';
}
type InputTextField = {
  type: 'Input.Text';
  id: string;
  maxLength: number;
}

type Choice = {
  value: string;
  title: string;
}

type InputChoiceSetField = {
  type: 'Input.ChoiceSet';
  id: string;
  choices: Choice[];
  style: 'expanded' | 'compact';
  value: string;
  isMultiSelect: boolean;
}
type InputToggleField ={
  type: 'Input.Toggle';
  id: string;
  title: string;
  valueOn: string;
  valueOff: string;
  value: string;
}
type FormField =
  | TextBlockField
  | InputTextField
  | InputChoiceSetField
  | InputToggleField;
export type ChatSurveyBodyProps = FormField;
export type PreChatSurveyProps = {
  actions: Array<ActionProps>;
  body: Array<ChatSurveyBodyProps>;
  type?: string;
  version?: string;
};

export type PreChatSurveyDataProps = {
  [name: string]: string | FormDataEntryValue;
};

export type GetMessagesProps = Partial<IRawMessage> & {
  type?: 'user' | 'agent';
  status?: 'sent' | 'sending';
  fileBlob?: string;
};

const Constants = {
  InputSubmit: 'InputSubmit',
};

export enum LiveWorkItemState {
  Active = 'Active',
  Closed = 'Closed',
  Open = 'Open',
  Waiting = 'Waiting',
  WrapUp = 'WrapUp',
}

export type ChatStatusType = LiveWorkItemState;

export const ChatWidget = () => {
  // const isEditing = false;
  const {state, dispatch} = useContext(Store);
  // Prod - WWW
  // const orgId = '3a69604d-96c2-4a9b-b911-09d80faaf098';
  // const orgUrl = 'https://m-3a69604d-96c2-4a9b-b911-09d80faaf098.ca.omnichannelengagementhub.com';
  // const appId = '80ba60f7-64f5-4f5a-82fd-b8c0df84309b';

  // Preprod-montreal EN
  const orgId = 'de20c43b-006c-4dc4-8c8b-3088e4da78eb';
  const orgUrl = '"https://org83620777-crm3.omnichannelengagementhub.com"';
  const appId = 'a21cdb1a-9fe7-4c57-bbb5-8e9a56374524';
  // Preprod HEM
  // const orgId = 'de20c43b-006c-4dc4-8c8b-3088e4da78eb';
  // const orgUrl = 'https://org83620777-crm3.omnichannelengagementhub.com';
  // const appId = '7770cd30-f7f7-4130-a0d5-5b48c67e3e6b';

  const omnichannelConfig: OmnichannelConfig = {
    orgId: orgId,
    orgUrl: orgUrl,
    widgetId: appId,
  };
  const chatSDKConfig = {
    // Optional
    dataMasking: {
      disable: false,
      maskingCharacter: '#',
    },
  };
  const isDesktop = true;
  const initPreChatSurveyData = {
    actions: [],
    body: [],
    type: '',
    version: '',
  };
  const TYPING_STOP_DELAY = 2000;

  const [startChatLoading, {open: openLoading, close: closeLoading}] = useDisclosure(false);
  const preChatSurveyRef = useRef<HTMLFormElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioMuteRef = useRef<boolean>(false);
  const [firstLoadingMessage, setFirstLoadingMessage] = useState(false);
  const [isUserViewAtBottom, setIsUserViewAtBottom] = useState(true);
  const [newMessageChecked, setNewMessageChecked] = useState(true);
  const [isAgentEndSession, setIsAgentEndSession] = useState(false);
  const [chatSDK, setChatSDK] = useState<OmnichannelChatSDK>(new OmnichannelChatSDK(omnichannelConfig, chatSDKConfig));
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<Array<GetMessagesProps>>([]);
  const [agentName, setAgentName] = useState<string>('Agent');
  const [preChatSurvey, setPreChatSurvey] = useState<PreChatSurveyProps>(initPreChatSurveyData);
  const [preChatSurveyResults, setPreChatSurveyResults] = useState<PreChatSurveyDataProps>();
  const [submittedPreChatSurvey, setSubmittedPreChatSurvey] = useState<boolean>(false);
  const [openChat, setOpenChat] = useState(false);
  const [agentIsTyping, setAgentIsTyping] = useState(false);
  const formCheckboxList: Array<string> = [];
/*

  const formConfig = (data: PreChatSurveyProps['body'])=> {
    const initialValues: UseFormInput<any>['initialValues'] = {};
    const validationRules:UseFormInput<any>['initialValues'] = {};

    data.forEach((item) => {
        if (item.type === 'Input.Text') {
          const inputData: IDprops = item.id && JSON.parse(item.id);
          initialValues[item.id] = '';
          if (inputData?.IsRequired) {
            if(item.id.indexOf('email') > -1){
              validationRules[item.id] = (value: string) =>
                (/^\S+@\S+$/.test(value) ? null : 'Invalid email');
            } else{
              validationRules[item.id] = (value: string) =>
                value?.trim() ? null : 'A required field cannot be empty';
            }
          }
        }

        if (item.type === 'Input.ChoiceSet') {
          const choiceId:IDprops = item?.id && JSON.parse(item.id);
          initialValues[item.id] = item.value;
          if (choiceId?.IsRequired) {
            validationRules[item.id] = (value:string) =>
              value ? null : 'Please select an option';
          }
        }

        if (item.type === 'Input.Toggle') {
          const toggleData = item?.id && JSON.parse(item.id);
          initialValues[item.id] = false;
          if (toggleData?.IsRequired) {
            validationRules[item.id] = (value: string) =>
              value ? null : 'This field is required';
          }
        }
    });
    return { initialValues, validationRules };
  };
*/


  const init = async () => {
    console.log('[init] chatSDK initialized', chatSDK);
    await chatSDK.initialize();
    // chatSDK.setDebug(true);
    setChatSDK(chatSDK);

    // preChatSurvey from Omnichannel config
    const preChatSurveyData = await chatSDK.getPreChatSurvey();
    setPreChatSurvey(preChatSurveyData);
    console.log('[init done]', preChatSurveyData);
  };

  const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onTypingEvent = useCallback(() => {
    console.log('Agent is typing...');
    setAgentIsTyping(true);
    if (agentTypingTimeoutRef.current) {
      clearTimeout(agentTypingTimeoutRef.current);
    }
    agentTypingTimeoutRef.current = setTimeout(() => {
      console.log('Agent stopped typing.');
      setAgentIsTyping(false);
      agentTypingTimeoutRef.current = null;
    }, TYPING_STOP_DELAY);
  }, []);

  // If end, you can show something like download the transcript logic
  const onAgentEndSession = useCallback(() => {
    console.log('Session ended!');
    setIsAgentEndSession(true);
  }, []);

  const onUserTypingEvent = useCallback(async () => {
    await chatSDK.sendTypingEvent();
  }, [chatSDK]);

  /*  const sendEmailTranscript = async () => {
      const body = {
        emailAddress: 'contoso@microsoft.com',
        attachmentMessage: 'Attachment Message'
      };
      await chatSDK.emailLiveChatTranscript(body);
    }*/

  const audioNotification = useCallback(() => {
    if (audioRef.current && !audioMuteRef.current) {
      audioRef.current.play();
    }
  }, []);

  const precessFileAttachment = async (fileMetadata: IFileMetadata) => {
    if (fileMetadata && Object.keys(fileMetadata).length > 0) {
      return URL.createObjectURL(await chatSDK.downloadFileAttachment(fileMetadata));
    }
    return '';
  };

  const onNewMessage = useCallback(
    async (message: IRawMessage & Pick<GetMessagesProps, 'fileBlob'>) => {
      console.log('onNewMessage', message);
      audioNotification();
      if (message?.fileMetadata && Object.keys(message?.fileMetadata).length > 0) {
        message.fileBlob = await precessFileAttachment(message.fileMetadata);
      }
      if (message?.sender?.displayName && message?.sender?.displayName !== '') {
        setAgentName(message?.sender?.displayName);
      }
      dispatch({type: ActionType.SET_LOADING, payload: false});
      const newMessage: GetMessagesProps = {
        ...message,
        type: 'agent',
        status: 'sent',
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      console.log('checkUserViewPosition()', checkUserViewPosition());
      if (!checkUserViewPosition()) {
        setNewMessageChecked(false);
      }
    },
    [audioNotification, dispatch],
  );

  const sendMessage = useCallback(async () => {
    console.log('sendMessage');
    const userNewMessage: ChatSDKMessage = {
      content: newMessage,
      timestamp: new Date(),
    };
    const userMessageStore: GetMessagesProps = {
      ...userNewMessage,
      type: 'user',
      status: 'sending',
    };
    setNewMessage('');
    console.log('Message sending');
    setMessages((prevMessages) => [...prevMessages, userMessageStore]);
    chatSDK
      .sendMessage(userNewMessage)
      .then(() => {
        console.log('Message sent');
        setMessages((prevMessages) => {
          const lastMessage = {...prevMessages[prevMessages.length - 1]};
          if (lastMessage.timestamp === userMessageStore.timestamp) {
            lastMessage.status = 'sent';
          }
          return [...prevMessages.slice(0, -1), lastMessage];
        });
      })
      .catch((error) => {
        console.error('Failed to send message', error);
      });
  }, [chatSDK, newMessage]);

  const getLiveChatContext = () => {
    const liveChatContext = localStorage.getItem('liveChatContext');
    if (liveChatContext && Object.keys(JSON.parse(liveChatContext)).length > 0) {
      return JSON.parse(liveChatContext);
    }
  };

  const getOtherInfo = async () => {
    const location = await getUserLocation();
    return {
      longitude: location?.longitude.toString(),
      latitude: location?.latitude.toString(),
      browser: getBrowserName(),
      os: getDeviceName(),
      device: isDesktop ? 'Desktop' : 'Mobile',
    };
  };

  const checkCurrentChatStatus = async () => {
    const location = await getUserLocation();
    console.log('location', location);
    const liveChatContext = getLiveChatContext();
    if (liveChatContext) {
      const chatState = await chatSDK.getConversationDetails({liveChatContext});
      console.log('checkCurrentChatStatus', chatState.state);
      if (
        chatState?.state === LiveWorkItemState.Active ||
        chatState?.state === LiveWorkItemState.Open ||
        chatState?.state === LiveWorkItemState.Waiting
      ) {
        setSubmittedPreChatSurvey(true);
        setOpenChat(true);
        await startChat({liveChatContext});
      } else {
        endChat().then(() => {
          setOpenChat(true);
        });
      }
    } else {
      setOpenChat(true);
    }
  };

  const getCurrentMessages = async () => {
    const getMessage: IMessage[] | OmnichannelMessage[] | undefined = await chatSDK.getMessages();
    console.log('getMessage', getMessage);
    const sortedMessages = getMessage?.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    const msg: Array<GetMessagesProps> = await Promise.all(
      sortedMessages?.map(async (message: GetMessagesProps) => {
        let type: GetMessagesProps['type'] = 'user';
        if (message?.tags?.length === 0) {
          type = 'agent';
        }
        for (const el of message?.tags || []) {
          if (el.indexOf('system') > -1 || el.indexOf('agent') > -1 || el.indexOf('bot') > -1 || el.indexOf('public') > -1) {
            type = 'agent';
            break;
          }
        }
        if (message?.sender?.displayName && message?.sender?.displayName !== '') {
          setAgentName(message?.sender?.displayName);
        }
        if (message.fileMetadata && message.sender?.displayName !== '') {
          message.fileBlob = await precessFileAttachment(message.fileMetadata);
        }

        return {
          ...message,
          type,
          status: 'sent',
        };
      }) || [],
    );
    console.log('msg', msg);
    setMessages(msg);
    setFirstLoadingMessage(true);
  };
  useEffect(() => {
    if (firstLoadingMessage) {
      scrollToBottom();
    }
  }, [firstLoadingMessage]);

  const getUserLocation = async () => {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    return {
      longitude: position?.coords.longitude,
      latitude: position?.coords.latitude,
    };
  };

  const startChat = useCallback(
    async (optionalParam?: StartChatOptionalParams) => {
      if (state.hasChatStarted) {
        console.log('[Already started]');
        return;
      }
      console.log('[startChat]');
      const otherInfo = await getOtherInfo();
      const optionalParams: StartChatOptionalParams = {
        ...optionalParam,
        ...otherInfo,
        // customContext, // Custom Context
        // sendDefaultInitContext: true, // Send default init context ⚠️ Web only
      };
      console.log('optionalParams', optionalParams);
      // Check for active conversation in cache
      const cachedLiveChatContext = localStorage.getItem('liveChatContext');
      if (cachedLiveChatContext && Object.keys(JSON.parse(cachedLiveChatContext)).length > 0) {
        optionalParams.liveChatContext = JSON.parse(cachedLiveChatContext);
      }

      dispatch({type: ActionType.SET_CHAT_STARTED, payload: true});
      openLoading();
      try {
        await chatSDK.startChat(optionalParams);
      } catch (error) {
        // @ts-expect-error there is message in error
        console.log(`Unable to start chat: ${error.message}`);
        return;
      }

      // Cache current conversation context
      const liveChatContext = await chatSDK.getCurrentLiveChatContext();
      console.log('liveChatContext', liveChatContext);
      if (liveChatContext && Object.keys(liveChatContext).length) {
        localStorage.setItem('liveChatContext', JSON.stringify(liveChatContext));
      }
      // const transcript =  await chatSDK.getLiveChatTranscript(optionalParams);
      // console.log('transcript', transcript);
      // console.log('transcript', JSON.parse(transcript.chatMessagesJson));
      // , {rehydrate: true}

      await getCurrentMessages();
      await chatSDK.onNewMessage(onNewMessage);
      await chatSDK.onTypingEvent(onTypingEvent);
      await chatSDK.onAgentEndSession(onAgentEndSession);
      closeLoading();
    },
    [chatSDK, state, dispatch],
  );

  const endChat = async (status?: ChatStatusType) => {
    console.log('[endChat] status:', status);
    if (status === LiveWorkItemState.Active || status === LiveWorkItemState.WrapUp) {
      const endStatus = await chatSDK.endChat();
      console.log('endStatus', endStatus);
      localStorage.removeItem('liveChatContext');
      setOpenChat(false);
      setSubmittedPreChatSurvey(false);
      setPreChatSurveyResults(undefined);
      dispatch({type: ActionType.SET_CHAT_STARTED, payload: false});
    } else {
      localStorage.removeItem('liveChatContext');
      setPreChatSurvey(initPreChatSurveyData);
      setPreChatSurveyResults(undefined);
      setSubmittedPreChatSurvey(false);
      await init();
    }
  };

  const preChatSurveySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('[preChatSurveySubmit]', e);
    e.preventDefault();
    const formData: FormData = new FormData(e.target as HTMLFormElement);
    const preSurveyData: {
      [name: string]: string | FormDataEntryValue;
    } = {
      Type: Constants.InputSubmit,
    };
    let isValid = false;
    formData.forEach((value, key) => {
      if(key.toLowerCase().indexOf('email') > -1){
        console.log('email', value);
        const emailRegex = /^\S+@\S+$/;
        if (!emailRegex.test(value.toString())) {
          isValid = false;
        } else{
          isValid = true;
        }
      }
      preSurveyData[key] = value.toString();
    });
    if(!isValid) {

    }
    const checkboxes = preChatSurveyRef?.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes?.forEach((checkbox) => {
      const checkboxName = checkbox.name;
      const rightItem: ChatSurveyBodyProps | undefined = preChatSurvey.body.find(
        (item) => (item as InputToggleField).id === checkboxName,
      );
      if (rightItem) {
        preSurveyData[checkboxName] = checkbox.checked
          ? (rightItem as InputToggleField).valueOn || 'true'
          : (rightItem as InputToggleField).valueOff || 'false';
      }
    });
    if (preSurveyData && Object.keys(preSurveyData).length > 0) {
      setPreChatSurveyResults(preSurveyData);
      setSubmittedPreChatSurvey(true);
    }
  };

  const checkUserViewPosition = () => {
    if (!chatBodyRef.current) return;
    const {scrollTop, scrollHeight, clientHeight} = chatBodyRef.current;
    const isAtBottomNow = scrollTop + clientHeight >= scrollHeight - 10;
    setIsUserViewAtBottom(isAtBottomNow);
    return isAtBottomNow;
  };

  const scrollToBottom = () => {
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
    setNewMessageChecked(true);
  };

  useEffect(() => {
    if (isUserViewAtBottom) {
    }
  }, [isUserViewAtBottom]);

  useEffect(() => {
    if (preChatSurveyResults && Object.keys(preChatSurveyResults).length > 0) {
      startChat({preChatResponse: preChatSurveyResults}).catch((error) => {
        console.error('Failed to start chat', error);
      });
    }
  }, [preChatSurveyResults]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      init();
    }
  }, []);

  return (
    <Box pos="relative">
      <LoadingOverlay visible={startChatLoading} zIndex={1000} overlayProps={{radius: "sm", blur: 2}}/>
      <div className={styles.chatWidget}>
        {!openChat && (
          <div className={styles.chatWidgetIcon}>
            <Button
              variant="filled"
              onClick={checkCurrentChatStatus}
              className={styles.button}
            >Open Chat</Button>
          </div>
        )}
        {openChat && (
          <div className={styles.chatWidgetContainer}>
            <div className={styles.chatContainerHeader}>
              <div>Logo</div>
              <Button
                variant="filled"
                onClick={() => endChat(LiveWorkItemState.Active)}
                className={styles.chatEndButton}
              >X</Button></div>
            <div className={styles.chatContainerBody}>
              {!preChatSurveyResults && !submittedPreChatSurvey && (
                <div className={styles.chatContainerContent}>
                  <form
                    onSubmit={preChatSurveySubmit}
                    id={'preChatSurveyForm'}
                    ref={preChatSurveyRef}
                  >
                    {preChatSurvey?.body?.map((item, index) => {
                      switch (item.type) {
                        case 'TextBlock': {
                          return <div key={index} className={clsx(
                            styles.textBlock,
                            styles.eachItem,
                            {
                              [styles.bolder]: item?.weight == 'bolder',
                            })
                          }>{decodeHtmlEntities(item.text)}</div>;
                        }
                        case 'Input.Text': {
                          const inputData = item?.id && JSON.parse(item.id);
                          const title = inputData.IsOption ? `* ${inputData.Name}` : inputData.Name;
                          const inputProps = {
                            type: "text",
                            maxLength: inputData.maxLength || 20,
                            name: item.id,
                            id: inputData.id,
                            'aria-required': inputData.IsRequired,
                            'aria-label': title,
                            required: inputData.IsRequired,
                          }
                          return (
                            <div key={index}>
                              <Input className={styles.eachItem} {...inputProps} />
                              <div></div>
                            </div>
                          );
                        }
                        case 'Input.ChoiceSet': {
                          const choiceId = item?.id && JSON.parse(item.id);
                          return (
                            <Select
                              key={index}
                              className={styles.eachItem}
                              name={item.id}
                              id={choiceId.id}
                              defaultValue={item.value}
                              required={choiceId.IsRequired}
                              data={item?.choices?.map((opt: ChoicesProps) => {
                                return {value: opt.value, label: opt.title};
                              })}
                            />

                          );
                        }
                        case 'Input.Toggle': {
                          const toggleData = item?.id && JSON.parse(item.id);
                          formCheckboxList.push(toggleData.id);
                          return (
                            <Checkbox
                              key={index}
                              className={styles.eachItem}
                              label={item.title}
                              name={item.id}
                              required={toggleData.IsRequired}
                              id={toggleData.id}
                              value={toggleData.valueOn}
                            />
                          );
                        }
                        default:
                          return <div key={index}  className={styles.eachItem}>Something wrong!!!</div>;
                      }
                    })}
                    {preChatSurvey?.actions?.map((item, index) => {
                      switch (item.type) {
                        case 'Action.Submit':
                          return (
                            <Button
                              key={index}
                              className={styles.eachItem}
                              type="submit"
                            >{item.title}</Button>
                          );
                        default:
                          return (
                            <Button
                              key={index}
                              className={styles.eachItem}
                              type="button"
                            >{item.title}</Button>
                          );
                      }
                    })}
                  </form>
                </div>
              )}
              {submittedPreChatSurvey && (
                <div
                  id="WebChat"
                  className={styles.chatConversationContainer}
                >
                  {!startChatLoading ? (
                    <>
                      <div
                        ref={chatBodyRef}
                        className={styles.conversationBody}
                      >
                        {messages.map((message, index) => {
                          if (message?.fileMetadata && Object.keys(message?.fileMetadata).length > 0 && message.fileBlob) {
                            if (message.fileMetadata?.type.indexOf('image') > -1) {
                              return (
                                <div
                                  key={index}
                                  className={styles.message}
                                >
                                  image:{' '}
                                  <img
                                    src={message.fileBlob}
                                    alt={message.fileMetadata.name}
                                  />
                                  <div>
                                    <a
                                      href={message.fileBlob}
                                      download={message.fileMetadata.name}
                                    >
                                      {message.fileMetadata.name}
                                    </a>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <a
                                  key={index}
                                  href={message.fileBlob}
                                  download={message.fileMetadata?.name}
                                >
                                  {message.fileMetadata?.name}
                                </a>
                              );
                            }
                          }
                          return (
                            <div
                              key={index}
                              className={styles.message}
                              style={{textAlign: message.type === 'user' ? 'right' : 'left'}}
                            >
                              <p>{message.content}</p>
                              <p>
                                {dayjs(message.timestamp).format('HH:MM A')} -{' '}
                                {message.type === 'user' && index === messages.length - 1 && message.status}
                              </p>
                              <p>need local time</p>
                            </div>
                          );
                        })}
                        {agentIsTyping && <div>{agentName} is typing ...</div>}
                      </div>
                      {!isUserViewAtBottom && !newMessageChecked && <div onClick={scrollToBottom}>New Message</div>}
                    </>
                  ) : (
                    <div>Loading...</div>
                  )}
                </div>
              )}
            </div>
            {submittedPreChatSurvey && (
              <div className={styles.chatContainerFooter}>
                <div className={styles.inputSubmit}>
                  <input
                    disabled={isAgentEndSession}
                    type="text"
                    placeholder={'ask agent'}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      onUserTypingEvent();
                    }}
                    value={newMessage}
                  />
                  <button
                    disabled={isAgentEndSession}
                    onClick={sendMessage}
                  >
                    Send
                  </button>
                  <audio
                    hidden={true}
                    controls
                    ref={audioRef}
                  >
                    <source
                      src={NewMessageNotificationSoundBase64}
                      type="audio/ogg"
                    />
                  </audio>
                  <div
                    onClick={() => {
                      audioMuteRef.current = !audioMuteRef.current;
                    }}
                  >
                    {audioMuteRef.current ? 'Mute' : 'unmute'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Box>
  );
};
