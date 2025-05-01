import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Link,
  Box,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const MongoDBConfigDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const [mongodbUri, setMongodbUri] = useState('');
  const [port, setPort] = useState('5001');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  // Load existing MongoDB configuration on first render
  useEffect(() => {
    if (open && initialLoad) {
      setInitialLoad(false);
      
      const loadConfig = async () => {
        try {
          setLoading(true);
          
          // Check if we have access to electron
          if (window.electron) {
            const config = await window.electron.getMongoDBConfig();
            if (config) {
              setMongodbUri(config.uri || '');
              setPort(config.port ? config.port.toString() : '5001');
            }
          }
        } catch (error) {
          console.error('Failed to load MongoDB config:', error);
          setError('Failed to load current configuration');
        } finally {
          setLoading(false);
        }
      };
      
      loadConfig();
    }
  }, [open, initialLoad]);
  
  // Handle test connection
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError('');
      setSuccess('');
      
      if (!mongodbUri) {
        setError('MongoDB URI is required');
        return;
      }
      
      // Test connection
      if (window.electron) {
        const result = await window.electron.testMongoDBConnection(mongodbUri);
        
        if (result.success) {
          setSuccess('Connection successful! Your MongoDB Atlas database is configured correctly.');
        } else {
          setError(`Connection failed: ${result.message}`);
        }
      } else {
        setError('Electron bridge not available');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setError(`Connection test failed: ${error.message || 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };
  
  // Handle save configuration
  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!mongodbUri) {
        setError('MongoDB URI is required');
        setLoading(false);
        return;
      }
      
      // Save configuration
      if (window.electron) {
        const result = await window.electron.setMongoDBConfig({
          uri: mongodbUri,
          port: port ? parseInt(port, 10) : 5001
        });
        
        if (result.success) {
          onClose(true);
        } else {
          setError(`Failed to save configuration: ${result.error}`);
        }
      } else {
        setError('Electron bridge not available');
      }
    } catch (error) {
      console.error('Save configuration error:', error);
      setError(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle external link clicks
  const handleOpenLink = (url) => {
    if (window.electron) {
      window.electron.openExternalUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    // Don't allow closing on first run if no URI is set
    if (initialLoad && !mongodbUri) {
      setError('MongoDB URI is required to continue');
      return;
    }
    
    onClose();
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', py: 2 }}>
        MongoDB Atlas Configuration
      </DialogTitle>
      
      <DialogContent sx={{ py: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Connect to MongoDB Atlas
            </Typography>
            
            <Typography variant="body1" paragraph>
              This application uses MongoDB Atlas to store data in the cloud. Please enter your MongoDB Atlas connection URI below.
              If you don't have a MongoDB Atlas account, you can 
              <Link 
                component="button"
                onClick={() => handleOpenLink('https://www.mongodb.com/cloud/atlas/register')}
                sx={{ mx: 1 }}
              >
                create one for free
              </Link>
              and set up a cluster.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            
            <TextField
              label="MongoDB Atlas URI"
              value={mongodbUri}
              onChange={(e) => setMongodbUri(e.target.value)}
              fullWidth
              variant="outlined"
              margin="normal"
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
              helperText="Example: mongodb+srv://username:password@cluster.mongodb.net/database"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Backend Port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              type="number"
              fullWidth
              variant="outlined"
              margin="normal"
              helperText="Leave at 5001 unless you need to change it"
              InputLabelProps={{ shrink: true }}
            />
            
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Your connection details are stored locally on your computer and never shared.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleTestConnection} 
          color="info" 
          variant="outlined"
          disabled={loading || testing || !mongodbUri}
        >
          {testing ? <CircularProgress size={24} /> : 'Test Connection'}
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={loading || testing || !mongodbUri}
        >
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MongoDBConfigDialog; 