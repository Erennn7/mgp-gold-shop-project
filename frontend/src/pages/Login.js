import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../store/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading, error } = useAuth();
  
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
    
    // Auto-login for demo
    handleLogin();
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // Call login from auth context
      const loginSuccess = await login(email, password);
      
      if (loginSuccess) {
        navigate('/');
      } else {
        setLoginError('Login failed. Please try again.');
      }
    } catch (error) {
      setLoginError('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          MG Potdar Jewellers
        </Typography>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
          Sign in to your account
        </Typography>

        {loginError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {loginError}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={isLoading || loading}
          />
          
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={isLoading || loading}
          />
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading || loading}
          >
            {(isLoading || loading) ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          © {new Date().getFullYear()} MG Potdar Jewellers
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login; 