import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { TabParamList } from './navigationTypes';
import { ScanScreen } from '@features/scan/ScanScreen';
import { InventoryScreen } from '@features/inventory/InventoryScreen';
import { SanidadScreen } from '@features/sanidad/SanidadScreen';
import { PotrerosScreen } from '@features/potreros/PotrerosScreen';
import { DashboardScreen } from '@features/dashboard/DashboardScreen';
import { colors, spacing, typography } from '@theme/index';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: keyof TabParamList;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'Inventory', label: 'Inventario', icon: 'list-outline', iconFocused: 'list' },
  { name: 'Sanidad', label: 'Sanidad', icon: 'medkit-outline', iconFocused: 'medkit' },
  { name: 'Scan', label: 'Escanear', icon: 'scan-outline', iconFocused: 'scan' }, // Botón Central
  { name: 'Potreros', label: 'Potreros', icon: 'leaf-outline', iconFocused: 'leaf' },
  { name: 'Dashboard', label: 'Dashboard', icon: 'stats-chart-outline', iconFocused: 'stats-chart' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={tabStyles.container}>
      <View style={[tabStyles.bar, { paddingBottom: insets.bottom || spacing.sm }]}>
        {state.routes.map((route, index) => {
          const tabConfig = TABS.find((t) => t.name === route.name);
          if (!tabConfig) return null;

          const isFocused = state.index === index;
          const isScanTab = route.name === 'Scan';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isScanTab) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.9}
                style={tabStyles.scanTabContainer}
              >
                <View style={tabStyles.scanButton}>
                  <Ionicons name="scan" size={32} color="white" />
                </View>
                <Text style={[tabStyles.label, tabStyles.scanLabel]}>
                  {tabConfig.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabStyles.tab}
            >
              <Ionicons
                name={isFocused ? tabConfig.iconFocused : tabConfig.icon}
                size={24}
                color={isFocused ? colors.primary : colors.textSecondary}
              />
              <Text style={[tabStyles.label, isFocused && tabStyles.labelFocused]}>
                {tabConfig.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    alignItems: 'flex-end',
    height: 75,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingBottom: 4,
  },
  scanTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -35,
    borderWidth: 6,
    borderColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  scanLabel: {
    marginTop: 20,
    color: colors.primary,
    fontWeight: typography.weights.bold,
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
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Sanidad" component={SanidadScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Potreros" component={PotrerosScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
    </Tab.Navigator>
  );
}
