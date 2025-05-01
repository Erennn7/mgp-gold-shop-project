import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  ArrowBack,
  Receipt,
  Print,
  Edit,
  Person,
  Phone,
  Email,
  LocationOn,
  ShoppingBasket,
  Payment,
  CalendarToday
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';
import InvoiceActions from '../components/Purchases/InvoiceActions';

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printComponentRef = useRef();
  
  // State
  const [purchase, setPurchase] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    paymentStatus: '',
    paymentMethod: '',
    notes: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Get database context
  const { db } = useDatabase();

  // Effect to fetch purchase on mount
  useEffect(() => {
    fetchPurchaseDetail();
  }, [id]);

  // Function to fetch purchase detail from API or IndexedDB
  const fetchPurchaseDetail = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        const response = await api.get(`/api/purchases/${id}`);
        if (response.data.success) {
          setPurchase(response.data.data);
          setCustomer(response.data.data.customer);
          setEditData({
            paymentStatus: response.data.data.paymentStatus,
            paymentMethod: response.data.data.paymentMethod,
            notes: response.data.data.notes || ''
          });
        }
      } else {
        // If offline, fetch from IndexedDB
        if (db) {
          const cachedPurchase = await db.purchases
            .where('_id')
            .equals(id)
            .or('id')
            .equals(id)
            .first();
          
          if (cachedPurchase) {
            setPurchase(cachedPurchase);
            setCustomer(cachedPurchase.customer);
            setEditData({
              paymentStatus: cachedPurchase.paymentStatus,
              paymentMethod: cachedPurchase.paymentMethod,
              notes: cachedPurchase.notes || ''
            });
          } else {
            throw new Error('Purchase not found in cache');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.message || 'Failed to load purchase details'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle email dialog open
  const handleOpenEmailDialog = () => {
    setEmailAddress(customer?.email || '');
    setShowEmailDialog(true);
  };

  // Handle email dialog close
  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailAddress('');
  };

  // Send receipt by email
  const handleSendEmail = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot send email while offline',
          severity: 'error'
        });
        handleCloseEmailDialog();
        return;
      }

      const response = await api.post(`/api/purchases/${id}/send-receipt`, {
        email: emailAddress
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Receipt sent successfully',
          severity: 'success'
        });
        
        // Update purchase with receiptSent status
        setPurchase(prevPurchase => ({
          ...prevPurchase,
          receiptSent: true,
          receiptSentTo: emailAddress
        }));
      }
      
      handleCloseEmailDialog();
    } catch (error) {
      console.error('Error sending receipt:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to send receipt'}`,
        severity: 'error'
      });
      
      handleCloseEmailDialog();
    }
  };

  // Handle print receipt
  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: `Receipt-${purchase?.invoiceNumber}`,
    onAfterPrint: () => {
      setSnackbar({
        open: true,
        message: 'Receipt printed successfully',
        severity: 'success'
      });
    }
  });

  // Download receipt as PDF
  const handleDownloadReceipt = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot generate receipt while offline',
          severity: 'error'
        });
        return;
      }

      const response = await api.get(`/api/purchases/${id}/receipt`, {
        responseType: 'blob'
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${purchase.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSnackbar({
        open: true,
        message: 'Receipt downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to generate receipt',
        severity: 'error'
      });
    }
  };

  // Toggle edit mode
  const handleToggleEditMode = () => {
    if (editMode) {
      // Cancel edit
      setEditData({
        paymentStatus: purchase.paymentStatus,
        paymentMethod: purchase.paymentMethod,
        notes: purchase.notes || ''
      });
    }
    setEditMode(!editMode);
  };

  // Handle edit data change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value
    });
  };

  // Save edited purchase
  const handleSaveEdit = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot update purchase while offline',
          severity: 'error'
        });
        return;
      }

      const response = await api.put(`/api/purchases/${id}`, editData);
      
      if (response.data.success) {
        setPurchase(prevPurchase => ({
          ...prevPurchase,
          ...editData
        }));
        
        setSnackbar({
          open: true,
          message: 'Purchase updated successfully',
          severity: 'success'
        });
        
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to update purchase'}`,
        severity: 'error'
      });
    }
  };

  // Navigate back
  const handleBack = () => {
    navigate(-1);
  };

  // Navigate to customer details
  const handleViewCustomer = () => {
    navigate(`/customers?id=${customer._id}`);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Calculate total for an item
  const calculateItemTotal = (item) => {
    return item.weight * item.pricePerGram + item.makingCharges;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Purchase not found</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Purchases
        </Button>
        
        <Box>
          {isOffline && (
            <Alert severity="warning" sx={{ mb: 2, display: 'inline-flex', mr: 2 }}>
              You are offline. Some features may be limited.
            </Alert>
          )}
          {!editMode && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleToggleEditMode}
              sx={{ ml: 1 }}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Purchase Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4">
              Invoice #{purchase.invoiceNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CalendarToday fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body1">
                Date: {format(new Date(purchase.createdAt), 'dd MMMM yyyy')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Payment fontSize="small" sx={{ mr: 1 }} />
              {editMode ? (
                <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    name="paymentStatus"
                    value={editData.paymentStatus}
                    onChange={handleEditChange}
                    label="Payment Status"
                  >
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Chip 
                  label={purchase.paymentStatus.charAt(0).toUpperCase() + purchase.paymentStatus.slice(1)} 
                  color={
                    purchase.paymentStatus === 'completed' ? 'success' :
                    purchase.paymentStatus === 'pending' ? 'error' : 'warning'
                  }
                  size="small"
                />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box>
              {editMode ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={handleToggleEditMode}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveEdit}
                  >
                    Save Changes
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                  >
                    Print
                  </Button>
                  
                  <InvoiceActions 
                    purchaseId={purchase._id || purchase.id} 
                    invoiceNumber={purchase.invoiceNumber}
                  />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Customer Information */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardHeader 
              title="Customer Information" 
              action={
                <IconButton onClick={handleViewCustomer}>
                  <Person />
                </IconButton>
              }
            />
            <Divider />
            <CardContent>
              <Typography variant="h6">{customer?.name}</Typography>
              
              {customer?.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Phone fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body1">{customer.phone}</Typography>
                </Box>
              )}
              
              {customer?.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Email fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body1">{customer.email}</Typography>
                </Box>
              )}
              
              {customer?.address && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                  <LocationOn fontSize="small" sx={{ mr: 1, mt: 0.5 }} />
                  <Typography variant="body1">
                    {customer.address}
                    {customer.city && <>, {customer.city}</>}
                    {customer.pincode && <> - {customer.pincode}</>}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Payment Information */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardHeader title="Payment Information" />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ minWidth: 140 }}>Payment Method:</Typography>
                {editMode ? (
                  <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={editData.paymentMethod}
                      onChange={handleEditChange}
                      label="Payment Method"
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="bank transfer">Bank Transfer</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {purchase.paymentMethod}
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ minWidth: 140 }}>Payment Status:</Typography>
                <Chip 
                  label={purchase.paymentStatus.charAt(0).toUpperCase() + purchase.paymentStatus.slice(1)} 
                  color={
                    purchase.paymentStatus === 'completed' ? 'success' :
                    purchase.paymentStatus === 'pending' ? 'error' : 'warning'
                  }
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography variant="body1" sx={{ minWidth: 140 }}>Notes:</Typography>
                {editMode ? (
                  <TextField
                    name="notes"
                    value={editData.notes}
                    onChange={handleEditChange}
                    variant="outlined"
                    size="small"
                    multiline
                    rows={3}
                    fullWidth
                  />
                ) : (
                  <Typography variant="body1">
                    {purchase.notes || '-'}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Summary */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardHeader title="Purchase Summary" />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">{formatCurrency(purchase.subtotal)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Discount:</Typography>
                <Typography variant="body1">{formatCurrency(purchase.discount)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">GST:</Typography>
                <Typography variant="body1">{formatCurrency(purchase.gst)}</Typography>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary.main">{formatCurrency(purchase.totalAmount)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Purchase Items */}
      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            <ShoppingBasket sx={{ mr: 1, verticalAlign: 'middle' }} />
            Purchase Items
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>HOID</TableCell>
                <TableCell>Metal Type</TableCell>
                <TableCell>Purity</TableCell>
                <TableCell align="right">Weight (g)</TableCell>
                <TableCell align="right">Price/g</TableCell>
                <TableCell align="right">Making Charges</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchase.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.hoid}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.metalType.charAt(0).toUpperCase() + item.metalType.slice(1)} 
                      color={item.metalType === 'gold' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.purity}</TableCell>
                  <TableCell align="right">{item.weight.toFixed(3)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.pricePerGram)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.makingCharges)}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Printable Receipt (hidden) */}
      <Box sx={{ display: 'none' }}>
        <Box ref={printComponentRef} sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ textAlign: 'center', mb: 1 }}>
            MG Potdar Jewellers
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', mb: 3 }}>
            123 Jewelry Lane, City, State, PIN<br />
            Phone: 123-456-7890 | Email: info@mgpotdarjewellers.com
          </Typography>
          
          <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
            PURCHASE RECEIPT
          </Typography>
          
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 3 }}>
            Invoice #: {purchase.invoiceNumber}<br />
            Date: {format(new Date(purchase.createdAt), 'dd/MM/yyyy')}
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 1 }}>Customer Information</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Name: {customer?.name}<br />
            Phone: {customer?.phone}<br />
            {customer?.email && <>Email: {customer.email}<br /></>}
            {customer?.address && (
              <>Address: {customer.address}, {customer.city || ''} {customer.pincode || ''}<br /></>
            )}
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 1 }}>Purchase Items</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>HOID</TableCell>
                <TableCell>Metal</TableCell>
                <TableCell align="right">Weight (g)</TableCell>
                <TableCell align="right">Price/g</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchase.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.hoid}</TableCell>
                  <TableCell>{item.metalType} ({item.purity})</TableCell>
                  <TableCell align="right">{item.weight.toFixed(3)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.pricePerGram)}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 3, mb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250, mb: 1 }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">{formatCurrency(purchase.subtotal)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250, mb: 1 }}>
              <Typography variant="body1">Discount:</Typography>
              <Typography variant="body1">{formatCurrency(purchase.discount)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250, mb: 1 }}>
              <Typography variant="body1">GST:</Typography>
              <Typography variant="body1">{formatCurrency(purchase.gst)}</Typography>
            </Box>
            
            <Box sx={{ width: 250, borderTop: '1px solid black', my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">{formatCurrency(purchase.totalAmount)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250, mt: 1 }}>
              <Typography variant="body1">Payment Method:</Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {purchase.paymentMethod}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250, mt: 1 }}>
              <Typography variant="body1">Payment Status:</Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {purchase.paymentStatus}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ borderTop: '1px dashed black', pt: 2, mt: 4 }}>
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              Thank you for shopping with MG Potdar Jewellers!<br />
              This receipt is generated electronically and does not require a signature.
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onClose={handleCloseEmailDialog}>
        <DialogTitle>Send Receipt by Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button 
            onClick={handleSendEmail} 
            color="primary" 
            variant="contained"
            disabled={!emailAddress || !emailAddress.includes('@')}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseDetail; 