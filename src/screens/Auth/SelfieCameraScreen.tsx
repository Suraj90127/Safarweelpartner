import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, { ToastType } from '../../components/Toast';
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevices, useCameraPermission, usePhotoOutput, CameraRef } from 'react-native-vision-camera';
import { useThemePalette } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const SelfieCameraScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const { palette } = useThemePalette();

  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: ToastType }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), []);

  const showToast = useCallback((title: string, message: string = '', type: ToastType = 'info') => {
    setToast({ visible: true, title, message, type });
  }, []);

  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAsset, setPhotoAsset] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'front') || devices.find(d => d.position === 'back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      const photoFile = await photoOutput.capturePhotoToFile(
        { flashMode: 'off', enableShutterSound: true },
        {}
      );

      if (photoFile && photoFile.filePath) {
        const localUri = `file://${photoFile.filePath}`;
        setPhotoUri(localUri);
        setPhotoAsset({
          uri: localUri,
          type: 'image/jpeg',
          fileName: `selfie_${Date.now()}.jpg`,
        });
      }
    } catch (error: any) {
      console.log('Capture Error:', error);
      showToast('Capture Failed', error.message || 'Could not capture photo.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirm = () => {
    if (photoUri && photoAsset && route.params?.onSelfieCaptured) {
      route.params.onSelfieCaptured(photoUri, photoAsset);
      navigation.goBack();
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View
          className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 py-3 bg-transparent z-10"
          style={{ paddingTop: Math.max(insets.top, 12) }}
        >
          <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Selfie</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 justify-center items-center px-8 bg-black">
          <Icon name="camera-outline" size={64} color="#EF4444" />
          <Text className="text-white text-base text-center mt-4 mb-6">
            Camera permission is required to capture documents.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: palette.primary }}
            className="py-3 px-6 rounded-xl"
            onPress={async () => {
              const granted = await requestPermission();
              if (!granted) {
                showToast('Permission Denied', 'Please grant camera access in settings.', 'warning');
              }
            }}
          >
            <Text className="text-white text-base font-extrabold">Grant Permission</Text>
          </TouchableOpacity>
        </View>
        <Toast {...toast} onDismiss={hideToast} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View
        className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 py-3 bg-transparent z-10"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Selfie</Text>
        <View className="w-10" />
      </View>

      {/* Camera Area / Preview Area */}
      <View className="absolute inset-0 bg-[#1E1E1E]">
        {photoUri ? (
          // Captured Preview
          <Image source={{ uri: photoUri }} className="absolute inset-0" resizeMode="cover" />
        ) : device ? (
          // Live Camera Feed
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isFocused}
            outputs={[photoOutput]}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text className="text-white text-base mt-3 font-semibold">Loading Camera...</Text>
          </View>
        )}

        {/* Silhouette overlay */}
        <View className="absolute inset-0" pointerEvents="none">
          {/* Dark mask overlay around the face oval cutout */}
          <View className="bg-black/70" style={{ height: height * 0.15 }} />
          <View className="flex-row" style={{ height: height * 0.45 }}>
            <View className="flex-1 bg-black/70" />
            <View className="bg-transparent justify-center items-center" style={{ width: width * 0.75 }}>
              {/* Silhouette guide border */}
              <View
                className="w-full h-full border-2 border-white border-dashed"
                style={{ borderRadius: (width * 0.75) / 2 }}
              />
            </View>
            <View className="flex-1 bg-black/70" />
          </View>
          <View className="flex-1 bg-black/70" />
        </View>
      </View>

      {/* Bottom Controls */}
      <View
        className="absolute left-0 right-0 justify-center items-center bg-transparent z-10"
        style={{ bottom: insets.bottom + 24 }}
      >
        {photoUri ? (
          // Options after capturing photo
          <View className="flex-row justify-around w-full px-6">
            <TouchableOpacity
              className="flex-row items-center bg-white/20 py-3.5 px-7 rounded-full min-w-[130px] justify-center"
              onPress={() => setPhotoUri(null)}
            >
              <Icon name="refresh-outline" size={20} color="#FFFFFF" className="mr-2" />
              <Text className="text-white text-base font-bold">Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: palette.primary }}
              className="flex-row items-center py-3.5 px-7 rounded-full min-w-[130px] justify-center shadow-md"
              onPress={handleConfirm}
            >
              <Icon name="checkmark-outline" size={20} color="#FFFFFF" className="mr-2" />
              <Text className="text-white text-base font-extrabold">Use Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Capture button
          <TouchableOpacity
            className="items-center justify-center"
            onPress={handleCapture}
            disabled={isCapturing || !device}
          >
            <View className="w-[76px] h-[76px] rounded-full border-4 border-white justify-center items-center">
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View className="w-[60px] h-[60px] rounded-full bg-white" />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Animated Toast Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

export default SelfieCameraScreen;
