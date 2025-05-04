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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const GoldPurchases = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGoldPurchases = async () => {
      try {
        // DEVELOPMENT MOCK - Use this for frontend development without backend
        if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
          console.log('DEVELOPMENT MODE: Using mock gold purchases data');
          
          // Mock data for development
          const mockPurchases = [
            {
              _id: 'mock-id-1',
              referenceNumber: 'GPR-202505-1001',
              customer: { _id: 'cust-1', name: 'John Doe', phone: '9876543210' },
              items: [
                { metalType: 'gold', description: 'Gold Chain', weight: 15.5, purity: 91.6, karatPurity: '22K', pricePerGram: 5500, totalAmount: 78177.50 }
              ],
              totalWeight: 15.5,
              totalAmount: 78177.50,
              paymentMethod: 'cash',
              paymentStatus: 'completed',
              createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
            },
            {
              _id: 'mock-id-2',
              referenceNumber: 'GPR-202505-1002',
              customer: { _id: 'cust-2', name: 'Jane Smith', phone: '8765432109' },
              items: [
                { metalType: 'gold', description: 'Gold Ring', weight: 4.8, purity: 75.0, karatPurity: '18K', pricePerGram: 5200, totalAmount: 18720.00 }
              ],
              totalWeight: 4.8,
              totalAmount: 18720.00,
              paymentMethod: 'bank transfer',
              paymentStatus: 'completed',
              createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
            },
            {
              _id: 'mock-id-3',
              referenceNumber: 'GPR-202505-1003',
              customer: { _id: 'cust-3', name: 'Sarah Johnson', phone: '7654321098' },
              items: [
                { metalType: 'silver', description: 'Silver Bracelet', weight: 22.3, purity: 92.5, karatPurity: 'N/A', pricePerGram: 75, totalAmount: 1546.96 }
              ],
              totalWeight: 22.3,
              totalAmount: 1546.96,
              paymentMethod: 'cash',
              paymentStatus: 'pending',
              createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
            }
          ];
          
          setPurchases(mockPurchases);
          setLoading(false);
          return;
        }
        
        // Real API call
        const response = await axios.get(`${apiUrl}/gold-purchases`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchases(response.data.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching gold purchases:', err);
        setError('Failed to load gold purchases');
        setLoading(false);
      }
    };

    fetchGoldPurchases();
  }, [token, apiUrl]);

  const handleAddNew = () => {
    navigate('/gold-purchases/new');
  };

  const handleView = (id) => {
    navigate(`/gold-purchases/${id}`);
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
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1" fontWeight="500">
          Gold Purchases
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          New Purchase
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Reference #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Weight (g)</TableCell>
                <TableCell align="right">Amount (₹)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" py={3}>
                      No gold purchases found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase._id} hover>
                    <TableCell>
                      {format(new Date(purchase.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{purchase.referenceNumber}</TableCell>
                    <TableCell>
                      {purchase.customer ? purchase.customer.name : 'Unknown Customer'}
                    </TableCell>
                    <TableCell align="right">
                      {purchase.totalWeight?.toFixed(2) || 0} g
                    </TableCell>
                    <TableCell align="right">
                      ₹{purchase.totalAmount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={purchase.paymentStatus}
                        color={
                          purchase.paymentStatus === 'completed' ? 'success' :
                          purchase.paymentStatus === 'partial' ? 'warning' :
                          'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleView(purchase._id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default GoldPurchases; 