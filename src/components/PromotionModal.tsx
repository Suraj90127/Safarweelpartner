import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchPopupThunk } from '../redux/slices/popupSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PromotionModalProps {
  visible: boolean;
  onClose: () => void;
  imageSource?: any;
  onPressImage?: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  visible,
  onClose,
  imageSource,
  onPressImage,
}) => {
  const dispatch = useAppDispatch();
  const { imageUrl, loading } = useAppSelector(state => state.popup);

  useEffect(() => {
    if (visible && !imageSource && !imageUrl) {
      dispatch(fetchPopupThunk('active'));
    }
  }, [visible, imageSource, imageUrl, dispatch]);

  // Resolve image source: fallback to local asset if none provided
  const promoImage = useMemo(() => {
    if (imageSource) {
      if (typeof imageSource === 'string') {
        return { uri: imageSource };
      }
      return imageSource;
    }
    if (imageUrl) {
      return { uri: imageUrl };
    }
    return require('../assets/images/captain_training_banner.png');
  }, [imageSource, imageUrl]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Modal Card wrapper - set background to transparent to avoid Android border-radius clipping showing white background */}
        <View style={styles.card}>
          {/* Clickable Image Body */}
          <TouchableOpacity
            onPress={onPressImage || onClose}
            activeOpacity={0.95}
            style={styles.imageContainer}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : (
              <Image
                source={promoImage}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          {/* Absolute close button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.8}
          >
            <Icon name="close" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85 * 1.25, // 4:5 aspect ratio
    borderRadius: 24,
    backgroundColor: 'transparent',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 24, // Set border radius on the image itself to fix Android clipping bug
  },
  closeButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
  },
});

export default PromotionModal;
