import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

/**
 * Dialog component for confirming database reset
 */
const ResetDatabaseDialog = ({ open, onClose }) => {
  const handleCancel = () => {
    onClose(false);
  };

  const handleReset = () => {
    onClose(true);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="error" />
        <Typography variant="h6" component="div">
          Reset Database
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action will delete all local data that has not been synchronized with the server.
        </Alert>
        
        <DialogContentText>
          Resetting the database will:
        </DialogContentText>
        
        <ul>
          <li>
            <DialogContentText>
              Delete all data in the local IndexedDB database
            </DialogContentText>
          </li>
          <li>
            <DialogContentText>
              Fetch fresh data from the MongoDB server (if online)
            </DialogContentText>
          </li>
          <li>
            <DialogContentText>
              Clear any pending synchronization operations
            </DialogContentText>
          </li>
        </ul>
        
        <DialogContentText sx={{ fontWeight: 'bold', mt: 2 }}>
          Are you sure you want to proceed? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleCancel} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleReset} 
          color="error" 
          variant="contained"
          startIcon={<WarningIcon />}
        >
          Reset Database
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResetDatabaseDialog; 