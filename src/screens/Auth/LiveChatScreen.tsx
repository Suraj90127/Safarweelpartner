import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import {
  startSupportChat,
  fetchSupportChatHistory,
  resetSupportChat,
  appendSupportChatMessage,
} from '../../redux/slices/supportChatSlice';
import { ChatMessage } from '../../api/chatApi';
import { getSocket } from '../../services/socket/socketClient';
import { fetchDriverProfileThunk } from '../../redux/slices/driverSlice';

const LiveChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const flatListRef = useRef<FlatList>(null);
  const isDark = useAppSelector(state => state.theme.isDark);

  const chatId = useAppSelector(state => state.supportChat.chatId);
  const messages = useAppSelector(state => state.supportChat.messages);
  const isStarting = useAppSelector(state => state.supportChat.isStarting);
  const isHistoryLoading = useAppSelector(state => state.supportChat.isHistoryLoading);
  const isSending = useAppSelector(state => state.supportChat.isSending);
  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const driverId = (driver as any)?._id || (driver as any)?.id;

  const [socket, setSocket] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Poll for socket availability (same pattern as RideChatScreen)
    const s = getSocket();
    if (s) {
      setSocket(s);
    } else {
      const timer = setInterval(() => {
        const activeSocket = getSocket();
        if (activeSocket) {
          setSocket(activeSocket);
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, []);

   React.useEffect(() => {
      const task = InteractionManager.runAfterInteractions(() => {
       
        dispatch(fetchDriverProfileThunk());
      });
      return () => task.cancel();
    }, [dispatch]);
  

  useEffect(() => {
    // Start support chat session on mount
    dispatch(startSupportChat({}))
      .unwrap()
      .then((res) => {
        const id = res?.id || res?._id;
        if (id) {
          dispatch(fetchSupportChatHistory(id))
            .unwrap()
            .finally(() => {
              setIsInitialLoading(false);
            });
        } else {
          setIsInitialLoading(false);
        }
      })
      .catch((err) => {
        console.error('[LiveChatScreen] Failed to start support chat:', err);
        setIsInitialLoading(false);
      });

    return () => {
      // Clean up local chat state on unmount
      dispatch(resetSupportChat());
    };
  }, [dispatch]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length]);

  // Register listeners before joining so the first room message cannot be missed.
  useEffect(() => {
    if (!chatId || !driverId || !socket) return;

    const handleReceiveMessage = (payload: any) => {
      const msg = payload?.message && typeof payload.message === 'object'
        ? payload.message
        : payload?.data && typeof payload.data === 'object'
          ? payload.data
          : payload?.payload && typeof payload.payload === 'object'
            ? payload.payload
          : payload;
      if (!msg || typeof msg !== 'object') return;

      const messageChatId =
        msg.chatId ||
        msg.chat_id ||
        msg.conversationId ||
        msg.chat?._id ||
        msg.chat?.id;
      if (messageChatId && String(messageChatId) !== String(chatId)) return;

      const senderId = String(msg.senderId?._id || msg.senderId?.id || msg.senderId || '');
      const senderType = String(msg.senderType || msg.role || '').toLowerCase();
      if (senderId === String(driverId) || senderType === 'driver') return;

      const timestampValue = msg.timestamp || msg.createdAt || msg.created_at;
      const parsedTimestamp = timestampValue ? new Date(timestampValue) : new Date();
      const timestamp = Number.isNaN(parsedTimestamp.getTime())
        ? new Date().toISOString()
        : parsedTimestamp.toISOString();

      dispatch(appendSupportChatMessage({
        _id: String(msg._id || msg.id || `socket-${chatId}-${timestamp}-${senderId}`),
        senderId: senderId || 'admin',
        senderType: 'admin',
        message: typeof msg.message === 'string' ? msg.message : '',
        image: typeof msg.image === 'string' ? msg.image : undefined,
        timestamp,
      }));
    };

    socket.on(SOCKET_EVENTS.SUPPORT_RECEIVE_MESSAGE, handleReceiveMessage);
    socket.on('receive_message', handleReceiveMessage);

    const joinSupportRoom = () => {
      console.log('[LiveChat] Joining support room:', chatId);
      const roomPayload = {
        chatId,
        roomName: `support_chat_${chatId}`,
        userId: driverId,
        senderId: driverId,
        role: 'driver',
      };
      socket.emit(SOCKET_EVENTS.SUPPORT_JOIN, roomPayload);
    };

    socket.on('connect', joinSupportRoom);
    if (socket.connected) {
      joinSupportRoom();
    }

    return () => {
      socket.off('connect', joinSupportRoom);
      socket.off(SOCKET_EVENTS.SUPPORT_RECEIVE_MESSAGE, handleReceiveMessage);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [chatId, driverId, socket, dispatch]);

  const formatMessageTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    } catch {
      return timeStr;
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !chatId) return;

    const messageText = inputText.trim();
    setInputText('');

    // Add message to UI immediately (optimistic)
    dispatch(appendSupportChatMessage({
      _id: 'temp-' + Date.now(),
      senderId: driverId || 'driver',
      senderType: 'driver',
      message: messageText,
      timestamp: new Date().toISOString(),
    }));

    // Send via socket only — no API call
    const currentSocket = getSocket();
    console.log('[LiveChat] Sending message via socket:', messageText,driverId);
    if (currentSocket?.connected) {
      currentSocket.emit(SOCKET_EVENTS.SUPPORT_SEND_MESSAGE, {
        chatId,
        senderId: driverId,
        senderType: 'driver',
        message: messageText,
      });
    } else {
      console.warn('[LiveChat] Socket not connected, message may not be delivered');
    }
  };

  const handleAttachment = () => {
    if (!chatId) return;

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          const base64Image = asset.base64 ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}` : undefined;
          if (base64Image) {
            // Add image to UI immediately (optimistic)
            dispatch(appendSupportChatMessage({
              _id: 'temp-img-' + Date.now(),
              senderId: driverId || 'driver',
              senderType: 'driver',
              image: base64Image,
              message: '',
              timestamp: new Date().toISOString(),
            }));

            // Send via socket only — no API call
            const currentSocket = getSocket();
            if (currentSocket?.connected) {
              currentSocket.emit(SOCKET_EVENTS.SUPPORT_SEND_MESSAGE, {
                chatId,
                senderId: driverId,
                senderType: 'driver',
                image: base64Image,
                message: '',
              });
            }
          }
        }
      }
    );
  };

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isDriver = item.senderType !== 'admin';
    const formattedTime = formatMessageTime(item.timestamp);

    if (isDriver) {
      return (
        <View className="align-end items-end px-4 mb-4">
          <View className="bg-lightBorder dark:bg-darkCard rounded-xl rounded-tr-none px-4 py-2.5 max-w-[80%] shadow-sm">
            {item.message ? (
              <Text className="text-[15px] text-textLight dark:text-textDark leading-normal mb-1">{item.message}</Text>
            ) : null}

            {/* {item.image ? (
              <Image 
                source={{ uri: item.image }} 
                className="w-48 h-36 rounded-lg mt-1 mb-1" 
                resizeMode="cover"
              />
            ) : null} */}

            <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary text-right mt-1 font-medium">
              {formattedTime}
            </Text>
          </View>
        </View>
      );
    }

    // Agent/Admin message
    return (
      <View className="flex-row items-start px-4 mb-4">
        {/* Avatar */}
        {/* <View className="w-9 h-9 rounded-full bg-accent items-center justify-center mr-2 shadow-sm border border-accent">
          <Icon name="crown" size={16} color={COLORS.secondary} />
        </View> */}

        {/* Message bubble */}
        <View className="bg-lightBg dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-xl rounded-tl-none px-4 py-2.5 max-w-[75%] shadow-sm">
          {item.message ? (
            <Text className="text-[15px] text-textLight dark:text-textDark leading-normal">
              {item.message}
            </Text>
          ) : null}

          {item.image ? (
            <Image
              source={{ uri: item.image }}
              className="w-48 h-36 rounded-lg mt-1 mb-1"
              resizeMode="cover"
            />
          ) : null}

          <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-1 font-medium">
            {formattedTime}
          </Text>
        </View>
      </View>
    );
  }, [isDark, driverId]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-lightBg dark:bg-darkBg">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenHeader
          title={
            <View className="items-center">
              <Text className="text-lg font-bold text-textLight dark:text-textDark">Help & Support</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary font-medium mt-0.5">
                Ticket ID : {chatId ? chatId.slice(-8).toUpperCase() : 'Loading...'}
              </Text>
            </View>
          }
        />


        {/* Chat Messages */}
        {isStarting || isInitialLoading ? (
          <View className="flex-1 justify-center items-center bg-lightCard dark:bg-darkBg">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item._id || item.timestamp || Math.random().toString()}
            contentContainerStyle={{ flexGrow: 1, paddingVertical: 16, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            className="flex-1 bg-lightCard dark:bg-darkBg"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Footer Area */}

        <View className="bg-lightBg dark:bg-darkCard border-t border-lightBorder dark:border-darkBorder pt-3 px-4 pb-3">
          {/* Input field and send button */}
          <View className="flex-row items-center mb-3">
            <View className="flex-1 flex-row items-center bg-lightCard dark:bg-darkBg rounded-full px-4 py-1.5 border border-lightBorder dark:border-darkBorder">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message"
                placeholderTextColor={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
                className="flex-1 text-[15px] text-textLight dark:text-textDark py-1.5 mr-2"
                onSubmitEditing={handleSend}
                editable={!!chatId && !isSending}
              />
              {/* <TouchableOpacity
                className="p-1"
                onPress={handleAttachment}
                disabled={!chatId || isSending}
              >
                <Icon name="attach" size={24} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
              </TouchableOpacity> */}
            </View>

            <Button
              onPress={handleSend}
              disabled={!inputText.trim() || isSending || !chatId}
              isLoading={isSending}
              height={44}
              borderRadius={22}
              style={{ width: 44, marginLeft: 8 }}
              contentStyle={{ paddingHorizontal: 0 }}
            >
              <Icon
                name="send"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 2 }}
              />
            </Button>
          </View>
        </View>

        {/* Support Info Banner */}
        <View
          className="bg-[#E28A5B] dark:bg-[#EA580C] items-center justify-center py-3 px-4"
          style={{ paddingBottom: 12 + SAFE_BOTTOM }}
        >
          <Text className="text-white text-[14px] font-bold">
            Our support team typically replies within a few minutes.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SAFE_BOTTOM = Platform.OS === 'ios' ? 34 : 0;

export default LiveChatScreen;
