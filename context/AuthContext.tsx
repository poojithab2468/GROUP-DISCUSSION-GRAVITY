import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface User {
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  targetRole?: string;
  college?: string;
}

interface RegisteredUser extends User {
  password?: string;
}

const USERS_STORAGE_KEY = 'gd_registered_users';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('isLoggedIn');
        if (loggedIn === 'true') {
          const name = await AsyncStorage.getItem('userName');
          const email = await AsyncStorage.getItem('userEmail');
          const bio = await AsyncStorage.getItem('userBio');
          const avatarUrl = await AsyncStorage.getItem('userAvatar');
          const targetRole = await AsyncStorage.getItem('userTargetRole');
          const college = await AsyncStorage.getItem('userCollege');

          if (email) {
            const initialUser: User = {
              name: name || 'Fluent Learner',
              email,
              bio: bio || 'Placement Aspirant aiming to master corporate Group Discussions.',
              avatarUrl: avatarUrl || '',
              targetRole: targetRole || 'Software Development Engineer',
              college: college || 'Engineering Graduate',
            };
            setUser(initialUser);
            setIsLoggedIn(true);

            // Optional background sync with backend MongoDB
            try {
              fetch(`http://localhost:3000/api/users/profile/${encodeURIComponent(email)}`)
                .then(r => r.json())
                .then(data => {
                  if (data?.success && data.user) {
                    const u = data.user;
                    setUser(prev => prev ? ({
                      ...prev,
                      name: u.name || prev.name,
                      bio: u.bio !== undefined ? u.bio : prev.bio,
                      avatarUrl: u.avatarUrl !== undefined ? u.avatarUrl : prev.avatarUrl,
                      targetRole: u.targetRole !== undefined ? u.targetRole : prev.targetRole,
                      college: u.college !== undefined ? u.college : prev.college,
                    }) : null);
                  }
                })
                .catch(() => {});
            } catch (_) {}
          } else {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
        setIsLoggedIn(false);
      }
    };
    loadAuth();
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: RegisteredUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      
      const foundUser = users.find(u => u.email === cleanEmail);
      
      if (!foundUser) {
        throw new Error('User not found');
      }

      if (password && foundUser.password && foundUser.password !== password) {
        throw new Error('Invalid password');
      }

      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userName', foundUser.name);
      await AsyncStorage.setItem('userEmail', foundUser.email);
      if (foundUser.bio) await AsyncStorage.setItem('userBio', foundUser.bio);
      if (foundUser.avatarUrl) await AsyncStorage.setItem('userAvatar', foundUser.avatarUrl);
      if (foundUser.targetRole) await AsyncStorage.setItem('userTargetRole', foundUser.targetRole);
      if (foundUser.college) await AsyncStorage.setItem('userCollege', foundUser.college);

      const loggedUser: User = {
        name: foundUser.name,
        email: foundUser.email,
        bio: foundUser.bio || 'Placement Aspirant aiming to master corporate Group Discussions.',
        avatarUrl: foundUser.avatarUrl || '',
        targetRole: foundUser.targetRole || 'Software Development Engineer',
        college: foundUser.college || 'Engineering Graduate',
      };
      setUser(loggedUser);
      setIsLoggedIn(true);
      return foundUser;
    } catch (e) {
      console.error('Login failed', e);
      throw e;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password?: string) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: RegisteredUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      
      if (users.some(u => u.email === cleanEmail)) {
        throw new Error('Email already registered');
      }

      const defaultBio = 'Placement Aspirant aiming to master corporate Group Discussions.';
      const defaultRole = 'Software Development Engineer';
      const defaultCollege = 'Engineering Graduate';

      const newUser: RegisteredUser = {
        name,
        email: cleanEmail,
        password,
        bio: defaultBio,
        targetRole: defaultRole,
        college: defaultCollege,
      };
      const updatedUsers = [...users, newUser];
      
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      
      // Auto-login after registration
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('userEmail', cleanEmail);
      await AsyncStorage.setItem('userBio', defaultBio);
      await AsyncStorage.setItem('userTargetRole', defaultRole);
      await AsyncStorage.setItem('userCollege', defaultCollege);

      setUser({
        name,
        email: cleanEmail,
        bio: defaultBio,
        avatarUrl: '',
        targetRole: defaultRole,
        college: defaultCollege,
      });
      setIsLoggedIn(true);

      // Background persist to backend MongoDB
      try {
        fetch('http://localhost:3000/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            name,
            bio: defaultBio,
            targetRole: defaultRole,
            college: defaultCollege,
          }),
        }).catch(() => {});
      } catch (_) {}
      
      return newUser;
    } catch (e) {
      console.error('Registration failed', e);
      throw e;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error('No user currently logged in');

      const updatedUser: User = {
        ...user,
        ...updates,
      };

      // 1. Update AsyncStorage
      if (updates.name !== undefined) await AsyncStorage.setItem('userName', updates.name);
      if (updates.bio !== undefined) await AsyncStorage.setItem('userBio', updates.bio);
      if (updates.avatarUrl !== undefined) await AsyncStorage.setItem('userAvatar', updates.avatarUrl);
      if (updates.targetRole !== undefined) await AsyncStorage.setItem('userTargetRole', updates.targetRole);
      if (updates.college !== undefined) await AsyncStorage.setItem('userCollege', updates.college);

      // 2. Update USERS_STORAGE_KEY registry
      const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (storedUsers) {
        const users: RegisteredUser[] = JSON.parse(storedUsers);
        const userIndex = users.findIndex(u => u.email === user.email);
        if (userIndex >= 0) {
          users[userIndex] = {
            ...users[userIndex],
            ...updates,
          };
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }

      // 3. Update React state
      setUser(updatedUser);

      // 4. Persist to MongoDB backend
      try {
        const response = await fetch('http://localhost:3000/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: updatedUser.name,
            bio: updatedUser.bio,
            avatarUrl: updatedUser.avatarUrl,
            targetRole: updatedUser.targetRole,
            college: updatedUser.college,
          }),
        });
        const resData = await response.json();
        console.log('[AuthContext] Backend profile update response:', resData?.message);
      } catch (beErr) {
        console.warn('[AuthContext] Backend sync fallback notice:', beErr);
      }

      return updatedUser;
    } catch (e) {
      console.error('Failed to update profile', e);
      throw e;
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) throw new Error('Please enter your registered email address.');
      if (!newPassword || newPassword.length < 4) {
        throw new Error('New password must be at least 4 characters long.');
      }

      const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: RegisteredUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      const userIndex = users.findIndex(u => u.email === cleanEmail);

      if (userIndex === -1) {
        throw new Error('No account found with this email address.');
      }

      users[userIndex].password = newPassword;
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('Password reset failed', e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userBio');
      await AsyncStorage.removeItem('userAvatar');
      await AsyncStorage.removeItem('userTargetRole');
      await AsyncStorage.removeItem('userCollege');
      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Failed to clear auth state', e);
    }
  }, []);

  return {
    user,
    isLoggedIn,
    login,
    register,
    resetPassword,
    updateProfile,
    logout,
  };
});
