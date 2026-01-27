import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Coins, Crown, Zap, Check } from 'lucide-react-native';
import { useState } from 'react';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/auth';
import { formatPrice } from '@/constants/locale';

const creditPackages = [
  { id: 'starter' as const, credits: 25, price: 99, popular: false },
  { id: 'popular' as const, credits: 60, price: 199, popular: true },
  { id: 'best_value' as const, credits: 150, price: 449, popular: false },
  { id: 'mega' as const, credits: 400, price: 999, popular: false },
];

const premiumTiers = [
  {
    id: 'basic' as const,
    name: 'Basic',
    monthlyPrice: 199,
    yearlyPrice: 1999,
    monthlyCredits: 30,
    features: ['Priority matching', 'Ad-free experience', 'Basic analytics'],
    color: '#6366F1',
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    monthlyPrice: 399,
    yearlyPrice: 3999,
    monthlyCredits: 80,
    features: ['All Basic features', 'Unlimited swaps', 'Advanced matching', 'Video calls'],
    color: '#8B5CF6',
    popular: true,
  },
  {
    id: 'elite' as const,
    name: 'Elite',
    monthlyPrice: 999,
    yearlyPrice: 9999,
    monthlyCredits: 200,
    features: ['All Premium features', 'Concierge support', 'Exclusive events', 'Expert badge'],
    color: '#F59E0B',
  },
];

export default function StoreScreen() {
  const [selectedTab, setSelectedTab] = useState<'credits' | 'premium'>('credits');
  const [selectedDuration, setSelectedDuration] = useState<'monthly' | 'yearly'>('monthly');
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const purchaseCreditsMutation = trpc.credits.purchaseCredits.useMutation({
    onSuccess: (data) => {
      Alert.alert('Success!', `${data.creditsAdded} credits added to your account!`);
      // Credits updated on backend, refetch will update UI
      utils.credits.getBalance.invalidate();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const purchasePremiumMutation = trpc.credits.purchasePremium.useMutation({
    onSuccess: (data) => {
      Alert.alert('Success!', `Welcome to ${data.tier} tier! ${data.creditsAdded} bonus credits added!`);
      // Premium tier updated on backend, refetch will update UI
      utils.credits.getBalance.invalidate();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handlePurchaseCredits = (packageId: typeof creditPackages[number]['id']) => {
    const pkg = creditPackages.find((p) => p.id === packageId);
    if (!pkg) return;

    Alert.alert(
      'Purchase Credits',
      `Buy ${pkg.credits} credits for ${formatPrice(pkg.price)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            purchaseCreditsMutation.mutate({ packageId });
          },
        },
      ]
    );
  };

  const handlePurchasePremium = (tier: typeof premiumTiers[number]['id']) => {
    const tierInfo = premiumTiers.find((t) => t.id === tier);
    if (!tierInfo) return;

    const price = selectedDuration === 'monthly' ? tierInfo.monthlyPrice : tierInfo.yearlyPrice;

    Alert.alert(
      `Upgrade to ${tierInfo.name}`,
      `Subscribe for ${formatPrice(price)}/${selectedDuration}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => {
            purchasePremiumMutation.mutate({ tier, duration: selectedDuration });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Store',
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.light.text,
          },
        }}
      />

      <View style={styles.header}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Coins size={24} color="#F59E0B" />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>{user?.credits || 0} Credits</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'credits' && styles.tabActive]}
          onPress={() => setSelectedTab('credits')}
        >
          <Coins size={20} color={selectedTab === 'credits' ? Colors.light.primary : Colors.light.textSecondary} />
          <Text style={[styles.tabText, selectedTab === 'credits' && styles.tabTextActive]}>Buy Credits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'premium' && styles.tabActive]}
          onPress={() => setSelectedTab('premium')}
        >
          <Crown size={20} color={selectedTab === 'premium' ? Colors.light.primary : Colors.light.textSecondary} />
          <Text style={[styles.tabText, selectedTab === 'premium' && styles.tabTextActive]}>Premium</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'credits' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Packages</Text>
            <Text style={styles.sectionDescription}>
              Use credits to request skill swaps and unlock premium features
            </Text>
            <View style={styles.packagesGrid}>
              {creditPackages.map((pkg) => (
                <View key={pkg.id} style={styles.packageCard}>
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Zap size={12} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.packageIcon}>
                    <Coins size={32} color={Colors.light.primary} />
                  </View>
                  <Text style={styles.packageCredits}>{pkg.credits}</Text>
                  <Text style={styles.packageLabel}>Credits</Text>
                  <View style={styles.packageDivider} />
                  <Text style={styles.packagePrice}>{formatPrice(pkg.price)}</Text>
                  <TouchableOpacity
                    style={[
                      styles.packageButton,
                      purchaseCreditsMutation.isPending && styles.packageButtonDisabled,
                    ]}
                    onPress={() => handlePurchaseCredits(pkg.id)}
                    disabled={purchaseCreditsMutation.isPending}
                  >
                    <Text style={styles.packageButtonText}>
                      {purchaseCreditsMutation.isPending ? 'Processing...' : 'Buy Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Membership</Text>
            <Text style={styles.sectionDescription}>
              Unlock unlimited swaps, priority matching, and exclusive features
            </Text>

            <View style={styles.durationSelector}>
              <TouchableOpacity
                style={[
                  styles.durationOption,
                  selectedDuration === 'monthly' && styles.durationOptionActive,
                ]}
                onPress={() => setSelectedDuration('monthly')}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === 'monthly' && styles.durationTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.durationOption,
                  selectedDuration === 'yearly' && styles.durationOptionActive,
                ]}
                onPress={() => setSelectedDuration('yearly')}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === 'yearly' && styles.durationTextActive,
                  ]}
                >
                  Yearly
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save 17%</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.tiersContainer}>
              {premiumTiers.map((tier) => (
                <View
                  key={tier.id}
                  style={[
                    styles.tierCard,
                    tier.popular && styles.tierCardPopular,
                  ]}
                >
                  {tier.popular && (
                    <View style={styles.tierPopularBadge}>
                      <Crown size={14} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.tierPopularText}>MOST POPULAR</Text>
                    </View>
                  )}
                  <View style={[styles.tierIcon, { backgroundColor: tier.color }]}>
                    <Crown size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <View style={styles.tierPriceContainer}>
                    <Text style={styles.tierPrice}>
                      {formatPrice(selectedDuration === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice)}
                    </Text>
                    <Text style={styles.tierPricePeriod}>/{selectedDuration === 'monthly' ? 'mo' : 'yr'}</Text>
                  </View>
                  <View style={styles.tierCreditsInfo}>
                    <Coins size={16} color={tier.color} />
                    <Text style={styles.tierCreditsText}>{tier.monthlyCredits} credits/month</Text>
                  </View>
                  <View style={styles.tierFeatures}>
                    {tier.features.map((feature, index) => (
                      <View key={index} style={styles.tierFeature}>
                        <Check size={18} color={tier.color} strokeWidth={2.5} />
                        <Text style={styles.tierFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.tierButton,
                      { backgroundColor: tier.color },
                      purchasePremiumMutation.isPending && styles.tierButtonDisabled,
                    ]}
                    onPress={() => handlePurchasePremium(tier.id)}
                    disabled={purchasePremiumMutation.isPending}
                  >
                    <Text style={styles.tierButtonText}>
                      {purchasePremiumMutation.isPending ? 'Processing...' : 'Subscribe'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a demo payment system. No actual charges will be made.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  tabActive: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  packageIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  packageCredits: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  packageLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  packageDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginVertical: 12,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.primary,
    marginBottom: 12,
  },
  packageButton: {
    width: '100%',
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  packageButtonDisabled: {
    opacity: 0.6,
  },
  packageButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  durationOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.light.borderLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  durationOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  durationTextActive: {
    color: Colors.light.primary,
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  tiersContainer: {
    gap: 16,
    marginBottom: 20,
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  tierCardPopular: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  tierPopularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tierPopularText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tierIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  tierPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  tierPrice: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  tierPricePeriod: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  tierCreditsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  tierCreditsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  tierFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  tierFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierFeatureText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  tierButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  tierButtonDisabled: {
    opacity: 0.6,
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
