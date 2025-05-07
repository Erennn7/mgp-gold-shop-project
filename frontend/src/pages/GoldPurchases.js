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
  Edit as EditIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const GoldPurchases = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { db, isLoading: dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  const fetchGoldPurchases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // DEVELOPMENT MOCK - Use this for frontend development without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Using local database for gold purchases');
        
        // Try to fetch from IndexedDB first if available
        if (db && !dbLoading) {
          try {
            // Use a safer method to get all purchases
            console.log('Fetching gold purchases from IndexedDB');
            
            // Use a try-catch block for the database operation
            try {
              const localPurchases = await db.goldPurchases.toArray();
              
              // Process purchases to ensure they have all required fields
              const processedPurchases = localPurchases.map(purchase => {
                // Ensure the purchase has all required fields
                return {
                  ...purchase,
                  // Set default values for any missing fields
                  items: purchase.items || [],
                  totalWeight: purchase.totalWeight || 0,
                  totalAmount: purchase.totalAmount || 0,
                  paymentMethod: purchase.paymentMethod || 'cash',
                  paymentStatus: purchase.paymentStatus || 'completed'
                };
              });
              
              setPurchases(processedPurchases);
              setLoading(false);
              return;
            } catch (dbError) {
              console.error('Error fetching from IndexedDB:', dbError);
              // Continue to mock data if database fetch fails
            }
          } catch (error) {
            console.error('Error accessing database:', error);
            // Continue to mock data
          }
        }
        
        // If we get here, either there's no database or there was an error
        // Use mock data as fallback
        console.log('Using mock gold purchases data');
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

  useEffect(() => {
    fetchGoldPurchases();
  }, [token, apiUrl, db, dbLoading]);

  const handleAddNew = () => {
    navigate('/gold-purchases/new');
  };

  const handleView = (id) => {
    navigate(`/gold-purchases/${id}`);
  };
  
  const handleRefresh = () => {
    toast.info('Refreshing gold purchases...');
    fetchGoldPurchases();
  };

  const handleDebug = async () => {
    try {
      setDebugDialogOpen(true);
      
      // Collect debug information
      const info = {
        timestamp: new Date().toISOString(),
        databaseState: db ? 'Available' : 'Null',
        databaseIsOpen: db?.isOpen ? db.isOpen() : 'N/A',
        databaseVersion: db?.verno || 'Unknown',
        browserType: navigator.userAgent,
        purchases: purchases,
        windowIndexedDB: !!window.indexedDB,
        navigator: {
          onLine: navigator.onLine,
          platform: navigator.platform,
          language: navigator.language
        }
      };
      
      // Try to get more detailed database info
      if (db && db.isOpen()) {
        try {
          // Get the gold purchases table status
          const allTables = db.tables.map(table => table.name);
          info.allTables = allTables;
          
          // Check if we have the goldPurchases table
          const hasGoldPurchasesTable = allTables.includes('goldPurchases');
          info.hasGoldPurchasesTable = hasGoldPurchasesTable;
          
          if (hasGoldPurchasesTable) {
            // Get all gold purchases directly
            const allPurchases = await db.goldPurchases.toArray();
            info.allPurchasesCount = allPurchases.length;
            info.purchaseSample = allPurchases.length > 0 ? allPurchases[0] : null;
          }
        } catch (err) {
          info.databaseQueryError = err.toString();
        }
      }
      
      console.log('Debug Information:', info);
      setDebugInfo(info);
      toast.info('Debug information collected. Check console for details.');
    } catch (err) {
      console.error('Error collecting debug info:', err);
      toast.error('Failed to collect debug information');
    }
  };

  const closeDebugDialog = () => {
    setDebugDialogOpen(false);
  };

  const handleFixDatabase = async () => {
    try {
      toast.info('Attempting to fix database issues...');
      
      // First try to check database status
      if (!db) {
        toast.error('Database instance is not available');
        return;
      }
      
      // Force close and reopen the database
      try {
        if (db.isOpen()) {
          db.close();
          toast.info('Database closed successfully');
        }
      } catch (err) {
        console.error('Error closing database:', err);
      }
      
      // Force a page reload to reinitialize the database
      window.location.reload();
    } catch (err) {
      console.error('Error fixing database:', err);
      toast.error('Failed to fix database');
    }
  };

  const handleDeleteConfirm = (purchaseId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setPurchaseToDelete(purchaseId);
  };

  const handleCancelDelete = () => {
    setPurchaseToDelete(null);
  };

  const handleDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    
    try {
      setLoading(true);
      
      // Check if we're in development mode and using local database
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        // In development mode, handle deletion in IndexedDB
        console.log('Deleting gold purchase from local database:', purchaseToDelete);
        await db.goldPurchases.where('_id').equals(purchaseToDelete).delete();
        // Refresh the list
        fetchGoldPurchases();
        toast.success('Gold purchase deleted successfully');
      } else {
        // In production mode, delete via API
        const response = await axios.delete(`${apiUrl}/gold-purchases/${purchaseToDelete}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          // Refresh the list
          fetchGoldPurchases();
          toast.success('Gold purchase deleted successfully');
        }
      }
    } catch (error) {
      console.error('Error deleting gold purchase:', error);
      toast.error('Failed to delete gold purchase');
    } finally {
      setLoading(false);
      setPurchaseToDelete(null);
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
          onClick={() => fetchGoldPurchases()}
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
            Gold Purchases
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} sx={{ ml: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Debug Database">
            <IconButton onClick={handleDebug} sx={{ ml: 1 }}>
              <BugReportIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
                <TableCell>Reference Number</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Net Weight (g)</TableCell>
                <TableCell align="right">Gross Weight (g)</TableCell>
                <TableCell align="right">Amount</TableCell>
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
                  <TableRow 
                    key={purchase._id || purchase.id} 
                    hover
                    onClick={() => navigate(`/gold-purchases/${purchase._id || purchase.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      {purchase.referenceNumber}
                      {purchase.items.some(item => item.hasStones) && (
                        <Typography variant="caption" display="block" color="secondary">
                          Includes stones/beads
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.customer?.name || 'Unknown Customer'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(purchase.createdAt || Date.now()), 'PP')}
                    </TableCell>
                    <TableCell align="right">
                      {purchase.totalNetWeight?.toFixed(3) || purchase.totalWeight?.toFixed(3) || '0.000'} g
                    </TableCell>
                    <TableCell align="right">
                      {purchase.totalGrossWeight?.toFixed(3) || purchase.totalWeight?.toFixed(3) || '0.000'} g
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
                      <IconButton 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/gold-purchases/${purchase._id || purchase.id}`);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={(e) => {
                          handleDeleteConfirm(purchase._id || purchase.id, e);
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
        open={purchaseToDelete !== null}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Delete Gold Purchase</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this gold purchase? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleDeletePurchase} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Debug Dialog */}
      <Dialog
        open={debugDialogOpen}
        onClose={closeDebugDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Database Debug Information</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="subtitle1" gutterBottom>Database Status:</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '400px', backgroundColor: '#f5f5f5', padding: '10px' }}>
              {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'Loading debug information...'}
            </pre>
            
            <Typography variant="subtitle1" mt={2} mb={1}>
              Troubleshooting Steps:
            </Typography>
            <Typography variant="body2">
              1. If data disappears after refresh, there might be an issue with database persistence.
            </Typography>
            <Typography variant="body2">
              2. Clicking the "Fix Database Issues" button will reload the page and reinitialize the database.
            </Typography>
            <Typography variant="body2">
              3. If problems persist, try clearing your browser cache and local storage.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDebugDialog} color="primary">
            Close
          </Button>
          <Button onClick={handleFixDatabase} color="error">
            Fix Database Issues
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoldPurchases;