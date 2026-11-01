import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';

const policySections = [
  {
    title: '1. Nature of the Platform',
    body: [
      'Safarweel provides technology and digital infrastructure through which Drivers/Partners may receive or respond to ride requests from Customers.',
      'Unless expressly stated otherwise in a separate written agreement, Safarweel does not represent that a Driver/Partner is its employee.',
      'The Driver/Partner remains responsible for complying with all laws, permissions, licences, registrations, vehicle requirements and other requirements applicable to the transportation services provided by the Driver/Partner.'
    ]
  },
  {
    title: '2. Information We May Collect',
    body: [
      'We may collect information including:',
      '• Full name\n• Mobile number\n• Email address\n• Profile photograph\n• Address\n• Identity-related information\n• Driver\'s licence information\n• Vehicle registration information\n• Vehicle details\n• Permit information where applicable\n• Insurance information where applicable\n• Bank/payment information\n• Tax-related information where applicable\n• Vehicle documents\n• Profile and verification information\n• GPS/location information\n• Online/offline status\n• Ride request information\n• Ride history\n• Earnings and transaction information\n• Ratings and reviews\n• Customer complaints\n• Device information\n• IP address\n• App usage information\n• Technical logs\n• Customer support communications\n• Information voluntarily submitted by the Driver/Partner',
      'The exact information required may depend on the features available and the applicable legal requirements.'
    ]
  },
  {
    title: '3. Verification Information',
    body: [
      'Safarweel may request information or documents for account registration, verification, fraud prevention, Platform administration or compliance purposes.',
      'Submission of documents does not necessarily mean that Safarweel has independently verified every aspect of their authenticity unless expressly communicated otherwise.',
      'Drivers/Partners are responsible for ensuring that all information and documents submitted to Safarweel are genuine, valid, current and legally usable.'
    ]
  },
  {
    title: '4. Location Information',
    body: [
      'The Driver/Partner App may require location permissions.',
      'Location information may be used for:',
      '• Showing available ride requests\n• Connecting Drivers/Partners with Customers\n• Displaying pickup locations\n• Navigation-related functionality\n• Ride status\n• Route-related functionality\n• Customer support\n• Fraud prevention\n• Dispute investigation\n• Platform improvement\n• Safety-related operational features where available',
      'If location permission is disabled, certain Platform features may not function.'
    ]
  },
  {
    title: '5. How We Use Driver/Partner Information',
    body: [
      'We may use information to:',
      '• Create and manage your account\n• Verify your account information\n• Facilitate Customer connections\n• Send ride requests\n• Display relevant ride information\n• Track ride status\n• Process payments or earnings where applicable\n• Provide support\n• Maintain transaction records\n• Prevent fraud and misuse\n• Investigate complaints\n• Maintain Platform security\n• Improve Platform functionality\n• Communicate important Platform updates\n• Comply with applicable law'
    ]
  },
  {
    title: '6. Information Shared With Customers',
    body: [
      'When you accept or are assigned a ride request, certain Driver/Partner information may be displayed to the Customer.',
      'This may include:',
      '• Name\n• Profile photograph\n• Vehicle information\n• Vehicle registration details where applicable\n• Rating\n• Approximate location\n• Ride-related information',
      'The information displayed may vary depending on Platform functionality.'
    ]
  },
  {
    title: '7. Customer Information',
    body: [
      'A Driver/Partner may receive information about a Customer only to the extent reasonably necessary to facilitate the requested ride or communication.',
      'Drivers/Partners must not:',
      '• Misuse Customer information\n• Sell Customer information\n• Share Customer information with unauthorized persons\n• Use Customer information for unrelated purposes\n• Contact Customers for unauthorized commercial purposes'
    ]
  },
  {
    title: '8. Payment and Earnings Information',
    body: [
      'Where the Platform facilitates payments or earnings, transaction information may be collected and processed.',
      'Third-party payment providers may process payment information according to their own terms and privacy policies.',
      'Safarweel does not generally intend to store complete card credentials or banking authentication credentials.'
    ]
  },
  {
    title: '9. Device and Technical Information',
    body: [
      'We may collect technical information such as:',
      '• Device type\n• Operating system\n• App version\n• IP address\n• Network information\n• Device identifiers\n• Crash reports\n• Diagnostic information\n• App usage information',
      'This may be used to maintain security, troubleshoot technical problems and improve the Platform.'
    ]
  },
  {
    title: '10. Ratings, Reviews and Complaints',
    body: [
      'Customers may provide ratings, reviews or complaints regarding their experience with a Driver/Partner.',
      'Safarweel may use such information for:',
      '• Platform administration\n• Complaint investigation\n• Fraud prevention\n• Service improvement\n• Account review\n• Enforcement of Platform rules'
    ]
  },
  {
    title: '11. Data Security',
    body: [
      'Safarweel takes reasonable measures intended to protect Driver/Partner information.',
      'However, no digital system or internet transmission can be guaranteed to be completely secure.'
    ]
  },
  {
    title: '12. Data Retention',
    body: [
      'Safarweel may retain Driver/Partner information for as long as reasonably necessary for:',
      '• Platform operation\n• Account administration\n• Transaction records\n• Complaint handling\n• Fraud prevention\n• Dispute resolution\n• Legal compliance\n• Regulatory requirements\n• Legitimate business purposes'
    ]
  },
  {
    title: '13. Third-Party Service Providers',
    body: [
      'Safarweel may use third-party providers for:',
      '• Cloud hosting\n• Maps\n• Payment processing\n• SMS/OTP\n• Analytics\n• Communication\n• Technical infrastructure\n• Security',
      'Such providers may process information under their own applicable policies.'
    ]
  },
  {
    title: '14. Legal Disclosure',
    body: [
      'Safarweel may disclose Driver/Partner information to government authorities, law-enforcement agencies, courts, regulators or other authorized persons where required or permitted by applicable law.'
    ]
  },
  {
    title: '15. Driver/Partner Responsibilities',
    body: [
      'Drivers/Partners are responsible for ensuring that information submitted to Safarweel is accurate and current.',
      'Drivers/Partners are also responsible for independently maintaining all documents, permissions, licences, registrations, insurance and other legal requirements applicable to their vehicle and transportation activity.',
      'Safarweel does not represent that registration on the Platform itself constitutes a licence, permit, authorization or approval from any government authority.'
    ]
  },
  {
    title: '16. Your Rights',
    body: [
      'Subject to applicable law, Drivers/Partners may have rights relating to their personal information, including rights to access, correction, deletion or other legally available rights.',
      'Requests may be submitted to Safarweel Support.'
    ]
  },
  {
    title: '17. Account Closure',
    body: [
      'A Driver/Partner may request account closure subject to applicable requirements.',
      'Safarweel may retain certain information where required for legal compliance, fraud prevention, accounting, dispute resolution or legitimate business purposes.'
    ]
  },
  {
    title: '18. Privacy Policy Changes',
    body: [
      'Safarweel may modify this Privacy Policy from time to time.',
      'Updated versions may be published on the App or Website.'
    ]
  },
  {
    title: '19. Contact',
    body: [
      'Safarweel Privacy Support',
      'Email: privacy@safarweel.in',
      'Customer Support: 9406130661',
      'Website: www.safarweel.in'
    ]
  }
];

const PrivacyPolicyScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Privacy Policy" />

      <ScrollView className="px-4 pb-6 " showsVerticalScrollIndicator={false}>
        <View className="bg-lightCard  dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder  mb-4" style={{ marginTop: 10 }}>
          <Text className="text-base font-extrabold text-textLight dark:text-textDark text-center mb-3">
            SAFARWEEL DRIVER / PARTNER PRIVACY POLICY
          </Text>
          <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mb-1">
            Effective Date: 25/09/2026
          </Text>
          <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mb-3">
            Last Updated: 25/09/2026
          </Text>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed">
            This Privacy Policy applies to Drivers/Partners who register with, access or use the Safarweel Driver/Partner App, Website or Platform.
          </Text>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed mt-2">
            Safarweel (&quot;Safarweel&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot; or &quot;Platform&quot;) is a technology platform intended to facilitate connections between Customers and Drivers/Partners.
          </Text>
        </View>

        {policySections.map((section, index) => (
          <View
            key={section.title}
            className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder  mb-4"
          >
            <Text className="text-xs font-extrabold text-textLight dark:text-textDark mb-3">
              {section.title}
            </Text>

            {section.body.map((paragraph, paragraphIndex) => (
              <Text
                key={`${section.title}-${paragraphIndex}`}
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

export default PrivacyPolicyScreen;

