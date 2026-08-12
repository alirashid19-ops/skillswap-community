import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  ChevronDown,
  ChevronUp,
  Search,
  MessageCircle,
  LifeBuoy,
  BookOpen,
  Shield,
  Coins,
  Users,
  Calendar,
  Star,
  Repeat,
  Wallet,
  GraduationCap,
  Share2,
  Crown,
  CreditCard,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How does skill swapping work?',
    answer:
      'leteski connects you with people who want to learn what you know, and who can teach you what you want to learn. Browse skills on the Explore tab, find a match, and send a swap request. Both participants teach each other their skills in scheduled 1-on-1 sessions. Free swaps cost a small 3-credit platform fee per request; Premium users pay no platform fee.',
    icon: <Users size={20} color={Colors.light.primary} />,
  },
  {
    question: 'What are credits and how much are they worth?',
    answer:
      '1 Credit = ₹1 face value. Credits are the unified currency on leteski — you use them to pay for group classes, premium skill sessions, and to unlock resources. You earn credits by teaching (group classes, paid 1-on-1 sessions), completing swaps as a learner (10 credits per swap), getting 5-star reviews, or through the monthly Premium subscription bonus of 200 credits. You can also buy credits in the Store.',
    icon: <Coins size={20} color={Colors.light.accent} />,
  },
  {
    question: 'What are group classes and how do they differ from 1-on-1 swaps?',
    answer:
      'Group classes let a teacher teach multiple students at once — think a workshop, a bootcamp, or a recurring course. Unlike 1-on-1 swaps which are free exchanges between two people, group classes have a seat price in credits that students pay upfront when enrolling. Teachers can create single-session classes, daily courses, or weekly recurring courses with one-time or monthly billing.',
    icon: <GraduationCap size={20} color={Colors.light.primary} />,
  },
  {
    question: 'How do I create a group class from one of my skills?',
    answer:
      'Open any skill you teach from your Profile or the Explore tab. If you own that skill, you\'ll see a green "Create Group Class" button at the bottom. Tapping it opens the class creation form pre-filled with your skill\'s title, description, category, level, cover image, and pricing. You can also create a class from scratch via Profile > Create a Group Class, or from My Classes.',
    icon: <GraduationCap size={20} color={Colors.light.secondary} />,
  },
  {
    question: 'What session types and billing options are available for classes?',
    answer:
      'Three session types: Single (one session), Daily (recurring every day across a date range), and Weekly (recurring on selected weekdays, e.g. Mon and Wed). Two billing cycles: One-time (student pays the seat price once) or Monthly (student pays a monthly seat price). The form automatically calculates the total number of sessions based on your date range and selected days.',
    icon: <Repeat size={20} color={Colors.light.primary} />,
  },
  {
    question: 'How do teacher earnings work?',
    answer:
      'Teachers earn 80% of the paid seat credits for every student who attends a group class. For free classes, teachers earn a flat 50 credits per student at completion. The platform takes a 20% commission on paid sessions. When you mark a class complete, your earnings are instantly credited to your leteski credit balance. You also earn 10 bonus credits each time a learner completes a swap with you.',
    icon: <Wallet size={20} color={Colors.light.accent} />,
  },
  {
    question: 'How do I withdraw my earnings?',
    answer:
      'Go to Profile > Earnings to see your balance and transaction history, then tap Request Payout. The minimum payout is 100 credits. Payout rates depend on the method: Store Credit gives you the full ₹1 per credit (1:1, no fee). UPI and Bank Transfer give ₹0.80 per credit. PayPal gives ₹0.75 per credit. Payout requests are reviewed by our admin team before processing.',
    icon: <CreditCard size={20} color={Colors.light.secondary} />,
  },
  {
    question: 'How do I schedule a 1-on-1 swap session?',
    answer:
      'Once a swap request is accepted, you can propose times through the swap detail screen. Both participants agree on a time, and the session is added to your calendar. When it\'s time to meet, you can start a video or voice call directly from the swap detail page.',
    icon: <Calendar size={20} color={Colors.light.secondary} />,
  },
  {
    question: 'What is the Trust Score?',
    answer:
      'Your Trust Score reflects how reliable and verified you are on the platform. It\'s based on completed verifications (identity, email, phone, LinkedIn, portfolio), positive reviews from swap partners and students, and your swap completion rate. A higher score helps you get more swap requests and class enrollments.',
    icon: <Shield size={20} color={Colors.light.primary} />,
  },
  {
    question: 'How do I verify my account?',
    answer:
      'Go to your Profile tab, tap "Account Verification", and follow the steps to verify your identity, email, phone, LinkedIn profile, or portfolio. Each verification boosts your Trust Score and makes your profile more trustworthy to other users.',
    icon: <Shield size={20} color={Colors.light.secondary} />,
  },
  {
    question: 'How do I leave a review?',
    answer:
      'After completing a swap or group class, you\'ll be able to rate and review your partner or teacher. Reviews help build trust in the community. You can rate from 1 to 5 stars and leave a written comment about your experience. Teachers also earn bonus credits for 5-star reviews.',
    icon: <Star size={20} color={Colors.light.accent} />,
  },
  {
    question: 'What is Premium and what are the benefits?',
    answer:
      'Premium is a monthly subscription that gives you 200 bonus credits each month, waives the 3-credit platform fee on all swap requests, and boosts your profile visibility so you appear higher in search results and Smart Matches. You can subscribe from the Store or the Profile tab.',
    icon: <Crown size={20} color={Colors.light.accent} />,
  },
  {
    question: 'How do I share my profile with others?',
    answer:
      'On your Profile tab, tap the Share icon next to your name. This opens your device\'s native share sheet so you can send your leteski profile link via WhatsApp, SMS, email, or any other app. If sharing isn\'t available on your device, the link is copied to your clipboard instead.',
    icon: <Share2 size={20} color={Colors.light.primary} />,
  },
  {
    question: 'What happens if I cancel my class enrollment?',
    answer:
      'If you cancel your enrollment in a group class before it starts, your credits are fully refunded to your balance. If a teacher cancels an entire class, all enrolled students are automatically refunded their full seat price. No questions asked.',
    icon: <MessageCircle size={20} color={Colors.light.secondary} />,
  },
  {
    question: 'What if someone doesn\'t show up?',
    answer:
      'If your swap partner doesn\'t attend a scheduled session, you can report it through the swap detail screen. Repeated no-shows affect a user\'s Trust Score and may result in account restrictions. We encourage communication first — reach out via chat to reschedule.',
    icon: <MessageCircle size={20} color={Colors.light.error} />,
  },
  {
    question: 'How do I report inappropriate behavior?',
    answer:
      'If you experience harassment, spam, or any inappropriate behavior, you can report the user through their profile or from the swap detail screen. Our admin team reviews all reports and takes appropriate action, including warnings and account suspension.',
    icon: <LifeBuoy size={20} color={Colors.light.error} />,
  },
];

export default function HelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={[Colors.light.primary, Colors.light.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <LifeBuoy size={40} color="#FFFFFF" />
          <Text style={styles.headerTitle}>How can we help?</Text>
          <Text style={styles.headerSubtitle}>
            Find answers to common questions or reach out to our team
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.light.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help articles..."
              placeholderTextColor={Colors.light.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or contact us directly
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {filteredFaqs.map((item, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.faqCard,
                      isExpanded && styles.faqCardExpanded,
                    ]}
                    onPress={() =>
                      setExpandedIndex(isExpanded ? null : index)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <View style={styles.faqIcon}>{item.icon}</View>
                      <Text style={styles.faqQuestion} numberOfLines={isExpanded ? undefined : 2}>
                        {item.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={20} color={Colors.light.primary} />
                      ) : (
                        <ChevronDown size={20} color={Colors.light.textTertiary} />
                      )}
                    </View>
                    {isExpanded && (
                      <View style={styles.faqAnswer}>
                        <View style={styles.faqAnswerDivider} />
                        <Text style={styles.faqAnswerText}>{item.answer}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactSubtitle}>
              Our support team is ready to assist you with any questions or issues
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    marginTop: -20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqCardExpanded: {
    borderColor: Colors.light.primaryLight,
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    lineHeight: 22,
  },
  faqAnswer: {
    marginTop: 14,
  },
  faqAnswerDivider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginBottom: 14,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  contactSection: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  contactSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
