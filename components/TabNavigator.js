import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TabNavigator = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'soul', label: 'Soul', icon: 'heart' },
    { id: 'matches', label: 'Matches', icon: 'people' },
    { id: 'profile', label: 'Profile', icon: 'person' }
  ];

  const getTabStyle = (tabId) => {
    const isActive = currentTab === tabId;
    return [
      styles.tab,
      isActive && styles.activeTab
    ];
  };

  const getTextStyle = (tabId) => {
    const isActive = currentTab === tabId;
    return [
      styles.tabText,
      isActive && styles.activeTabText
    ];
  };

  const getIconColor = (tabId) => {
    return currentTab === tabId ? '#FF6B6B' : '#999';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#87CEEB', '#DDA0DD', '#DA70D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {tabs.find(tab => tab.id === currentTab)?.label || 'SoulAI'}
        </Text>
      </LinearGradient>
      
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={getTabStyle(tab.id)}
            onPress={() => onTabChange(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={24} 
              color={getIconColor(tab.id)} 
            />
            <Text style={getTextStyle(tab.id)}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Add active tab styling if needed
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
