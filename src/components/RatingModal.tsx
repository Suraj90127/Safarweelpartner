import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useThemePalette } from '../utils/theme';
import { Button } from './Button';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  onSubmit: (rating: number, comment: string) => void;
}

function getRatingDescriptor(stars: number): { text: string; color: string } {
  switch (stars) {
    case 5:
      return { text: 'Exceptional Experience! ⭐', color: '#10B981' };
    case 4:
      return { text: 'Great Passenger ⭐', color: '#3B82F6' };
    case 3:
      return { text: 'Average Experience', color: '#F59E0B' };
    case 2:
      return { text: 'Below Expectations', color: '#F97316' };
    case 1:
      return { text: 'Poor Experience', color: '#EF4444' };
    default:
      return { text: 'Rate Passenger', color: '#F59E0B' };
  }
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  customerName,
  onSubmit,
}) => {
  const { palette } = useThemePalette();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(0);
      setSelectedTags([]);
      setFeedback('');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [visible]);

  const tags = rating >= 4
    ? [
      { id: 'polite', label: 'Polite & Friendly', icon: 'happy-outline' },
      { id: 'ontime', label: 'On Time', icon: 'time-outline' },
      { id: 'behavior', label: 'Good Behavior', icon: 'thumbs-up-outline' },
      { id: 'helpful', label: 'Helpful', icon: 'heart-outline' },
    ]
    : [
      { id: 'late', label: 'Late Arrival', icon: 'alarm-outline' },
      { id: 'rude', label: 'Rude Behavior', icon: 'warning-outline' },
      { id: 'location', label: 'Incorrect Location', icon: 'navigate-outline' },
      { id: 'no_show', label: 'Delayed Response', icon: 'hourglass-outline' },
    ];

  const toggleTag = (tagLabel: string) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter(t => t !== tagLabel));
    } else {
      setSelectedTags([...selectedTags, tagLabel]);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        const finalComment = [
          ...selectedTags,
          ...(feedback.trim() ? [feedback.trim()] : [])
        ].join(', ');

        onSubmit(rating, finalComment);
        onClose();
      }, 1200);
    }, 700);
  };

  const ratingDesc = getRatingDescriptor(rating);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>

          {/* Top Sheet Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrapper}>
              <Icon name="star-half" size={22} color={palette.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: palette.text }]}>Rate Passenger</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: palette.background }]}
              onPress={onClose}
              disabled={isSubmitting || isSuccess}
              activeOpacity={0.8}
            >
              <Icon name="close" size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successWrapper}>
              <View style={[styles.successIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Icon name="checkmark-circle" size={56} color={palette.success} />
              </View>
              <Text style={[styles.successTitle, { color: palette.text }]}>Rating Submitted!</Text>
              <Text style={[styles.successSubtitle, { color: palette.mutedText }]}>
                Thank you for helping keep our community safe and trusted.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Customer Avatar & Descriptor */}
              <View style={styles.customerSummary}>
                <View style={[styles.avatarRing, { borderColor: palette.primary }]}>
                  <View style={[styles.avatarInner, { backgroundColor: palette.background }]}>
                    <Text style={[styles.avatarInitial, { color: palette.primary }]}>
                      {customerName?.[0]?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.customerNameText, { color: palette.text }]}>{customerName}</Text>

                {/* Rating Descriptor Banner */}
                <View style={[styles.descriptorPill, { backgroundColor: `${ratingDesc.color}15` }]}>
                  <Text style={[styles.descriptorText, { color: ratingDesc.color }]}>
                    {ratingDesc.text}
                  </Text>
                </View>
              </View>

              {/* Star Rating Selector */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <TouchableOpacity
                      key={star}
                      onPress={() => {
                        setRating(star);
                        setSelectedTags([]);
                      }}
                      style={[
                        styles.starTouch,
                        active && { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={active ? 'star' : 'star-outline'}
                        size={32}
                        color={active ? '#F59E0B' : palette.mutedText}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Tags Section */}
              <Text style={[styles.sectionHeader, { color: palette.mutedText }]}>
                QUICK COMMENTS
              </Text>
              <View style={styles.tagsWrapper}>
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.label);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      onPress={() => toggleTag(tag.label)}
                      style={[
                        styles.tagPill,
                        isSelected
                          ? { backgroundColor: palette.primary, borderColor: palette.primary }
                          : { backgroundColor: palette.background, borderColor: palette.border },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={isSelected ? 'checkmark-circle' : tag.icon}
                        size={14}
                        color={isSelected ? '#000000' : palette.mutedText}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.tagText,
                          { color: isSelected ? '#000000' : palette.text },
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Detail Feedback Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.sectionHeader, { color: palette.mutedText }]}>
                  ADDITIONAL FEEDBACK
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <TextInput
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Share specific details about your trip..."
                    placeholderTextColor={palette.mutedText}
                    multiline={true}
                    numberOfLines={3}
                    style={[styles.textInput, { color: palette.text }]}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Button
                  variant="outline"
                  label="Cancel"
                  onPress={onClose}
                  disabled={isSubmitting}
                  height={52}
                  borderRadius={16}
                  style={{ flex: 1, borderColor: palette.border }}
                  textStyle={[styles.cancelBtnText, { color: palette.mutedText }]}
                />

                <Button
                  label="Submit Review"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  showArrow
                  height={52}
                  borderRadius={16}
                  style={{ flex: 1.4 }}
                  textStyle={styles.submitBtnText}
                />
              </View>

            </ScrollView>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successWrapper: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  successSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  customerSummary: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '900',
  },
  customerNameText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  descriptorPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  descriptorText: {
    fontSize: 12,
    fontWeight: '800',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 22,
  },
  starTouch: {
    padding: 8,
    borderRadius: 16,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputWrapper: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 14,
    fontWeight: '600',
    height: 72,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    // color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default RatingModal;
