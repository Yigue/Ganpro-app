import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Scan: undefined;
  Inventory: undefined;
  Sanidad: undefined;
  Potreros: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
