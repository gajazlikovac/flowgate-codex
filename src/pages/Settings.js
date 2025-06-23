import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useOnboarding } from '../context/OnboardingContext';
import { useProfile } from '../context/ProfileContext';
import LogoutButton from '../components/auth/LogoutButton';

const Settings = () => {
  const { user } = useAuth0();
  const { companyData, setCompanyData } = useOnboarding();
  const { customAvatar, updateCustomAvatar } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({ ...companyData });

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => {
    setIsEditing(false);
    setFormState({ ...companyData });
  };

  const handleSaveClick = () => {
    setCompanyData({ ...formState });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      updateCustomAvatar(imageUrl);
    }
  };

  return (
    <div className="settings-page" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Account Settings</h2>
      <div style={{ backgroundColor: 'var(--background-white)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '24px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--background-light)', position: 'relative' }}>
          <img src={customAvatar || user?.picture || '/default-avatar.png'} alt="User avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {isEditing && (
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', opacity: 0, width: '100%', height: '100%' }} title="Change Avatar" />
          )}
        </div>
        {!isEditing ? (
          <div style={{ flex: 1 }}>
            <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Company:</strong> {companyData?.name || 'N/A'}</p>
            <p><strong>Website:</strong> {companyData?.website || 'N/A'}</p>
            <p><strong>Department:</strong> {companyData?.contactRole || 'N/A'}</p>
            <p><strong>Contact:</strong> {companyData?.contactName || 'N/A'}</p>
            <p><strong>Contact Email:</strong> {companyData?.contactEmail || 'N/A'}</p>
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleEditClick}>Edit Profile</button>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            {/* editable form fields */}
            <div className="form-group"><label>Company Name</label><input type="text" name="name" value={formState.name} onChange={handleChange} /></div>
            <div className="form-group"><label>Company Website</label><input type="text" name="website" value={formState.website} onChange={handleChange} /></div>
            <div className="form-group"><label>Contact Name</label><input type="text" name="contactName" value={formState.contactName} onChange={handleChange} /></div>
            <div className="form-group"><label>Contact Email</label><input type="email" name="contactEmail" value={formState.contactEmail} onChange={handleChange} /></div>
            <div className="form-group"><label>Department/Role</label><input type="text" name="contactRole" value={formState.contactRole} onChange={handleChange} /></div>
            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={handleSaveClick}>Save</button>
              <button className="btn btn-secondary" style={{ marginLeft: '10px' }} onClick={handleCancelClick}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: '40px' }}><LogoutButton /></div>
    </div>
  );
};

export default Settings;
