import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { useAppDispatch } from '../store';
import { restoreSession } from '../store/slices/authSlice';

const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = 'onboarding_complete';

export const AuthNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Login' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setInitialRoute(val === 'true' ? 'Login' : 'Onboarding');
    });
  }, []);

  if (!initialRoute) return null;

  const handleOnboardingComplete = async (nav: any) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    nav.replace('Login');
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen
          name="Onboarding"
          children={({ navigation }) => (
            <OnboardingScreen onComplete={() => handleOnboardingComplete(navigation)} />
          )}
        />
        <Stack.Screen
          name="Login"
          children={() => (
            <LoginScreen onSuccess={() => dispatch(restoreSession())} />
          )}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
