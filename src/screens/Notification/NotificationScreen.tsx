import React, { useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchAlertsByTypeThunk } from '../../redux/slices/alertSlice';
import ScreenHeader from '../../components/ScreenHeader';
import { formatRelativeTime } from '../../utils/formatters';
import { AlertData } from '../../api/alertApi';
import { useThemePalette } from '../../utils/theme';

const getNotificationIcon = (type: string, palette: any) => {
  switch (type) {
    case 'ride_request':
      return { name: 'car-outline', color: palette.primary, bg: 'rgba(79, 70, 229, 0.12)' };
    case 'ride_accepted':
    case 'ride_arrived':
    case 'ride_started':
      return { name: 'bicycle-outline', color: palette.success, bg: 'rgba(34, 197, 94, 0.12)' };
    case 'ride_cancelled':
      return { name: 'close-circle-outline', color: palette.destructive, bg: 'rgba(239, 68, 68, 0.12)' };
    case 'chat_message':
      return { name: 'chatbubble-ellipses-outline', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' };
    case 'earnings_update':
    case 'earnings_summary':
      return { name: 'wallet-outline', color: palette.warning, bg: 'rgba(245, 158, 11, 0.12)' };
    case 'general_notification':
    default:
      return { name: 'notifications-outline', color: palette.primary, bg: 'rgba(79, 70, 229, 0.12)' };
  }
};

const NotificationScreen: React.FC = () => {
  const { palette } = useThemePalette();
  const dispatch = useAppDispatch();
  const { alerts, loading, error } = useAppSelector(state => state.alert);

  const fetchNotifications = useCallback(() => {
    dispatch(fetchAlertsByTypeThunk('DRIVER'));
  }, [dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    fetchNotifications();
  };

  const renderItem = ({ item }: { item: AlertData }) => {
    const iconConfig = getNotificationIcon(item.type, palette);
    const displayTime = item.sentAt || item.createdAt;

    return (
      <View
        style={[
          styles.itemCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        {/* Left Icon */}
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Icon name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>

        {/* Content */}
        <View style={styles.itemContentFlex}>
          <View style={styles.itemHeaderRow}>
            <Text numberOfLines={2} style={[styles.itemTitleText, { color: palette.text }]}>
              {item.title}
            </Text>
            {displayTime && (
              <Text style={[styles.timeText, { color: palette.mutedText }]}>
                {formatRelativeTime(displayTime)}
              </Text>
            )}
          </View>
          <Text style={[styles.itemBodyText, { color: palette.mutedText }]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Icon
            name="notifications-off-outline"
            size={36}
            color={palette.mutedText}
          />
        </View>
        <Text style={[styles.emptyTitleText, { color: palette.text }]}>
          No Notifications
        </Text>
        <Text style={[styles.emptySubtext, { color: palette.mutedText }]}>
          You will see announcements and alerts from admin/system here.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor={palette.background}
      />
      <ScreenHeader title="Notifications" />

      {error ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <Icon name="alert-circle-outline" size={32} color={palette.destructive} />
          </View>
          <Text style={[styles.errorText, { color: palette.destructive }]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={[styles.retryBtn, { backgroundColor: palette.primary }]}
            activeOpacity={0.88}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : loading && alerts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item, index) => item.id || `notif-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  itemCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContentFlex: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  itemBodyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  emptyTitleText: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotificationScreen;
