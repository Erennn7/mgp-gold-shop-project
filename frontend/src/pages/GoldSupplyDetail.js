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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import { 
  ArrowBack,
  Print,
  Payment,
  Person,
  Phone,
  Email
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import { toast } from 'react-toastify';

const GoldSupplyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printComponentRef = useRef();
  const { token } = useAuth();
  const { db, isLoading: dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [supply, setSupply] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchSupplyDetails = async () => {
    try {
      setLoading(true);
      
      // DEVELOPMENT MOCK - Use local database in development mode without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Fetching gold supply from local database with ID:', id);
        
        if (db && !dbLoading) {
          try {
            const supply = await db.goldSupplies.where('_id').equals(id).first();
            
            if (supply) {
              console.log('Found supply:', supply);
              setSupply(supply);
            } else {
              console.warn('Supply not found in local database');
              toast.error('Supply not found');
            }
          } catch (dbError) {
            console.error('Error fetching from local database:', dbError);
            toast.error('Error loading supply details');
          }
        } else {
          // Mock data for development
          const mockSupply = {
            _id: id,
            invoiceNumber: '425452',
            supplyDate: new Date('2025-04-05'),
            supplier: {
              name: 'Sachin',
              phone: '1234567890',
              email: 'sachin@gmail.com'
            },
            items: [
              {
                type: 'Chain',
                description: '-',
                metalType: 'gold',
                purity: '22k',
                netWeight: 70,
                grossWeight: 50,
                quantity: 1,
                rate: 6666,
                total: 466620
              }
            ],
            totalAmount: 466620,
            amountPaid: 0,
            balanceDue: 466620,
            paymentStatus: 'pending',
            createdAt: new Date()
          };
          
          setSupply(mockSupply);
        }
      } else {
        // Use real API
        const response = await axios.get(`${apiUrl}/gold-supplies/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setSupply(response.data.data);
        } else {
          setError('Failed to load supply details');
        }
      }
    } catch (error) {
      console.error('Error fetching supply details:', error);
      setError('Failed to load supply details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplyDetails();
  }, [id, token, apiUrl, db, dbLoading]);

  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: `Gold Supply Invoice ${supply?.invoiceNumber || ''}`,
    onAfterPrint: () => toast.success('Print job sent successfully')
  });

  const handleMakePayment = () => {
    setPaymentAmount(supply?.balanceDue?.toString() || '');
    setPaymentNotes('');
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      const amount = parseFloat(paymentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }
      
      if (amount > supply.balanceDue) {
        toast.error('Payment amount cannot exceed balance due');
        return;
      }
      
      // DEVELOPMENT MOCK - Use local database in development mode without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Processing payment in local database');
        
        if (db && !dbLoading) {
          try {
            // Get the current supply
            const currentSupply = await db.goldSupplies.where('_id').equals(id).first();
            
            if (!currentSupply) {
              toast.error('Supply not found');
              return;
            }
            
            // Update the supply with new payment info
            const newAmountPaid = (currentSupply.amountPaid || 0) + amount;
            const newBalanceDue = currentSupply.totalAmount - newAmountPaid;
            let newPaymentStatus = 'pending';
            
            if (newAmountPaid === 0) {
              newPaymentStatus = 'pending';
            } else if (newAmountPaid < currentSupply.totalAmount) {
              newPaymentStatus = 'partial';
            } else {
              newPaymentStatus = 'completed';
            }
            
            // Add payment notes if provided
            const updatedNotes = paymentNotes 
              ? `${currentSupply.notes || ''}\n${new Date().toISOString().split('T')[0]} - Payment: ${paymentNotes}`
              : currentSupply.notes;
            
            // Update in database
            await db.goldSupplies.update(id, {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              paymentStatus: newPaymentStatus,
              notes: updatedNotes
            });
            
            // Refresh the supply details
            fetchSupplyDetails();
            toast.success('Payment processed successfully');
          } catch (dbError) {
            console.error('Error processing payment in local database:', dbError);
            toast.error('Error processing payment');
          }
        }
      } else {
        // Use real API
        const response = await axios.post(
          `${apiUrl}/gold-supplies/${id}/payment`,
          {
            amount,
            paymentMethod: 'cash',
            paymentDate: new Date(),
            notes: paymentNotes
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.success) {
          setSupply(response.data.data);
          toast.success('Payment processed successfully');
        } else {
          toast.error(response.data.message || 'Failed to process payment');
        }
      }
      
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  const handleGoBack = () => {
    navigate('/gold-supplies');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !supply) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack} sx={{ mb: 2 }}>
          Back to Gold Supplies
        </Button>
        <Typography color="error" variant="h6">
          {error || 'Supply not found'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack}>
          Back
        </Button>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<Print />} 
            onClick={handlePrint}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          {supply.paymentStatus !== 'completed' && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Payment />}
              onClick={handleMakePayment}
            >
              Make Payment
            </Button>
          )}
        </Box>
      </Box>

      <div ref={printComponentRef} style={{ padding: '20px' }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h5" gutterBottom>
                Gold Supply Invoice
              </Typography>
              <Typography variant="body1">
                Invoice #: {supply.invoiceNumber}
              </Typography>
              <Typography variant="body1">
                Date: {format(new Date(supply.supplyDate || supply.createdAt), 'PP')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
              <Typography variant="h6" gutterBottom>
                Payment Status
              </Typography>
              <Chip
                label={supply.paymentStatus}
                color={
                  supply.paymentStatus === 'completed' ? 'success' :
                  supply.paymentStatus === 'partial' ? 'warning' :
                  'error'
                }
                sx={{ fontWeight: 'bold' }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Supplier Information
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <Person sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    {supply.supplier?.name || 'Unknown Supplier'}
                  </Typography>
                </Box>
                {supply.supplier?.phone && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <Phone sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {supply.supplier.phone}
                    </Typography>
                  </Box>
                )}
                {supply.supplier?.email && (
                  <Box display="flex" alignItems="center">
                    <Email sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {supply.supplier.email}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h6">
                      ₹{supply.totalAmount?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Amount Paid
                    </Typography>
                    <Typography variant="h6">
                      ₹{supply.amountPaid?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Balance Due
                    </Typography>
                    <Typography variant="h6" color={supply.balanceDue > 0 ? 'error' : 'textPrimary'}>
                      ₹{supply.balanceDue?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ mt: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Metal</TableCell>
                  <TableCell>Purity</TableCell>
                  <TableCell align="right">Net Weight (g)</TableCell>
                  <TableCell align="right">Gross Weight (g)</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Rate (₹/g)</TableCell>
                  <TableCell align="right">Total (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supply.items && supply.items.length > 0 ? (
                  supply.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.type || '-'}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>{item.metalType || 'gold'}</TableCell>
                      <TableCell>{item.purity || '-'}</TableCell>
                      <TableCell align="right">{typeof item.netWeight === 'number' ? item.netWeight.toFixed(3) : '0.000'}</TableCell>
                      <TableCell align="right">{typeof item.grossWeight === 'number' ? item.grossWeight.toFixed(2) : '0.00'}</TableCell>
                      <TableCell align="right">{item.quantity || 1}</TableCell>
                      <TableCell align="right">{typeof item.rate === 'number' ? item.rate.toFixed(2) : '0.00'}</TableCell>
                      <TableCell align="right">{typeof item.total === 'number' ? item.total.toFixed(2) : '0.00'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={7} />
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      Total:
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      ₹{supply.totalAmount?.toFixed(2) || '0.00'}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {supply.notes && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
              {supply.notes}
            </Typography>
          </Paper>
        )}
      </div>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Payment Amount (₹)"
            type="number"
            fullWidth
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            inputProps={{ min: 0, max: supply?.balanceDue || 0, step: 0.01 }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Notes (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained" color="primary">
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoldSupplyDetail;