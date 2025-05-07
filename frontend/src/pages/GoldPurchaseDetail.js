import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const GoldPurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { db, isLoading: dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    fetchPurchaseDetails();
  }, [id, db]);

  const fetchPurchaseDetails = async () => {
    try {
      // DEVELOPMENT MOCK - Use local database in development mode without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Fetching gold purchase from local database with ID:', id);
        
        if (db && !dbLoading) {
          try {
            // Try to get purchase using the safer method
            const purchase = await db.getById('goldPurchases', id);
            
            if (purchase) {
              console.log('Found purchase:', purchase);
              
              // If customer is just an ID, fetch the customer details
              if (purchase.customer && typeof purchase.customer === 'string') {
                try {
                  const customerData = await db.getById('customers', purchase.customer);
                  if (customerData) {
                    purchase.customer = customerData;
                  }
                } catch (customerError) {
                  console.error('Error fetching customer details:', customerError);
                }
              }
              
              setPurchase(purchase);
            } else {
              console.warn('Purchase not found in local database');
              toast.error('Purchase not found');
            }
          } catch (dbError) {
            console.error('Error fetching from local database:', dbError);
            toast.error('Error loading purchase details');
          }
        }
      }
      
      // Real API call
      const response = await axios.get(`${apiUrl}/gold-purchases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPurchase(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching gold purchase details:', error);
      toast.error('Failed to load gold purchase details');
      setLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    try {
      // DEVELOPMENT MOCK - Use this for frontend development without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Simulating receipt generation');
        
        // Create a simple mock PDF content
        const mockPdfContent = `
          RECEIPT FOR GOLD PURCHASE
          -------------------------------
          Reference Number: ${purchase.referenceNumber}
          Date: ${format(new Date(purchase.createdAt), 'dd MMM yyyy, h:mm a')}
          
          Customer: ${purchase.customer?.name || 'Unknown'}
          Phone: ${purchase.customer?.phone || 'N/A'}
          
          Items:
          ${purchase.items.map(item => 
            `- ${item.description}: ${item.weight.toFixed(2)}g, ${item.purity}%, ₹${item.totalAmount.toFixed(2)}`
          ).join('\n')}
          
          Total Weight: ${purchase.totalWeight.toFixed(2)}g
          Total Amount: ₹${purchase.totalAmount.toFixed(2)}
          
          Payment Method: ${purchase.paymentMethod}
          Status: ${purchase.paymentStatus}
          
          Thank you for your business!
        `;
        
        // Create a text file for download in development mode
        const blob = new Blob([mockPdfContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `gold-purchase-receipt-${purchase._id}.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success('Receipt generated successfully (Development Mode)');
        return;
      }
      
      // Real API call
      const response = await axios.get(`${apiUrl}/gold-purchases/${id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gold-purchase-receipt-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt generated successfully');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  const handleSendEmail = async () => {
    if (!purchase.customer || !purchase.customer.email) {
      toast.error('Customer does not have an email address');
      return;
    }

    setEmailSending(true);
    try {
      // DEVELOPMENT MOCK - Use this for frontend development without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Simulating email sending');
        
        // Simulate API delay
        setTimeout(() => {
          toast.success(`Receipt sent to ${purchase.customer.email} (Development Mode)`);
          
          // Update the purchase data to reflect that receipt was sent
          setPurchase({
            ...purchase,
            receiptSent: true,
            receiptSentTo: purchase.customer.email
          });
          
          setEmailSending(false);
        }, 1000);
        
        return;
      }
      
      // Real API call
      await axios.post(`${apiUrl}/gold-purchases/${id}/email-receipt`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Receipt sent to ${purchase.customer.email}`);
      // Update the purchase data to reflect that receipt was sent
      setPurchase({
        ...purchase,
        receiptSent: true,
        receiptSentTo: purchase.customer.email
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send receipt email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleEditPurchase = () => {
    navigate(`/gold-purchases/${id}/edit`);
  };

  const handleDeletePurchase = async () => {
    try {
      // DEVELOPMENT MOCK - Use this for frontend development without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Simulating delete API call for ID:', id);
        
        // Delete from local database if available
        if (db && !dbLoading) {
          try {
            console.log('Querying all purchases to find by _id');
            const allPurchases = await db.goldPurchases.toArray();
            console.log('Found total purchases:', allPurchases.length);
            
            // First get the purchase to delete by _id
            const purchaseToDelete = allPurchases.find(p => p._id === id);
              
            if (purchaseToDelete) {
              console.log('Found purchase to delete:', purchaseToDelete);
              // Delete the purchase by its primary key
              await db.goldPurchases.delete(purchaseToDelete.id);
              console.log('Deleted gold purchase from local database with primary key:', purchaseToDelete.id);
              
              // Verify deletion
              const remainingPurchases = await db.goldPurchases.toArray();
              console.log('Remaining purchases after deletion:', remainingPurchases.length);
            } else {
              console.error('Could not find purchase with _id:', id);
            }
          } catch (dbError) {
            console.error('Error deleting from local database:', dbError);
          }
        }
        
        // Simulate API delay
        setTimeout(() => {
          toast.success('Gold purchase deleted successfully (Development Mode)');
          navigate('/gold-purchases');
        }, 500);
        
        return;
      }
      
      // Real API call
      await axios.delete(`${apiUrl}/gold-purchases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Gold purchase deleted successfully');
      navigate('/gold-purchases');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Failed to delete gold purchase');
      setDeleteConfirmOpen(false);
    }
  };

  const openDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ p: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/gold-purchases')}
          sx={{ mb: 2 }}
        >
          Back to Gold Purchases
        </Button>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">Gold purchase not found</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button 
          variant="outlined" 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/gold-purchases')}
        >
          Back to Gold Purchases
        </Button>
        
        <Box>
          <Tooltip title="Generate Receipt">
            <IconButton 
              color="primary" 
              onClick={handleGenerateReceipt} 
              sx={{ ml: 1 }}
            >
              <ReceiptIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={purchase.customer?.email ? "Send Receipt by Email" : "Customer has no email"}>
            <span>
              <IconButton 
                color="primary" 
                onClick={handleSendEmail} 
                disabled={emailSending || !purchase.customer?.email}
                sx={{ ml: 1 }}
              >
                <EmailIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Edit Purchase">
            <IconButton 
              color="primary" 
              onClick={handleEditPurchase} 
              sx={{ ml: 1 }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Purchase">
            <IconButton 
              color="error" 
              onClick={openDeleteConfirm} 
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography variant="h5" component="h1" fontWeight="500" mb={3}>
        Gold Purchase Details
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Purchase Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Reference #:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="body1" fontWeight="500">{purchase.referenceNumber}</Typography>
              </Grid>
              
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Date:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="body1">
                  {format(new Date(purchase.createdAt), 'dd MMM yyyy, h:mm a')}
                </Typography>
              </Grid>
              
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Total Weight:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="body1">{purchase.totalWeight?.toFixed(2) || 0} g</Typography>
              </Grid>
              
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Total Amount:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="body1" fontWeight="500" color="primary.main">
                  ₹{purchase.totalAmount?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Payment Method:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {purchase.paymentMethod}
                </Typography>
              </Grid>
              
              <Grid item xs={5} sm={4}>
                <Typography variant="body2" color="textSecondary">Payment Status:</Typography>
              </Grid>
              <Grid item xs={7} sm={8}>
                <Chip 
                  size="small" 
                  label={purchase.paymentStatus} 
                  color={
                    purchase.paymentStatus === 'completed' ? 'success' : 
                    purchase.paymentStatus === 'partial' ? 'warning' : 
                    'error'
                  }
                />
              </Grid>
              
              {purchase.notes && (
                <>
                  <Grid item xs={5} sm={4}>
                    <Typography variant="body2" color="textSecondary">Notes:</Typography>
                  </Grid>
                  <Grid item xs={7} sm={8}>
                    <Typography variant="body1">{purchase.notes}</Typography>
                  </Grid>
                </>
              )}
              
              {purchase.receiptSent && (
                <>
                  <Grid item xs={5} sm={4}>
                    <Typography variant="body2" color="textSecondary">Receipt Sent To:</Typography>
                  </Grid>
                  <Grid item xs={7} sm={8}>
                    <Typography variant="body1">{purchase.receiptSentTo}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Customer Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {purchase.customer ? (
              <Grid container spacing={2}>
                <Grid item xs={5} sm={4}>
                  <Typography variant="body2" color="textSecondary">Name:</Typography>
                </Grid>
                <Grid item xs={7} sm={8}>
                  <Typography variant="body1" fontWeight="500">{purchase.customer.name}</Typography>
                </Grid>
                
                {purchase.customer.phone && (
                  <>
                    <Grid item xs={5} sm={4}>
                      <Typography variant="body2" color="textSecondary">Phone:</Typography>
                    </Grid>
                    <Grid item xs={7} sm={8}>
                      <Typography variant="body1">{purchase.customer.phone}</Typography>
                    </Grid>
                  </>
                )}
                
                {purchase.customer.email && (
                  <>
                    <Grid item xs={5} sm={4}>
                      <Typography variant="body2" color="textSecondary">Email:</Typography>
                    </Grid>
                    <Grid item xs={7} sm={8}>
                      <Typography variant="body1">{purchase.customer.email}</Typography>
                    </Grid>
                  </>
                )}
                
                {purchase.customer.address && (
                  <>
                    <Grid item xs={5} sm={4}>
                      <Typography variant="body2" color="textSecondary">Address:</Typography>
                    </Grid>
                    <Grid item xs={7} sm={8}>
                      <Typography variant="body1">{purchase.customer.address}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            ) : (
              <Typography variant="body1" color="textSecondary">Customer information not available</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Purchased Items</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {purchase.items && purchase.items.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Net Weight (g)</TableCell>
                      <TableCell align="right">Gross Weight (g)</TableCell>
                      <TableCell align="right">Purity</TableCell>
                      <TableCell align="right">Rate (per g)</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchase.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.description}
                          {item.hasStones && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Has stones/beads {item.stoneDetails && `(${item.stoneDetails})`}
                              {item.stonePrice > 0 && ` - ₹${parseFloat(item.stonePrice).toFixed(2)}`}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{(item.netWeight || item.weight || 0).toFixed(3)}</TableCell>
                        <TableCell align="right">{(item.grossWeight || item.weight || 0).toFixed(3)}</TableCell>
                        <TableCell align="right">{item.purity?.toFixed(1)}% ({item.karatPurity || '22K'})</TableCell>
                        <TableCell align="right">₹{(item.pricePerGram || item.rate || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">₹{(item.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell>{item.notes}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {purchase.totalWeight.toFixed(2)} g
                      </TableCell>
                      <TableCell colSpan={3} />
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                        ₹{purchase.totalAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1" color="textSecondary">No items in this purchase</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Gold Purchase</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this gold purchase record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePurchase} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoldPurchaseDetail;