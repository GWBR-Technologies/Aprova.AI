import { Tabs } from 'expo-router';

import { Colors, MinTouchTarget } from '@/constants/theme';

// As abas só existem para o que tem contrato aprovado; as demais entram com seus contextos.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inkMuted,
        tabBarStyle: { backgroundColor: Colors.surfaceRaised, borderTopColor: Colors.border, minHeight: MinTouchTarget + 16 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Redação' }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta' }} />
    </Tabs>
  );
}
