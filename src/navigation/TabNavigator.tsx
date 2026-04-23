import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TabParamList } from './navigationTypes';
import { ScanScreen } from '@features/scan/ScanScreen';
import { InventoryScreen } from '@features/inventory/InventoryScreen';
import { SanidadScreen } from '@features/sanidad/SanidadScreen';
import { PotrerosScreen } from '@features/potreros/PotrerosScreen';
import { DashboardScreen } from '@features/dashboard/DashboardScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { colors, spacing, typography } from '@theme/index';

const Tab = createBottomTabNavigator<TabParamList>();

const TABS: {
  name: keyof TabParamList;
  label: string;
  emoji: string;
}[] = [
  { name: 'Scan', label: 'Escanear', emoji: '📡' },
  { name: 'Inventory', label: 'Inventario', emoji: '🐄' },
  { name: 'Sanidad', label: 'Sanidad', emoji: '💉' },
  { name: 'Potreros', label: 'Potreros', emoji: '🌿' },
  { name: 'Dashboard', label: 'Dashboard', emoji: '📊' },
  { name: 'Settings', label: 'Ajustes', emoji: '⚙️' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabStyles.container, { paddingBottom: insets.bottom || spacing.sm }]}>
      {state.routes.map((route, index) => {
        const tabConfig = TABS.find((t) => t.name === route.name);
        if (!tabConfig) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? tabConfig.label}
            style={tabStyles.tab}
          >
            <View style={[tabStyles.tabInner, isFocused && tabStyles.tabInnerActive]}>
              <Text style={[tabStyles.emoji, isFocused && tabStyles.emojiFocused]}>
                {tabConfig.emoji}
              </Text>
            </View>
            <Text style={[tabStyles.label, isFocused && tabStyles.labelFocused]}>
              {tabConfig.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  tabInner: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInnerActive: {
    backgroundColor: 'rgba(0,214,143,0.15)',
  },
  emoji: {
    fontSize: 20,
    opacity: 0.45,
  },
  emojiFocused: {
    opacity: 1,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  labelFocused: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Sanidad" component={SanidadScreen} />
      <Tab.Screen name="Potreros" component={PotrerosScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
