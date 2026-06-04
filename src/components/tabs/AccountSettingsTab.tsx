import React, { useState, useRef } from 'react';
import './AccountSettingsTab.css';
import { Trash2, Edit2, Upload, Plus, Check, X, User } from 'lucide-react';
import { updateProfileName } from '../../supabase';

interface AccountSettingsTabProps {
  user: any;
  profiles: any[];
  activeProfile: string;
  setActiveProfile: (name: string) => void;
  setProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  deleteUserProfile: (userId: string, profileName: string) => Promise<any>;
  createCustomProfile: (userId: string, profileName: string) => Promise<any>;
  processFile: (file: File) => void;
  clearGoodData: () => void;
}

export const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({
  user,
  profiles,
  activeProfile,
  setActiveProfile,
  setProfiles,
  deleteUserProfile,
  createCustomProfile,
  processFile,
  clearGoodData,
}) => {
  const [editingProfileName, setEditingProfileName] = useState<string | null>(null);
  const [editInputName, setEditInputName] = useState<string>('');
  
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteProfile = async (profileName: string) => {
    if (!user) return;
    if (window.confirm(`Are you sure you want to delete the profile "${profileName}"? This action cannot be undone.`)) {
      try {
        await deleteUserProfile(user.id, profileName);
        setProfiles(prev => prev.filter(p => p.profile_name !== profileName));
        if (activeProfile === profileName) {
          const fallback = profiles.find(p => p.profile_name !== profileName);
          if (fallback) {
            setActiveProfile(fallback.profile_name);
          } else {
            setActiveProfile('');
          }
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete profile.');
      }
    }
  };

  const startEditing = (name: string) => {
    setEditingProfileName(name);
    setEditInputName(name);
  };

  const cancelEditing = () => {
    setEditingProfileName(null);
    setEditInputName('');
  };

  const saveEditing = async (oldName: string) => {
    if (!user) return;
    const trimmed = editInputName.trim();
    if (!trimmed || trimmed === oldName) {
      cancelEditing();
      return;
    }
    if (profiles.some(p => p.profile_name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A profile with this name already exists.');
      return;
    }
    try {
      await updateProfileName(user.id, oldName, trimmed);
      setProfiles(prev => prev.map(p => 
        p.profile_name === oldName ? { ...p, profile_name: trimmed } : p
      ));
      if (activeProfile === oldName) {
        setActiveProfile(trimmed);
      }
      cancelEditing();
    } catch (err: any) {
      alert(err.message || 'Failed to rename profile.');
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = newProfileName.trim();
    if (!trimmed) return;
    if (profiles.some(p => p.profile_name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A profile with this name already exists.');
      return;
    }
    setIsCreatingProfile(true);
    try {
      const newProfile = await createCustomProfile(user.id, trimmed);
      if (newProfile) {
        setProfiles(prev => [...prev, newProfile].sort((a, b) => a.profile_name.localeCompare(b.profile_name)));
        setActiveProfile(trimmed);
        setIsAddingProfile(false);
        setNewProfileName('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create profile.');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      event.target.value = ''; // Reset input
    }
  };

  const handleDeleteData = () => {
    if (window.confirm('Are you sure you want to delete all imported GOOD data? Your planner items will be kept, but materials, characters, and weapons will be cleared.')) {
      clearGoodData();
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Account Settings</h2>
      </div>

      <div className="settings-section">
        <h3>Profiles</h3>
        
        {user ? (
          <>
            <div className="profiles-list">
              {profiles.map(p => (
                <div key={p.profile_name} className={`profile-row ${activeProfile === p.profile_name ? 'active' : ''}`}>
                  <div className="profile-name-container">
                    <User size={18} color={activeProfile === p.profile_name ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                    {editingProfileName === p.profile_name ? (
                      <input
                        type="text"
                        className="profile-name-input"
                        value={editInputName}
                        onChange={(e) => setEditInputName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(p.profile_name);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                    ) : (
                      <span className="profile-name-text">
                        {p.profile_name} {activeProfile === p.profile_name && '(Active)'}
                      </span>
                    )}
                  </div>
                  
                  <div className="profile-actions">
                    {editingProfileName === p.profile_name ? (
                      <>
                        <button className="icon-btn" onClick={() => saveEditing(p.profile_name)} title="Save"><Check size={16} /></button>
                        <button className="icon-btn" onClick={cancelEditing} title="Cancel"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn" onClick={() => startEditing(p.profile_name)} title="Rename profile"><Edit2 size={16} /></button>
                        {profiles.length > 1 && (
                          <button className="icon-btn delete-btn" onClick={() => handleDeleteProfile(p.profile_name)} title="Delete profile">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isAddingProfile ? (
              <button className="create-profile-btn" onClick={() => setIsAddingProfile(true)}>
                <Plus size={18} /> Create Profile
              </button>
            ) : (
              <form className="create-profile-form" onSubmit={handleCreateProfile}>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Profile name..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="create-profile-input"
                  disabled={isCreatingProfile}
                  autoFocus
                />
                <button type="submit" className="data-btn confirm-btn" disabled={isCreatingProfile}>
                  Add
                </button>
                <button type="button" className="data-btn cancel-btn" onClick={() => setIsAddingProfile(false)} disabled={isCreatingProfile}>
                  Cancel
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-secondary)' }}>
            Sign in to create and manage multiple profiles.
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Profile Data</h3>
        <div className="profile-data-actions">
          
          <div className="active-profile-selector">
            <span style={{ color: 'var(--text-secondary)' }}>Target Profile:</span>
            {user ? (
              <select 
                value={activeProfile} 
                onChange={(e) => setActiveProfile(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.profile_name} value={p.profile_name}>
                    {p.profile_name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="profile-name-text">Local Default</span>
            )}
          </div>

          <div className="data-buttons">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button className="settings-btn settings-btn-import" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} /> Import File
            </button>
            <button className="settings-btn settings-btn-clear" onClick={handleDeleteData}>
              <Trash2 size={18} /> Delete Data
            </button>
          </div>
          
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
            <strong>Import File:</strong> Uploads your Genshin Optimizer data file, format GOOD. This will sync your inventory, characters, and weapons with your planner items. <br/><br/>
            <strong>Delete Data:</strong> Clears your imported characters, weapons, and materials. Your Planner targets and priorities will be kept safe.
          </p>
        </div>
      </div>

    </div>
  );
};
