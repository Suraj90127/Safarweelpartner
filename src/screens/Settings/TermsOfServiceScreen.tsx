import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By registering, accessing or using the Safarweel Driver/Partner App, Website or Platform, you agree to these Terms of Service.',
      'You also agree to comply with all applicable laws, regulations, platform policies and operational requirements.',
      'If you do not agree to these terms, you must not use the Platform or provide services through it.'
    ]
  },
  {
    title: '2. Nature of the Platform',
    body: [
      'Safarweel provides a technology platform that facilitates connections between Customers and Drivers/Partners.',
      'Unless expressly stated otherwise in a separate written agreement, Safarweel does not appoint a Driver/Partner as its employee or agent.',
      'The Driver/Partner remains solely responsible for compliance with transport, licensing, registration, documentation and vehicle requirements applicable to the services they provide.'
    ]
  },
  {
    title: '3. Eligibility and Verification',
    body: [
      'Drivers/Partners must provide accurate, complete and current information in the App or Platform.',
      'Safarweel may request identity, driving, vehicle, payment and verification details for onboarding, fraud prevention, compliance and Platform administration.',
      'Any false, misleading or outdated information may lead to rejection, suspension or termination of access.'
    ]
  },
  {
    title: '4. Account Security',
    body: [
      'You are responsible for maintaining the confidentiality of your account, password, OTP and access credentials.',
      'You must not share your account with another person or allow unauthorized use of the Platform.',
      'You are responsible for all activity carried out through your account.'
    ]
  },
  {
    title: '5. Vehicle and Documentation',
    body: [
      'The Driver/Partner must ensure that the vehicle is safe, legal, roadworthy and suitable for the services offered.',
      'All required documents, registrations, licences, permits, insurance and fitness records must remain valid and current.',
      'Safarweel may require updated documentation at any time for verification and compliance purposes.'
    ]
  },
  {
    title: '6. Ride Acceptance and Completion',
    body: [
      'Once a Driver/Partner accepts a ride request, they must proceed to the pickup location and complete the requested service through the Platform as applicable.',
      'Unnecessary cancellation, refusal without valid reason, or repeated cancellations may be treated as a breach of these Terms.',
      'Drivers/Partners must follow the instructions and route information provided through the App where required.'
    ]
  },
  {
    title: '7. Fare, Earnings and Payments',
    body: [
      'Fare, earnings and payment calculations will be determined according to the applicable Safarweel fare structure and policies.',
      'Additional distance, waiting charges, tolls, cancellations or other applicable adjustments may be reflected in the final calculation where permitted.',
      'The Driver/Partner must not demand or collect any unauthorized additional payment from a Customer.'
    ]
  },
  {
    title: '8. Customer Safety and Conduct',
    body: [
      'Drivers/Partners must treat Customers with respect, professionalism and courtesy at all times.',
      'They must not harass, threaten, abuse, intimidate or mislead any Customer.',
      'Drivers/Partners must drive safely and lawfully, and must not engage in dangerous, reckless or negligent conduct.'
    ]
  },
  {
    title: '9. Location and GPS',
    body: [
      'The Driver/Partner App may require access to location information while the Driver/Partner is online or providing a trip.',
      'Location data may be used for ride matching, navigation, trip tracking, safety, dispatch and platform operations.',
      'If location permissions are disabled, some features may not function properly.'
    ]
  },
  {
    title: '10. Fraud, Misuse and Prohibited Conduct',
    body: [
      'Fake rides, manipulated locations, false documents, payment misuse, account sharing, tampering with trip data or any fraudulent conduct is prohibited.',
      'Safarweel may investigate suspected misuse and may suspend, restrict or terminate the account if violations are found.',
      'Any act damaging Platform integrity, Customer trust or legal compliance may be treated as a serious breach.'
    ]
  },
  {
    title: '11. Suspension and Termination',
    body: [
      'Safarweel may suspend, restrict or terminate a Driver/Partner account if there is a breach of these Terms, a legal requirement or a safety or compliance concern.',
      'Safarweel may also take action in response to complaints, fraud investigations, customer reports or operational risk.',
      'Upon termination, access to Platform features may be withdrawn, subject to applicable legal obligations.'
    ]
  },
  {
    title: '12. Privacy and Data Use',
    body: [
      'Drivers/Partners agree that their personal, account and trip-related information may be processed in accordance with the Safarweel Privacy Policy.',
      'Safarweel may collect, store and use information needed for registration, verification, safety, support, payments, fraud prevention and legal compliance.',
      'Drivers/Partners must also protect Customer information and use it only for the purpose of the requested ride or service.'
    ]
  },
  {
    title: '13. Ratings, Reviews and Complaints',
    body: [
      'Customers may provide ratings, reviews or complaints about service quality and conduct.',
      'Safarweel may review such feedback for Platform administration, dispute resolution, fraud detection and service improvement.',
      'Account actions may be taken where feedback indicates unacceptable conduct or operational issues.'
    ]
  },
  {
    title: '14. Modifications to the Terms',
    body: [
      'Safarweel may update or modify these Terms from time to time to reflect legal, operational or service changes.',
      'Updated versions may be notified through the App, Website, SMS, email or other available communication channels.',
      'Continued use of the Platform after an update constitutes acceptance of the revised Terms.'
    ]
  },
  {
    title: '15. Contact and Support',
    body: [
      'For questions, complaints or support, Drivers/Partners may contact Safarweel through the details provided in the App or official Website.',
      'Email: privacy@safarweel.in',
      'Customer Support: 9406130661',
      'Website: www.safarweel.in'
    ]
  }
];

const TermsOfServiceScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Terms of Service" />

      <ScrollView className="px-4 pb-6" showsVerticalScrollIndicator={false}>
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder mb-4" style={{ marginTop: 10 }}>
          <Text className="text-base font-extrabold text-textLight dark:text-textDark text-center mb-3">
            SAFARWEEL DRIVER / PARTNER TERMS OF SERVICE
          </Text>
          <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mb-1">
            Effective Date: 25/09/2026
          </Text>
          <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mb-3">
            Last Updated: 25/09/2026
          </Text>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed">
            This Agreement applies to Drivers/Partners who register with, access or use the Safarweel Driver/Partner App, Website or Platform.
          </Text>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed mt-2">
            By using the Platform, you acknowledge that you have read, understood and agree to be bound by these Terms of Service and any related policies.
          </Text>
        </View>

        {termsSections.map((section) => (
          <View
            key={section.title}
            className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder mb-4"
          >
            <Text className="text-xs font-extrabold text-textLight dark:text-textDark mb-3">
              {section.title}
            </Text>

            {section.body.map((paragraph, index) => (
              <Text
                key={`${section.title}-${index}`}
                className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed mb-2"
              >
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsOfServiceScreen;

