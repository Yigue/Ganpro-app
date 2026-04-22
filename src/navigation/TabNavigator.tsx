import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabParamList } from './navigationTypes';
import { ScanScreen } from '@features/scan/ScanScreen';
import { InventoryScreen } from '@features/inventory/InventoryScreen';
import { SanidadScreen } from '@features/sanidad/SanidadScreen';
import { PotrerosScreen } from '@features/potreros/PotrerosScreen';
import { DashboardScreen } from '@features/dashboard/DashboardScreen';
import { FinancieroScreen } from '@features/financiero/FinancieroScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { colors, spacing, typography } from '@theme/index';

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: spacing.touchTargetLg + spacing.md,
          paddingBottom: spacing.sm,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: 'Inventario',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐄" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Sanidad"
        component={SanidadScreen}
        options={{
          tabBarLabel: 'Sanidad',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💉" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Potreros"
        component={PotrerosScreen}
        options={{
          tabBarLabel: 'Potreros',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌿" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Financiero"
        component={FinancieroScreen}
        options={{
          tabBarLabel: 'Finanzas',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
