import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import { ScreenHeader } from '../../components/ScreenHeader';

import { getSocket } from '../../services/socket/socketClient';
import { startChat, appendChatMessage, fetchChatHistory, setChatId } from '../../redux/slices/chatSlice';
import { Keyboard } from 'react-native';

interface Message {
  id: string;
  senderType: 'driver' | 'rider';
  message: string;
  timestamp: string;
}

const RideChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const isDark = useAppSelector(state => state.theme.isDark);
  const dispatch = useAppDispatch();
  
  const activeRide = useAppSelector(state => state.ride.activeRide);

  const rideCustomer = (activeRide as any)?.userId || activeRide?.customer;
  const riderName = rideCustomer?.name || activeRide?.customer?.name || 'Rider';
  const riderPhone = rideCustomer?.phone || activeRide?.customer?.phone || '';
  const riderRating = rideCustomer?.rating || activeRide?.customer?.rating || 4.8;

  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const driverId = (driver as any)?._id || (driver as any)?.id;
  const userIdId =
    (typeof rideCustomer === 'string' ? rideCustomer : null) ||
    rideCustomer?._id ||
    rideCustomer?.id ||
    (activeRide as any)?.customerId?._id ||
    (activeRide as any)?.customerId ||
    null;
  const rideId = activeRide?.id || (activeRide as any)?._id;
  const rideChatId =
    (activeRide as any)?.chatId ||
    (activeRide as any)?.chat?._id ||
    (activeRide as any)?.chat?.id ||
    null;

  const [inputText, setInputText] = useState('');
  const chatId = useAppSelector(state => state.chat.chatId);
  const participantKey = useAppSelector(state => state.chat.participantKey);
  const rideKey = useAppSelector(state => state.chat.rideKey);
  const messages = useAppSelector(state => state.chat.messages);
  const [loading, setLoading] = useState(true);
 const scrollViewRef = useRef<ScrollView>(null);
  const quickReplies = [
    'I have arrived!',
    'On my way!',
    'Where are you standing?',
    'Stuck in traffic, 5 mins.',
    'Please wait near the gate.',
  ];


   const [keyboardHeight, setKeyboardHeight] = useState(0);

   useEffect(() => {
     if (Platform.OS === 'ios') return;

     const showSubscription = Keyboard.addListener('keyboardDidShow', e => {
       setKeyboardHeight(e.endCoordinates.height);
       setTimeout(() => {
         scrollViewRef.current?.scrollToEnd({ animated: true });
       }, 50);
     });
     const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
       setKeyboardHeight(0);
     });

     return () => {
       showSubscription.remove();
       hideSubscription.remove();
     };
   }, []);

     useEffect(() => {
       const timeout = setTimeout(() => {
         scrollViewRef.current?.scrollToEnd({ animated: true });
       }, 100);
       return () => clearTimeout(timeout);
     }, [messages]);
  // Auto scroll to end on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

  // Start chat session and fetch messages
  useEffect(() => {
    const initChat = async () => {
      if (!driverId || !userIdId) {
        console.warn('[RideChat] Missing driverId or userIdId', { driverId, userIdId });
        setLoading(false);
        return;
      }

      if (rideChatId) {
        const currentRideKey = rideId || null;
        if (chatId === rideChatId && rideKey === currentRideKey && messages.length > 0) {
          console.log('[RideChat] Reusing loaded ride chat without refetch:', rideChatId);
          setLoading(false);
          return;
        }

        try {
          console.log('[RideChat] Using active ride chatId:', rideChatId);
          if (chatId !== rideChatId) {
            dispatch(setChatId(rideChatId));
          }
     
        } catch (error) {
          console.error('[RideChat] Failed to load ride chat history:', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      const currentParticipantKey = `${driverId}:${userIdId}`;
      const currentRideKey = rideId || null;
      if (chatId && participantKey === currentParticipantKey && rideKey === currentRideKey) {
        console.log('[RideChat] Reusing existing chat state for ride:', currentRideKey);
        setLoading(false);
        return;
      }

      try {
      console.log('[RideChat] dispatch start', Date.now());
      await dispatch(startChat({ driverId, userId: userIdId, rideId: rideId || undefined })).unwrap();
      console.log('[RideChat] dispatch done', Date.now());
      } catch (error) {
        console.error('[RideChat] Failed to load chat history:', error);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [chatId, participantKey, rideKey, messages.length, driverId, userIdId, rideId, rideChatId, dispatch]);

   useFocusEffect(
     useCallback(() => {
       const historyChatId = chatId ?? rideChatId;
       if (!historyChatId) return;

       let cancelled = false;
       (async () => {
         try {
           console.log(
             '[RideChat] Fetching history for chatId:',
             historyChatId,
           );
           await dispatch(fetchChatHistory(historyChatId)).unwrap();
         } catch (error) {
           console.error('[RideChat] Failed to fetch chat history:', error);
         } finally {
           if (!cancelled) {
             setLoading(false);
           }
         }
       })();

       return () => {
         cancelled = true;
       };
     }, [chatId, rideChatId, dispatch]),
   );
  const [socket, setSocket] = useState<any>(null);

  // Poll for socket availability
  useEffect(() => {
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

  // Setup Socket connection listeners
  useEffect(() => {
    if (!chatId || !driverId || !socket) return;

    const joinRideChat = () => {
      socket.emit('join_chat', {
        chatId,
        userId: driverId,
        role: 'driver',
      });
    };

    const handleReceiveMessage = (payload: any) => {
      const msg =
        payload?.message && typeof payload.message === 'object'
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
      if (messageChatId && String(messageChatId) !== String(chatId)) {
        return;
      }

      const senderId = String(
        msg.senderId?._id || msg.senderId?.id || msg.senderId || '',
      );
      const senderType = String(msg.senderType || msg.role || '').toLowerCase();
      if (senderId === String(driverId) || senderType === 'driver') return;

      const timestampValue = msg.timestamp || msg.createdAt || msg.created_at;
      const parsedTimestamp = timestampValue ? new Date(timestampValue) : new Date();
      const timestamp = Number.isNaN(parsedTimestamp.getTime())
        ? new Date().toISOString()
        : parsedTimestamp.toISOString();
      const messageText =
        typeof msg.message === 'string' ? msg.message.trim() : '';
      if (!messageText) return;

      dispatch(
        appendChatMessage({
          id: String(
            msg._id ||
              msg.id ||
              `socket-${chatId}-${timestamp}-${senderId}`,
          ),
          senderType: 'rider',
          message: messageText,
          timestamp,
        }),
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('connect', joinRideChat);
    if (socket.connected) {
      joinRideChat();
    }

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('connect', joinRideChat);
    };
  }, [chatId, driverId, socket, dispatch]);

  const handleSend = (textToSend: string) => {

    if (!textToSend.trim() || !chatId || !driverId) return;

    const socket = getSocket();

    if (!socket) {
      console.warn('[RideChat] Socket not connected, cannot send message');
      return;
    }

    // Emit via socket
    socket.emit('send_message', {
      chatId,
      senderId: driverId,
      senderType: 'driver',
      message: textToSend.trim(),
      rideId,
    });

    // Optimistic UI update
    const driverMsg: Message = {
      id: `${Date.now()}-local`,
      senderType: 'driver',
      message: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    dispatch(appendChatMessage(driverMsg));
    setInputText('');
  };

  const handleCall = () => {
    if (riderPhone) {
      Linking.openURL(`tel:${riderPhone}`);
    } else {
      Alert.alert('Calling Rider', `Connecting to ${riderName}...`);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isDriver = item.senderType === 'driver';
    return (
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: isDriver ? 'flex-end' : 'flex-start',
          marginBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        {/* {!isDriver && (
          <View className="w-8 h-8 rounded-full bg-accent items-center justify-center mr-2">
            <Text className="text-sm font-bold text-white">
              {riderName[0]?.toUpperCase()}
            </Text>
          </View>
        )} */}

        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isDriver
              ? COLORS.primary
              : isDark
              ? COLORS.darkCard
              : COLORS.white,
            borderWidth: isDriver ? 0 : 1,
            borderColor: isDark ? COLORS.darkBorder : '#e2e8f0',
            padding: 12,
          
            borderTopRightRadius: isDriver ? 16 : 16,
            borderTopLeftRadius: isDriver ? 16 : 16,
            borderBottomRightRadius: isDriver ? 0 : 16,
            borderBottomLeftRadius: isDriver ? 16 : 0,
          }}
        >
          <Text
            style={{
              color: isDriver ? 'white' : isDark ? COLORS.textDark : '#0f172a',
            }}
          >
            {item.message}
          </Text>

          <Text
            style={{
              fontSize: 10,
              marginTop: 6,
              textAlign: 'right',
              color: isDriver
                ? 'rgba(255,255,255,0.7)'
                : isDark
                ? COLORS.textDarkSecondary
                : '#94a3b8',
            }}
          >
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg"   style={{
       
        paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
      }}>
      <ScreenHeader
        title={
          <View className="items-center">
            <Text className="text-base font-extrabold text-textLight dark:text-textDark">{riderName}</Text>
            <View className="flex-row items-center mt-0.5">
              <Icon name="star" size={13} color="#EAB308" />
              <Text className="text-xs font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1">{riderRating.toFixed(1)}</Text>
            </View>
          </View>
        }
        rightElement={
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? COLORS.darkBg : '#F1F5F9' }}
            onPress={handleCall}
          >
            <Icon name="call" size={20} color={isDark ? COLORS.textDark : '#0F172A'} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer Area */}
        {/* Quick Replies */}
        <View className="bg-transparent px-4 pb-2">
          <FlatList
            horizontal
            data={quickReplies}
            keyExtractor={(item, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-lightBg dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-full px-4 py-2 mr-2 active:bg-lightCard dark:active:bg-darkBg"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 1,
                  elevation: 1,
                }}
                onPress={() => handleSend(item)}
              >
                <Text className="text-xs font-bold text-textLight dark:text-textDark">
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input Bar */}
        <View className="bg-lightBg dark:bg-darkCard border-t border-lightBorder dark:border-darkBorder px-4 py-3 flex-row items-center">
          <View className="flex-1 flex-row items-center bg-lightCard dark:bg-darkBg rounded-full px-4 py-1.5 border border-lightBorder dark:border-darkBorder">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message rider..."
              placeholderTextColor={
                isDark ? COLORS.textDarkSecondary : '#9CA3AF'
              }
              className="flex-1 text-[15px] text-textLight dark:text-textDark py-1.5"
              onSubmitEditing={() => handleSend(inputText)}
            />
          </View>

          <TouchableOpacity
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full items-center justify-center ml-2.5"
            style={{
              backgroundColor: inputText.trim()
                ? COLORS.primary
                : isDark
                ? COLORS.darkBg
                : '#CBD5E1',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 1,
              elevation: 1,
            }}
          >
            <Icon
              name="send"
              size={18}
              color={
                inputText.trim()
                  ? '#FFFFFF'
                  : isDark
                  ? COLORS.textDarkSecondary
                  : '#94A3B8'
              }
              className="ml-0.5"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default RideChatScreen;
