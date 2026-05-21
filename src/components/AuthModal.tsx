import React, { useState } from 'react';
import { X, User, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase, ensureDefaultProfilesExist } from '../supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Database connection is not configured.');
      return;
    }

    const cleanUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
      setError('Username must be 3-15 alphanumeric characters (letters, numbers, underscores).');
      return;
    }

    setLoading(true);
    setError(null);

    // Map username to a local email format transparently
    const internalEmail = `${cleanUsername.toLowerCase()}.planner@gmail.com`;

    try {
      if (isSignUp) {
        // Sign Up in Supabase
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password,
        });

        if (signUpError) throw signUpError;

        if (data?.user) {
          // Provision initial capitalized profile named after the username
          await ensureDefaultProfilesExist(data.user.id, cleanUsername);
          onSuccess(data.user);
          onClose();
        } else {
          setError('Failed to create account. Please try again.');
        }
      } else {
        // Log In in Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });

        if (signInError) throw signInError;

        if (data?.user) {
          // Make sure default profile exists
          await ensureDefaultProfilesExist(data.user.id, cleanUsername);
          onSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '2rem' }}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={32} className="auth-icon-glow" />
          </div>
          <h2>{isSignUp ? 'Create Account' : 'Log in to your planner'}</h2>
          <p>Access your planner from anywhere securely</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(null); }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(null); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="auth-username">Username</label>
            <div className="input-wrapper">
              <User className="input-icon" size={16} />
              <input
                id="auth-username"
                type="text"
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{isSignUp ? 'Creating account...' : 'Connecting...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Register & Create Profile' : 'Log In & Load Data'}</span>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          {isSignUp ? (
            <>Already have an account? <span onClick={() => setIsSignUp(false)}>Log In</span></>
          ) : (
            <>New to the planner? <span onClick={() => setIsSignUp(true)}>Create a account</span></>
          )}
        </p>
      </div>
    </div>
  );
}
