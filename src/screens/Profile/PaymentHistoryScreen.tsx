import React, { useState, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Share,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import type { AppNavProp } from '../../navigation/types';
import { ROUTES } from '../../constants/routes';
import {
  fetchTransactionHistoryThunk,
  clearTransactionError,
  Transaction,
} from '../../redux/slices/transactionSlice';
import { useThemePalette } from '../../utils/theme';
import Images from '../../utils/images';

interface PaymentHistoryScreenInnerProps {
  onGoBack: () => void;
}

// ─── Inner Component ──────────────────────────────────────────────────────────
const PaymentHistoryScreenInner: React.FC<PaymentHistoryScreenInnerProps> = ({ onGoBack }) => {
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const dispatch = useAppDispatch();

  // Get data from Redux
  const { transactions, loading, error } = useAppSelector(state => state.transaction);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<
    'all' | 'earning' | 'payout' | 'pass' | 'recharge'
  >('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Selected details modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Fetch transactions on mount
  useEffect(() => {
    dispatch(fetchTransactionHistoryThunk());
    return () => {
      dispatch(clearTransactionError());
    };
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTransactionHistoryThunk());
  };

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (selectedTab !== 'all' && txn.type !== selectedTab) return false;
      if (statusFilter !== 'all' && txn.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          txn.id.toLowerCase().includes(query) ||
          txn.title.toLowerCase().includes(query) ||
          txn.subtitle.toLowerCase().includes(query) ||
          txn.details.refNo.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [transactions, selectedTab, statusFilter, searchQuery]);

  // Share Receipt function
  const handleShareReceipt = async (txn: Transaction) => {
    try {
      const typeLabel =
        txn.type === 'earning'
          ? 'Earning'
          : txn.type === 'payout'
            ? 'Payout'
            : txn.type === 'recharge'
              ? 'Recharge'
              : 'Pass purchase';
      const statusLabel = txn.status.toUpperCase();
      const refLabel = txn.type === 'earning' ? 'CRN' : 'UTR/Bill Ref';
      const shareMessage = `Safarweel Partner Receipt\n-----------------------\nType: ${typeLabel}\nAmount: ₹${txn.amount}\nStatus: ${statusLabel}\nDate: ${txn.timestamp}\nTransaction ID: ${txn.id}\n${refLabel}: ${txn.details.refNo}\nDestination: ${txn.details.method}\n-----------------------\nGenerated via Safarweel Partner App.`;

      await Share.share({
        message: shareMessage,
        title: 'Safarweel Transaction Receipt',
      });
    } catch (err) {
      console.log('Error sharing receipt:', err);
    }
  };

  const getStatusStyle = (status: 'completed' | 'processing' | 'failed') => {
    switch (status) {
      case 'completed':
        return { color: palette.success, bg: 'rgba(34, 197, 94, 0.12)' };
      case 'processing':
        return { color: palette.primary, bg: 'rgba(79, 70, 229, 0.12)' };
      case 'failed':
        return { color: palette.destructive, bg: 'rgba(239, 68, 68, 0.12)' };
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTypeIcon = (type: 'earning' | 'payout' | 'pass' | 'recharge') => {
    switch (type) {
      case 'earning':
        return { name: 'car-outline', color: palette.success, bg: 'rgba(34, 197, 94, 0.12)' };
      case 'payout':
        return { name: 'arrow-up-circle-outline', color: palette.primary, bg: 'rgba(79, 70, 229, 0.12)' };
      case 'pass':
        return { name: 'flash-outline', color: palette.destructive, bg: 'rgba(239, 68, 68, 0.12)' };
      case 'recharge':
        return { name: 'wallet-outline', color: palette.success, bg: 'rgba(34, 197, 94, 0.12)' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader
        title="Payment History"
        onBackPress={onGoBack}
        rightElement={
          <TouchableOpacity style={styles.headerRightBtn} onPress={() => setShowFilterModal(true)}>
            <Icon name="funnel-outline" size={20} color={palette.text} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchWrapper, { backgroundColor: palette.background }]}>
        <View style={[styles.searchBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Icon name="search-outline" size={20} color={palette.mutedText} />
          <TextInput
            placeholder="Search by Txn ID, CRN or Details..."
            placeholderTextColor={palette.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: palette.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={palette.mutedText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={[styles.tabsContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {(['all', 'earning', 'payout', 'pass', 'recharge'] as const).map((tab) => {
            const isSelected = selectedTab === tab;
            const label =
              tab === 'all'
                ? 'All'
                : tab === 'earning'
                  ? 'Rewards'
                  : tab === 'payout'
                    ? 'Payouts'
                    : tab === 'pass'
                      ? 'Passes'
                      : 'Recharges';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={[
                  styles.tabBtn,
                  isSelected && [styles.activeTabBtn, { backgroundColor: palette.primary }],
                ]}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: isSelected ? '#fff' : palette.mutedText },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading && transactions.length > 0}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.mutedText }]}>
                Loading transactions...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle-outline" size={56} color={palette.destructive} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>Failed to Load</Text>
              <Text style={[styles.emptySubtext, { color: palette.mutedText }]}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={handleRefresh}
                style={[styles.retryBtn, { backgroundColor: palette.primary }]}
                activeOpacity={0.88}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Image
                source={isDark ? Images.noBalanceDark : Images.noBalance}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No Transactions Found</Text>
              <Text style={[styles.emptySubtext, { color: palette.mutedText }]}>
                We couldn't find any transactions matching your search filters. Try resetting the filters.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const iconConfig = getTypeIcon(item.type);
          const statusStyle = getStatusStyle(item.status);
          const isNegative = item.type === 'payout' || item.type === 'pass';
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedTxn(item)}
              style={[styles.txnCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.txnLeftRow}>
                {/* Type Icon */}
                <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                  <Icon name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>

                {/* Details */}
                <View style={styles.txnDetailsFlex}>
                  <Text style={[styles.txnTitle, { color: palette.text }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[styles.txnSubtitle, { color: palette.mutedText }]}>
                    {item.subtitle}
                  </Text>
                  <Text style={[styles.txnTimeText, { color: palette.mutedText }]}>{item.timestamp}</Text>
                </View>
              </View>

              {/* Status & Amount */}
              <View style={styles.txnRightCol}>
                <Text
                  style={[
                    styles.txnAmountText,
                    { color: isNegative ? palette.text : palette.success },
                  ]}
                >
                  {isNegative ? '-' : '+'}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <View style={[styles.statusBadgePill, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitleText, { color: palette.text }]}>Filter by Status</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            {/* Status list */}
            <View style={styles.filterOptionList}>
              {(['all', 'completed', 'processing', 'failed'] as const).map((status) => {
                const isSelected = statusFilter === status;
                const label = status === 'all' ? 'All Statuses' : getStatusText(status);
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setStatusFilter(status)}
                    style={[
                      styles.filterOptionItem,
                      isSelected
                        ? { borderColor: palette.primary, backgroundColor: 'rgba(79, 70, 229, 0.08)' }
                        : { borderColor: palette.border, backgroundColor: 'transparent' },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: isSelected ? palette.primary : palette.text },
                      ]}
                    >
                      {label}
                    </Text>
                    {isSelected && <Icon name="checkmark" size={18} color={palette.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Apply Action */}
            <Button
              label="Apply Filter"
              onPress={() => setShowFilterModal(false)}
              height={50}
              borderRadius={16}
            />
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={selectedTxn !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={styles.centerModalOverlay}>
          {selectedTxn && (
            <View style={[styles.txnDetailCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitleText, { color: palette.text }]}>Transaction Details</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTxn(null)}>
                  <Icon name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>

              {/* Icon & Amount Display */}
              <View style={styles.detailHeroSection}>
                <View style={[styles.detailHeroIconCircle, { backgroundColor: getTypeIcon(selectedTxn.type).bg }]}>
                  <Icon name={getTypeIcon(selectedTxn.type).name} size={26} color={getTypeIcon(selectedTxn.type).color} />
                </View>
                <Text style={[styles.detailHeroAmountText, { color: palette.text }]}>
                  {selectedTxn.type === 'earning' || selectedTxn.type === 'recharge' ? '+' : '-'}₹{selectedTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.detailHeroTitleText, { color: palette.mutedText }]}>
                  {selectedTxn.title}
                </Text>

                <View style={[styles.statusBadgePill, { backgroundColor: getStatusStyle(selectedTxn.status).bg, marginTop: 10 }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusStyle(selectedTxn.status).color }]}>
                    {getStatusText(selectedTxn.status)}
                  </Text>
                </View>
              </View>

              {/* Receipt Breakdowns */}
              <View style={[styles.receiptBreakdownSection, { borderColor: palette.border }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: palette.mutedText }]}>Subtotal</Text>
                  <Text style={[styles.breakdownValue, { color: palette.text }]}>₹{selectedTxn.details.subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: palette.mutedText }]}>Processing Fee</Text>
                  <Text style={[styles.breakdownValue, { color: palette.text }]}>₹{selectedTxn.details.fee.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalNetRow, { borderTopColor: palette.border }]}>
                  <Text style={[styles.totalNetLabel, { color: palette.text }]}>Total Net</Text>
                  <Text style={[styles.totalNetValue, { color: palette.primary }]}>₹{selectedTxn.details.net.toFixed(2)}</Text>
                </View>
              </View>

              {/* Metadata rows */}
              <View style={styles.metadataSection}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: palette.mutedText }]}>Transaction ID</Text>
                  <Text style={[styles.metaValue, { color: palette.text }]}>{selectedTxn.id}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: palette.mutedText }]}>
                    {selectedTxn.type === 'earning' ? 'Ride ID (CRN)' : 'Reference / Bill ID'}
                  </Text>
                  <Text style={[styles.metaValue, { color: palette.text }]}>{selectedTxn.details.refNo}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: palette.mutedText }]}>Method / Destination</Text>
                  <Text style={[styles.metaValue, { color: palette.text }]}>{selectedTxn.details.method}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: palette.mutedText }]}>Date & Time</Text>
                  <Text style={[styles.metaValue, { color: palette.text }]}>{selectedTxn.timestamp}</Text>
                </View>
              </View>

              {/* Action row */}
              <TouchableOpacity
                onPress={() => handleShareReceipt(selectedTxn)}
                style={[styles.shareBtn, { backgroundColor: palette.background, borderColor: palette.border }]}
                activeOpacity={0.8}
              >
                <Icon name="share-outline" size={16} color={palette.text} style={{ marginRight: 6 }} />
                <Text style={[styles.shareBtnText, { color: palette.text }]}>Share Receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightBtn: {
    padding: 4,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 2,
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  txnCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txnLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnDetailsFlex: {
    flex: 1,
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  txnSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  txnTimeText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 3,
  },
  txnRightCol: {
    alignItems: 'flex-end',
  },
  txnAmountText: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  filterOptionList: {
    gap: 10,
    marginBottom: 20,
  },
  filterOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyFilterBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  txnDetailCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    width: '100%',
    maxWidth: 380,
  },
  detailHeroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailHeroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  detailHeroAmountText: {
    fontSize: 28,
    fontWeight: '900',
  },
  detailHeroTitleText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  receiptBreakdownSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 18,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalNetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  totalNetLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  totalNetValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  metadataSection: {
    gap: 10,
    marginBottom: 20,
  },
  metaRow: {
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  shareBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

// ─── Outer Wrapper ───────────────────────────────────────────────────────────
interface PaymentHistoryScreenProps {
  navigation: AppNavProp<typeof ROUTES.PAYMENT_HISTORY>;
}

const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ navigation }) => {
  const handleGoBack = () => {
    navigation.goBack();
  };

  return <PaymentHistoryScreenInner onGoBack={handleGoBack} />;
};

export default PaymentHistoryScreen;
