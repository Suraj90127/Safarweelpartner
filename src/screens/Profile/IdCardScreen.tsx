import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, StatusBar, Platform, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import { formateDateMonthYear } from '../../utils/formatters';

const IdCardScreen: React.FC = () => {
  const navigation = useNavigation();

  const driver = useAppSelector(state => state.driver.profile);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const isDark = useAppSelector(state => state.theme.isDark);



  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Safarweel ID Card" />

      <ScrollView contentContainerClassName="items-center py-8 px-5 flex-grow">
        {/* Premium Vertical ID card */}
        <View
          className="w-full max-w-[320px] h-[400px] bg-white/75 dark:bg-slate-950/80 rounded-3xl border border-white/50 dark:border-slate-800 p-6 justify-between"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          {/* Header Bar */}
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-indigo-600 dark:text-white text-xl font-black tracking-widest">Safarweel</Text>
              <Text className="text-indigo-600/80 dark:text-brandYellow text-[9px] font-bold tracking-wider mt-0.5">Safarweel PARTNER</Text>
            </View>
            <View className="bg-emerald-500/10 dark:bg-accent px-3 py-1 rounded-full">
              <Text className="text-emerald-600 dark:text-white text-[10px] font-black">ACTIVE</Text>
            </View>
          </View>

          {/* Photo Section */}
          <View className="items-center my-4">
            <View className="w-[100px] h-[100px] rounded-full bg-slate-100 border-2 border-white dark:bg-slate-800 dark:border-slate-700 justify-center items-center overflow-hidden shadow-sm">
              {driver?.profile_image_id ? (
                <Image
                  source={{ uri: driver.profile_image_id }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Icon name="person" size={64} color="#94A3B8" />
              )}
            </View>
          </View>

          {/* Name & Title */}
          <View className="items-center mb-4">
            <Text className="text-textLight dark:text-textDark text-lg font-black text-center">{driver?.name?.toUpperCase() ?? 'CAPTAIN'}</Text>
            <Text className="text-indigo-600 dark:text-brandYellow text-xs font-bold tracking-widest mt-1">{vehicle?.serviceId?.name} Partner</Text>
          </View>

          {/* Info Rows */}
          <View className="bg-slate-50/70 dark:bg-slate-800/90 rounded-2xl p-4 gap-2 border border-slate-100/50 dark:border-slate-850">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 dark:text-slate-400 text-[9px] font-bold">PARTNER ID</Text>
              <Text className="text-textLight dark:text-white text-xs font-extrabold">MXD-{driver?.id?.substring(0, 6)?.toUpperCase() || '62981'}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 dark:text-slate-400 text-[9px] font-bold">PHONE</Text>
              <Text className="text-textLight dark:text-white text-xs font-extrabold">{driver?.phone ?? '—'}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 dark:text-slate-400 text-[9px] font-bold">VEHICLE NO.</Text>
              <Text className="text-textLight dark:text-white text-xs font-extrabold">{vehicle?.numberPlate?.toUpperCase() ?? driver?.vehicle?.licensePlate?.toUpperCase() ?? 'UP-16-AB-1234'}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 dark:text-slate-400 text-[9px] font-bold">JOINED</Text>
              <Text className="text-textLight dark:text-white text-xs font-extrabold">{formateDateMonthYear(driver?.createdAt)}</Text>
            </View>
          </View>

          {/* Fake Barcode/QR scan area at bottom */}
          {/* <View className="items-center mt-2">
            <View className="flex-row h-6 items-center mb-1">
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 4 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 1 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 6 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 2 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 5 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 1 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 3 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 7 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 2 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 4 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 1 }} />
              <View className="h-full bg-slate-800 dark:bg-slate-400 mx-[1.5px] rounded-[1px]" style={{ width: 6 }} />
            </View>
            <Text className="text-slate-400 dark:text-slate-400 text-[8px] font-bold tracking-wider">SECURE DIGITAL ID</Text>
          </View> */}
        </View>

        <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary text-center mt-6 px-6">
          This is a digital identity card representing your active partner status with Safarweel. Please display this to security/customers if asked.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};


export default IdCardScreen;

