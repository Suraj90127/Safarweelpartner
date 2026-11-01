import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StatusBar, Platform, TouchableOpacity, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import ScreenHeader from '../../components/ScreenHeader';

interface FaqItem {
  question: string;
  answer: string;
  questionHi: string;
  answerHi: string;
}

const RideGuideScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isDark = useAppSelector(state => state.theme.isDark);

  const toggleFaq = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const steps = [
    {
      icon: 'checkmark-circle-outline',
      color: '#3B82F6',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      title: '1. Accept Ride (राइड स्वीकारें)',
      desc: 'Toggle online on the home map. When a ride request appears, verify the fare and drop distance. Tap "Accept" within 15 seconds.',
      descHi: 'होम मैप पर ऑनलाइन हो जाएं। जब कोई राइड का अनुरोध आए, तो किराया और दूरी जांचें। 15 सेकंड के भीतर "स्वीकारें" पर टैप करें।'
    },
    {
      icon: 'location-outline',
      color: '#D97706',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      title: '2. Go to Pickup (पिकअप पॉइंट पहुंचें)',
      desc: 'Navigate to the pickup location shown on the GPS. Upon arrival, tap "Arrived at Pickup" so the customer is notified.',
      descHi: 'जीपीएस पर दिखाए गए पिकअप स्थान पर जाएं। पहुंचने के बाद "Arrived at Pickup" दबाएं जिससे यात्री को पता चल सके।'
    },
    {
      icon: 'play-outline',
      color: '#10B981',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      title: '3. Start Ride (राइड शुरू करें)',
      desc: 'Once the passenger is seated safely, confirm their destination. Swipe or tap "Start Ride" to begin the trip navigation.',
      descHi: 'यात्री के सुरक्षित रूप से बैठ जाने के बाद, उनके गंतव्य की पुष्टि करें। ट्रिप शुरू करने के लिए "Start Ride" दबाएं।'
    },
    {
      icon: 'flag-outline',
      color: '#EF4444',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      title: '4. Complete Ride (राइड समाप्त करें)',
      desc: 'Follow the navigation to the drop point. When you arrive, tap "End Ride" and confirm payment method (Cash or Online via QR code).',
      descHi: 'ड्रॉप पॉइंट तक जीपीएस फॉलो करें। पहुंचने के बाद "End Ride" पर टैप करें और कैश या ऑनलाइन (QR कोड) पेमेंट विकल्प चुनें।'
    }
  ];

  const faqs: FaqItem[] = [
    {
      question: "Can I refuse a ride after accepting it?",
      questionHi: "क्या मैं स्वीकार करने के बाद राइड कैंसिल कर सकता हूँ?",
      answer: "Yes, you can cancel in an emergency, but frequent cancellations will affect your Acceptance Rate and incentive eligibility.",
      answerHi: "हाँ, आपातकाल में रद्द कर सकते हैं, लेकिन बार-बार रद्द करने से आपका एक्सेप्टेंस रेट और इंसेंटिव प्रभावित होगा।"
    },
    {
      question: "What to do if the customer is not answering calls?",
      questionHi: "यदि ग्राहक फोन नहीं उठा रहा है तो क्या करें?",
      answer: "Wait at the pickup point for at least 5 minutes. Try calling them 2-3 times. If they still do not respond, you can cancel the ride with 'Rider No Show' reason.",
      answerHi: "पिकअप पॉइंट पर कम से कम 5 मिनट प्रतीक्षा करें। 2-3 बार कॉल करें। यदि वे अभी भी प्रतिक्रिया नहीं देते हैं, तो आप 'Rider No Show' कारण चुनकर राइड कैंसिल कर सकते हैं।"
    },
    {
      question: "How is toll tax refunded?",
      questionHi: "टोल टैक्स का रिफंड कैसे मिलता है?",
      answer: "Pay the toll directly at the booth, then submit a claim via Profile > Claims with a valid toll receipt. Approved amounts are credited directly to your wallet.",
      answerHi: "टोल बूथ पर सीधे टोल का भुगतान करें, फिर वैध रसीद के साथ प्रोफाइल > क्लेम्स के माध्यम से दावा सबमिट करें। स्वीकृत राशि सीधे आपके वॉलेट में जमा की जाएगी।"
    },
    {
      question: "What if the customer wants to change the route or drop point?",
      questionHi: "अगर ग्राहक रास्ता या ड्रॉप पॉइंट बदलना चाहता है तो क्या करें?",
      answer: "Ask them to update the destination inside their rider app, so the fare is updated dynamically and correctly recorded.",
      answerHi: "उनसे कहें कि वे अपने ऐप में ड्रॉप पॉइंट अपडेट करें, ताकि किराया स्वचालित रूप से अपडेट हो सके और जीपीएस सही चले।"
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg" edges={['top']}>
      <ScreenHeader title="Ride Flow & FAQ" />

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View
          className="bg-lightBg dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder mb-5"

        >
          <Text className="text-sm font-extrabold text-textLight dark:text-textDark mb-2">How it Works (राइड पूरा करने का तरीका)</Text>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed">
            Follow these steps to successfully complete a ride and earn rewards cleanly.
            {"\n"}(सफलतापूर्वक राइड पूरी करने और अपनी कमाई सुनिश्चित करने के लिए इन चरणों का पालन करें।)
          </Text>
        </View>

        {/* Step Guide List */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 ml-1">Ride Steps (चरण-दर-चरण)</Text>
        {steps.map((step, index) => (
          <View
            key={index}
            className="bg-lightBg dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder mb-4"

          >
            <View className="flex-row items-center mb-2.5">
              <View className={`w-8 h-8 rounded-full ${step.bgColor} items-center justify-center mr-3`}>
                <Icon name={step.icon} size={18} color={step.color} />
              </View>
              <Text className="text-sm font-extrabold text-textLight dark:text-textDark">{step.title}</Text>
            </View>
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed mb-2">
              {step.desc}
            </Text>
            <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary leading-relaxed font-medium bg-lightCard dark:bg-darkBg p-3 rounded-xl">
              {step.descHi}
            </Text>
          </View>
        ))}

        {/* FAQ Section */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 mt-2 ml-1">Frequently Asked Questions (सामान्य प्रश्न)</Text>
        <View
          className="bg-lightBg dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder overflow-hidden mb-6"
        >
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            const isLast = index === faqs.length - 1;
            return (
              <View key={index} className={`border-b ${isLast ? 'border-b-0' : 'border-lightBorder dark:border-darkBorder'}`}>
                <TouchableOpacity
                  onPress={() => toggleFaq(index)}
                  className="flex-row justify-between items-center p-4 active:bg-lightCard dark:active:bg-darkBg"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-xs font-extrabold text-textLight dark:text-textDark leading-relaxed">{faq.question}</Text>
                    <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary font-semibold mt-0.5">{faq.questionHi}</Text>
                  </View>
                  <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View className="bg-lightCard/50 dark:bg-darkBg/50 px-4 pb-4 pt-1">
                    <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary leading-relaxed mb-1.5">{faq.answer}</Text>
                    <Text className="text-[10px] text-textLightSecondary/75 dark:text-textDarkSecondary/70 leading-relaxed italic">{faq.answerHi}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default RideGuideScreen;
