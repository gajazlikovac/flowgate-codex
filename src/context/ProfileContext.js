import React, { createContext, useContext, useState } from 'react';

const ProfileContext = createContext();

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
  const [customAvatar, setCustomAvatar] = useState(
    localStorage.getItem('custom_avatar') || null
  );

  const updateCustomAvatar = (newAvatarUrl) => {
    setCustomAvatar(newAvatarUrl);
    localStorage.setItem('custom_avatar', newAvatarUrl);
  };

  return (
    <ProfileContext.Provider value={{ customAvatar, updateCustomAvatar }}>
      {children}
    </ProfileContext.Provider>
  );
};
