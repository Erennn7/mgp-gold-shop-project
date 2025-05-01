import React, { useState } from 'react';
import { 
  Button, 
  Stack, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText,
  TextField,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { PictureAsPdf, Email } from '@mui/icons-material';
import api from '../../utils/api';

/**
 * Component for invoice generation and email sending
 */
const InvoiceActions = ({ purchaseId, invoiceNumber }) => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Validate email format
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle opening PDF in a new tab
  const handleViewInvoice = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/api/purchases/${purchaseId}/invoice`);
      
      if (response.data.success) {
        // Open the PDF in a new tab
        const baseUrl = window.location.origin;
        window.open(`${baseUrl}${response.data.data.downloadUrl}`, '_blank');
      } else {
        setAlert({
          open: true,
          message: 'Failed to generate invoice',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      setAlert({
        open: true,
        message: 'Failed to generate invoice: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle email dialog open
  const handleEmailDialogOpen = () => {
    setEmailDialogOpen(true);
  };

  // Handle email dialog close
  const handleEmailDialogClose = () => {
    setEmailDialogOpen(false);
    setEmail('');
    setEmailError('');
  };

  // Handle sending email
  const handleSendEmail = async () => {
    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post(`/api/purchases/${purchaseId}/email-invoice`, { email });
      
      if (response.data.success) {
        handleEmailDialogClose();
        setAlert({
          open: true,
          message: 'Invoice sent successfully!',
          severity: 'success'
        });
      } else {
        setAlert({
          open: true,
          message: 'Failed to send invoice: ' + response.data.message,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      setAlert({
        open: true,
        message: 'Failed to send invoice: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle alert close
  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ my: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PictureAsPdf />}
          onClick={handleViewInvoice}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'View Invoice'}
        </Button>
        
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Email />}
          onClick={handleEmailDialogOpen}
          disabled={loading}
        >
          Email Invoice
        </Button>
      </Stack>
      
      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={handleEmailDialogClose}>
        <DialogTitle>Send Invoice via Email</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the email address where you'd like to send invoice #{invoiceNumber}:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            error={!!emailError}
            helperText={emailError}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEmailDialogClose} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleAlertClose} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InvoiceActions; 