import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import { toast } from 'react-toastify';

const initialItemState = {
  type: '',
  description: '',
  metalType: 'gold',
  purity: '',
  netWeight: '',
  grossWeight: '',
  quantity: 1,
  rate: '',
  total: 0
};

const GoldSupplyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { token } = useAuth();
  const { db, isLoading: dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    supplyDate: new Date().toISOString().split('T')[0],
    supplier: {
      name: '',
      phone: '',
      email: ''
    },
    items: [{ ...initialItemState, id: uuidv4() }],
    totalAmount: 0,
    amountPaid: 0,
    balanceDue: 0,
    notes: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchSupplyData();
    }
  }, [id]);

  const fetchSupplyData = async () => {
    setLoading(true);
    try {
      // DEVELOPMENT MOCK - Use local database in development mode without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Fetching gold supply from local database with ID:', id);
        
        if (db && !dbLoading) {
          try {
            const supply = await db.goldSupplies.where('_id').equals(id).first();
            
            if (supply) {
              console.log('Found supply:', supply);
              
              // Add unique IDs to items for form management
              const itemsWithIds = supply.items.map(item => ({
                ...item,
                id: uuidv4()
              }));
              
              setFormData({
                ...supply,
                items: itemsWithIds,
                supplyDate: new Date(supply.supplyDate || supply.createdAt).toISOString().split('T')[0]
              });
            } else {
              console.warn('Supply not found in local database');
              toast.error('Supply not found');
              navigate('/gold-supplies');
            }
          } catch (dbError) {
            console.error('Error fetching from local database:', dbError);
            toast.error('Error loading supply details');
          }
        }
      } else {
        // Use real API
        const response = await axios.get(`${apiUrl}/gold-supplies/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const supply = response.data.data;
          
          // Add unique IDs to items for form management
          const itemsWithIds = supply.items.map(item => ({
            ...item,
            id: uuidv4()
          }));
          
          setFormData({
            ...supply,
            items: itemsWithIds,
            supplyDate: new Date(supply.supplyDate || supply.createdAt).toISOString().split('T')[0]
          });
        } else {
          toast.error('Failed to load supply details');
          navigate('/gold-supplies');
        }
      }
    } catch (error) {
      console.error('Error fetching supply details:', error);
      toast.error('Failed to load supply details');
      navigate('/gold-supplies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('supplier.')) {
      const supplierField = name.split('.')[1];
      setFormData({
        ...formData,
        supplier: {
          ...formData.supplier,
          [supplierField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleItemChange = (id, field, value) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total if weight or rate changes
        if (field === 'netWeight' || field === 'rate' || field === 'quantity') {
          const weight = parseFloat(field === 'netWeight' ? value : updatedItem.netWeight) || 0;
          const rate = parseFloat(field === 'rate' ? value : updatedItem.rate) || 0;
          const quantity = parseInt(field === 'quantity' ? value : updatedItem.quantity) || 1;
          updatedItem.total = weight * rate * quantity;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    // Calculate total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount,
      balanceDue: totalAmount - (formData.amountPaid || 0)
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...initialItemState, id: uuidv4() }]
    });
  };

  const handleRemoveItem = (id) => {
    if (formData.items.length <= 1) {
      toast.warning('At least one item is required');
      return;
    }
    
    const updatedItems = formData.items.filter(item => item.id !== id);
    
    // Recalculate total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount,
      balanceDue: totalAmount - (formData.amountPaid || 0)
    });
  };

  const handlePaymentChange = (e) => {
    const amountPaid = parseFloat(e.target.value) || 0;
    const balanceDue = formData.totalAmount - amountPaid;
    
    setFormData({
      ...formData,
      amountPaid,
      balanceDue
    });
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.invoiceNumber) {
      toast.error('Invoice number is required');
      return false;
    }
    
    if (!formData.supplier.name) {
      toast.error('Supplier name is required');
      return false;
    }
    
    // Validate items
    for (const item of formData.items) {
      if (!item.purity) {
        toast.error('Purity is required for all items');
        return false;
      }
      
      if (!item.netWeight) {
        toast.error('Net weight is required for all items');
        return false;
      }
      
      if (!item.rate) {
        toast.error('Rate is required for all items');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepare data for submission
      const submissionData = {
        ...formData,
        // Remove the temporary IDs from items
        items: formData.items.map(({ id, ...item }) => item)
      };
      
      // DEVELOPMENT MOCK - Use local database in development mode without backend
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API) {
        console.log('DEVELOPMENT MODE: Saving gold supply to local database');
        
        if (db && !dbLoading) {
          try {
            if (isEditMode) {
              // Update existing supply
              await db.goldSupplies.update(id, {
                ...submissionData,
                updatedAt: new Date()
              });
              
              toast.success('Gold supply updated successfully');
            } else {
              // Create new supply
              const newId = uuidv4();
              await db.goldSupplies.add({
                ...submissionData,
                _id: newId,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              toast.success('Gold supply created successfully');
            }
            
            navigate('/gold-supplies');
          } catch (dbError) {
            console.error('Error saving to local database:', dbError);
            toast.error('Error saving gold supply');
          }
        }
      } else {
        // Use real API
        if (isEditMode) {
          // Update existing supply
          const response = await axios.put(
            `${apiUrl}/gold-supplies/${id}`,
            submissionData,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.data.success) {
            toast.success('Gold supply updated successfully');
            navigate('/gold-supplies');
          } else {
            toast.error(response.data.message || 'Failed to update gold supply');
          }
        } else {
          // Create new supply
          const response = await axios.post(
            `${apiUrl}/gold-supplies`,
            submissionData,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.data.success) {
            toast.success('Gold supply created successfully');
            navigate('/gold-supplies');
          } else {
            toast.error(response.data.message || 'Failed to create gold supply');
          }
        }
      }
    } catch (error) {
      console.error('Error saving gold supply:', error);
      toast.error('Failed to save gold supply');
    } finally {
      setSaving(false);
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

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack}>
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {isEditMode ? 'Edit Gold Supply' : 'New Gold Supply'}
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Supply Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Invoice Number"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Supply Date"
                name="supplyDate"
                type="date"
                value={formData.supplyDate}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Supplier Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Supplier Name"
                name="supplier.name"
                value={formData.supplier.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Phone Number"
                name="supplier.phone"
                value={formData.supplier.phone}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Email"
                name="supplier.email"
                type="email"
                value={formData.supplier.email}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Items
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              variant="outlined"
            >
              Add Item
            </Button>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Metal</TableCell>
                  <TableCell>Purity</TableCell>
                  <TableCell>Net Weight (g)</TableCell>
                  <TableCell>Gross Weight (g)</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Rate (₹/g)</TableCell>
                  <TableCell>Total (₹)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <TextField
                        value={item.type}
                        onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={item.metalType}
                        onChange={(e) => handleItemChange(item.id, 'metalType', e.target.value)}
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.purity}
                        onChange={(e) => handleItemChange(item.id, 'purity', e.target.value)}
                        size="small"
                        fullWidth
                        required
                        placeholder="22K"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.netWeight}
                        onChange={(e) => handleItemChange(item.id, 'netWeight', e.target.value)}
                        size="small"
                        fullWidth
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.grossWeight}
                        onChange={(e) => handleItemChange(item.id, 'grossWeight', e.target.value)}
                        size="small"
                        fullWidth
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, step: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        size="small"
                        fullWidth
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.total.toFixed(2)}
                        size="small"
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemoveItem(item.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payment Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Total Amount (₹)"
                type="number"
                value={formData.totalAmount.toFixed(2)}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Amount Paid (₹)"
                name="amountPaid"
                type="number"
                value={formData.amountPaid}
                onChange={handlePaymentChange}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Balance Due (₹)"
                type="number"
                value={formData.balanceDue.toFixed(2)}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </Paper>

        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button 
            variant="outlined" 
            onClick={handleGoBack} 
            sx={{ mr: 2 }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : (isEditMode ? 'Update Supply' : 'Create Supply')}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default GoldSupplyForm;