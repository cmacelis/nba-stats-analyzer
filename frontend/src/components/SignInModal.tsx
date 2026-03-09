import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SignInModal: React.FC<Props> = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setStatus('sent');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus('error');
    }
  };

  const handleClose = () => {
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Sign In</DialogTitle>
      <DialogContent>
        {status === 'sent' ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Check your email for a sign-in link. It expires in 15 minutes.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} id="signin-form">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email to receive a sign-in link. No password needed.
            </Typography>
            {status === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {status === 'sent' ? 'Done' : 'Cancel'}
        </Button>
        {status !== 'sent' && (
          <Button
            type="submit"
            form="signin-form"
            variant="contained"
            disabled={status === 'loading'}
            startIcon={status === 'loading' ? <CircularProgress size={16} /> : undefined}
          >
            Send Link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SignInModal;
