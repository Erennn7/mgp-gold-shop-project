import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const GoldSupplies = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { db, isLoading: dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supplyToDelete, setSupplyToDelete] = useState(null);

  const fetchGoldSupplies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // DEVELOPMENT MOCK - Use this for frontend development without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Using local database for gold supplies');
        
        // Try to fetch from IndexedDB first if available
        if (db && !dbLoading) {
          try {
            console.log('Fetching gold supplies from IndexedDB');
            
            try {
              const localSupplies = await db.goldSupplies.toArray();
              
              // Process supplies to ensure they have all required fields
              const processedSupplies = localSupplies.map(supply => {
                return {
                  ...supply,
                  items: supply.items || [],
                  totalAmount: supply.totalAmount || 0,
                  amountPaid: supply.amountPaid || 0,
                  balanceDue: supply.balanceDue || 0,
                  paymentStatus: supply.paymentStatus || 'pending'
                };
              });
              
              setSupplies(processedSupplies);
              setLoading(false);
              return;
            } catch (dbError) {
              console.error('Error fetching from IndexedDB:', dbError);
            }
          } catch (error) {
            console.error('Error accessing database:', error);
          }
        }
        
        // If we get here, either there's no database or there was an error
        // Use mock data as fallback
        console.log('Using mock gold supplies data');
        const mockSupplies = [
          {
            _id: 'mock-supply-1',
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
          }
        ];
        
        setSupplies(mockSupplies);
        setLoading(false);
        return;
      }
      
      // Real API call
      const response = await axios.get(`${apiUrl}/gold-supplies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSupplies(response.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching gold supplies:', err);
      setError('Failed to load gold supplies');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldSupplies();
  }, [token, apiUrl, db, dbLoading]);

  const handleAddNew = () => {
    navigate('/gold-supplies/new');
  };

  const handleView = (id) => {
    navigate(`/gold-supplies/${id}`);
  };
  
  const handleRefresh = () => {
    toast.info('Refreshing gold supplies...');
    fetchGoldSupplies();
  };

  const handleDeleteConfirm = (supplyId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setSupplyToDelete(supplyId);
  };

  const handleCancelDelete = () => {
    setSupplyToDelete(null);
  };

  const handleDeleteSupply = async () => {
    if (!supplyToDelete) return;
    
    try {
      setLoading(true);
      
      // Check if we're in development mode and using local database
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        // In development mode, handle deletion in IndexedDB
        console.log('Deleting gold supply from local database:', supplyToDelete);
        await db.goldSupplies.where('_id').equals(supplyToDelete).delete();
        // Refresh the list
        fetchGoldSupplies();
        toast.success('Gold supply deleted successfully');
      } else {
        // In production mode, delete via API
        const response = await axios.delete(`${apiUrl}/gold-supplies/${supplyToDelete}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          // Refresh the list
          fetchGoldSupplies();
          toast.success('Gold supply deleted successfully');
        }
      }
    } catch (error) {
      console.error('Error deleting gold supply:', error);
      toast.error('Failed to delete gold supply');
    } finally {
      setLoading(false);
      setSupplyToDelete(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => fetchGoldSupplies()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Typography variant="h5" component="h1" fontWeight="500">
            Gold Supplies
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} sx={{ ml: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          New Supply
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Invoice Number</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {supplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body1" py={3}>
                      No gold supplies found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                supplies.map((supply) => (
                  <TableRow 
                    key={supply._id || supply.id} 
                    hover
                    onClick={() => navigate(`/gold-supplies/${supply._id || supply.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{supply.invoiceNumber}</TableCell>
                    <TableCell>
                      {format(new Date(supply.supplyDate || supply.createdAt || Date.now()), 'PP')}
                    </TableCell>
                    <TableCell>{supply.supplier?.name || 'Unknown Supplier'}</TableCell>
                    <TableCell align="right">₹{supply.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">₹{supply.amountPaid?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">₹{supply.balanceDue?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={supply.paymentStatus}
                        color={
                          supply.paymentStatus === 'completed' ? 'success' :
                          supply.paymentStatus === 'partial' ? 'warning' :
                          'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/gold-supplies/${supply._id || supply.id}`);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={(e) => {
                          handleDeleteConfirm(supply._id || supply.id, e);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={supplyToDelete !== null}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Delete Gold Supply</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this gold supply? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleDeleteSupply} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoldSupplies;