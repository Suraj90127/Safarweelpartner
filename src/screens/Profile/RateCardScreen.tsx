import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import { fetchMyVehicleThunk, fetchRateCardsThunk } from '../../redux/slices/driverSlice';

const RateCardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(state => state.theme.isDark);
  
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const rateCards = useAppSelector(state => state.driver.rateCards);
  const rateCardsLoading = useAppSelector(state => state.driver.rateCardsLoading);
  const rateCardsError = useAppSelector(state => state.driver.rateCardsError);

  const [activeTabId, setActiveTabId] = useState<string>('');

  const serviceId = useMemo(() => {
    if (!vehicle) return null;
    return typeof vehicle.serviceId === 'object' && vehicle.serviceId ? vehicle.serviceId._id : vehicle.serviceId;
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) {
      dispatch(fetchMyVehicleThunk());
    }
  }, [vehicle, dispatch]);

  useEffect(() => {
    if (serviceId) {
      dispatch(fetchRateCardsThunk(serviceId));
    }
  }, [serviceId, dispatch]);

  useEffect(() => {
    if (rateCards && rateCards.length > 0) {
      if (!activeTabId || !rateCards.some(rc => rc._id === activeTabId)) {
        setActiveTabId(rateCards[0]._id);
      }
    }
  }, [rateCards, activeTabId]);

  const handleRetry = () => {
    if (!vehicle) {
      dispatch(fetchMyVehicleThunk());
    } else if (serviceId) {
      dispatch(fetchRateCardsThunk(serviceId));
    }
  };

  const tabs = useMemo(() => {
    if (!rateCards || rateCards.length === 0) return [];
    return rateCards.map(rc => ({
      key: rc._id,
      label: rc.typeName}));
  }, [rateCards]);

  const activeRateCard = useMemo(() => {
    if (!rateCards || rateCards.length === 0) return null;
    return rateCards.find(rc => rc._id === activeTabId) || rateCards[0];
  }, [rateCards, activeTabId]);

  const renderOrderFareHeader = (title: string) => (
    <View className="bg-emerald-500/10 dark:bg-emerald-950/20 py-2.5 px-4 mb-2">
      <Text className="text-emerald-800 dark:text-emerald-400 font-extrabold text-[13px] tracking-wide">
        {title}
      </Text>
    </View>
  );

  const renderExtraFareHeader = (title: string) => (
    <View className="bg-emerald-500/10 dark:bg-emerald-950/20 py-2.5 px-4 mt-4 mb-2">
      <Text className="text-emerald-800 dark:text-emerald-400 font-extrabold text-[13px] tracking-wide">
        {title}
      </Text>
    </View>
  );

  const renderCommissionHeader = (title: string) => (
    <View className="bg-amber-500/10 dark:bg-amber-950/20 py-2.5 px-4 mt-4 mb-2">
      <Text className="text-amber-800 dark:text-amber-400 font-extrabold text-[13px] tracking-wide">
        {title}
      </Text>
    </View>
  );

  const renderRow = (label: string, subtext: string, value?: string, valueSubtext?: string) => (
    <View className="flex-row justify-between items-center py-3.5 px-4 border-b border-slate-100 dark:border-darkBorder bg-white dark:bg-darkCard">
      <View className="flex-1 pr-4">
        <Text className="text-sm font-bold text-textLight dark:text-textDark">{label}</Text>
        <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5 leading-4">
          {subtext}
        </Text>
      </View>
      {value !== undefined && value !== null && (
        <View className="items-end">
          <Text className="text-sm font-black text-textLight dark:text-textDark">{value}</Text>
          {valueSubtext && (
            <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium mt-0.5">
              {valueSubtext}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-darkBg">
      <ScreenHeader title="Rate Card" />

      {rateCardsLoading && !rateCards ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary || '#4F46E5'} />
          <Text className="text-textLightSecondary dark:text-textDarkSecondary mt-3 font-semibold text-sm">
            Loading rate card details...
          </Text>
        </View>
      ) : rateCardsError ? (
        <View className="flex-1 justify-center items-center px-6">
          <Icon name="alert-circle-outline" size={50} color="#EF4444" />
          <Text className="text-textLight dark:text-textDark font-bold text-base mt-3 text-center">
            Failed to Load Rate Card
          </Text>
          <Text className="text-textLightSecondary dark:text-textDarkSecondary text-sm mt-1 text-center mb-5">
            {rateCardsError}
          </Text>
          <TouchableOpacity
            className="bg-primary px-6 py-2.5 rounded-full"
            style={{ backgroundColor: COLORS.primary || '#4F46E5' }}
            onPress={handleRetry}
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !activeRateCard ? (
        <View className="flex-1 justify-center items-center px-6">
          <Icon name="list-outline" size={60} color={isDark ? COLORS.textDarkSecondary : '#94A3B8'} />
          <Text className="text-textLight dark:text-textDark font-bold text-base mt-4 text-center">
            No Rate Cards Found
          </Text>
          <Text className="text-textLightSecondary dark:text-textDarkSecondary text-sm mt-1 text-center px-4">
            There are no rate cards configured for your service category right now.
          </Text>
        </View>
      ) : (
        <>
          {/* Tabs */}
          {tabs.length > 0 && (
            <View className="flex-row border-b border-slate-100 dark:border-darkBorder bg-white dark:bg-darkCard">
              {tabs.map(tab => {
                const isSelected = activeTabId === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTabId(tab.key)}
                    className="flex-1 py-3 items-center justify-center relative"
                  >
                    <Text className={`text-sm font-extrabold ${isSelected ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'}`}>
                      {tab.label}
                    </Text>
                    {isSelected && (
                      <View className="absolute bottom-0 left-4 right-4 h-[3px] bg-yellow-400 rounded-t-full" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Content */}
          <ScrollView className="flex-1 bg-slate-50 dark:bg-darkBg" showsVerticalScrollIndicator={false}>
            <View className="pb-8">
              {renderOrderFareHeader('Order Fare')}
              
              {/* Distance Fare with tiered rates */}
              {activeRateCard.distanceFare && activeRateCard.distanceFare.length > 0 ? (
                <View className="py-3.5 px-4 border-b border-slate-100 dark:border-darkBorder bg-white dark:bg-darkCard">
                  <Text className="text-sm font-bold text-textLight dark:text-textDark">Distance Fare</Text>
                  <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                    For the kilometers travelled
                  </Text>
                  
                  {/* Tier list */}
                  <View className="mt-3.5 px-2 gap-2.5">
                    {activeRateCard.distanceFare.map((tier, idx) => (
                      <View key={idx} className="flex-row items-center justify-between">
                        <Text className="text-[13px] font-semibold text-textLightSecondary dark:text-textDarkSecondary w-28">
                          {tier.fromKm} to {tier.toKm} km
                        </Text>
                        <View className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700 mx-2 -bottom-1" />
                        <Text className="text-[13px] font-black text-textLight dark:text-textDark">
                          ₹{tier.farePerKm.toFixed(1)} <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-bold">per km</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {renderRow('Time Fare', 'Time to complete the order', `₹${activeRateCard.timeFare}`, 'per min')}
              {renderRow('Base Fare', 'For completing an order', `₹${activeRateCard.baseFare}`)}
              {renderRow('Platform fee', 'Collected from customer', `₹${activeRateCard.platformFee}`)}
              {activeRateCard.waitTimeCharge && renderRow(
                'Wait Time charges',
                `After ${activeRateCard.waitTimeCharge.afterMinutes || 3} min (Max ₹${activeRateCard.waitTimeCharge.maxCharge || 15})`,
                `+ ₹${activeRateCard.waitTimeCharge.perMinute || 0}`,
                'per min'
              )}

              {renderExtraFareHeader('Extra Fare (not applicable on all orders)')}
              {activeRateCard.longPickupFare && renderRow(
                'Long Pickup Fare per km',
                `After ${activeRateCard.longPickupFare.afterKm || 2} km (Max ₹${activeRateCard.longPickupFare.maxCharge || 10})`,
                `+ ₹${activeRateCard.longPickupFare.perKm || 0}`,
                'per km'
              )}
              {activeRateCard.cancellationFare && renderRow(
                'Cancellation Fare',
                'When the customer cancels',
                `+ ₹${activeRateCard.cancellationFare.minFare || 0} to ₹${activeRateCard.cancellationFare.maxFare || 15}`
              )}
              {renderRow('Surge Fare', activeRateCard.surgeFareEnabled ? 'Extra fare paid by customer (Enabled)' : 'Not enabled')}
              {activeRateCard.nightFare && renderRow(
                `Night Fare (${activeRateCard.nightFare.startTime || '11:00pm'} - ${activeRateCard.nightFare.endTime || '6:00am'})`,
                `+${activeRateCard.nightFare.percentage || 15}% on Base, Time and Distance Fare`,
                `+${activeRateCard.nightFare.percentage || 15}%`
              )}

              {renderCommissionHeader('Commission and GST (Depends on order fare)')}
              {renderRow("Commission", `Flat ₹${activeRateCard.commission} will be charged`, `₹${activeRateCard.commission}`)}
              {renderRow('GST', `Paid to Government (${activeRateCard.gstPercentage || 5}%)`)}
              {renderRow('Handling Fee', 'For facilitating a safe ride', `₹${activeRateCard.handlingFee || 0}`)}
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

export default RateCardScreen;
