import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Refresh, 
  Search, 
  FilterList,
  Visibility,
  Image as ImageIcon
} from '@mui/icons-material';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const Products = () => {
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isOffline, setIsOffline] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    product: null
  });

  // Form handling
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      hoid: '',
      metalType: 'gold',
      purity: '',
      netWeight: '',
      grossWeight: '',
      hasStones: false,
      stoneDetails: '',
      stonePrice: 0,
      makingChargesPercentage: 3,
      description: '',
      category: '',
      image: '',
      currentStock: 1
    }
  });

  // Watch for metal type changes in the form
  const watchMetalType = watch('metalType');
  const watchHasStones = watch('hasStones');

  // Get database context
  const { db, resetDatabase } = useDatabase();

  // Effect to fetch products on mount and tab change
  useEffect(() => {
    fetchProducts();
  }, [tabValue]);

  // Function to fetch products from API or IndexedDB
  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        try {
          const metalType = tabValue === 0 ? 'gold' : 'silver';
          const response = await api.get(`/api/products?metalType=${metalType}`);
          if (response.data.success) {
            setProducts(response.data.data);
          }
        } catch (apiError) {
          console.error('API error fetching products:', apiError);
          // Try IndexedDB as fallback
          await fetchFromIndexedDB();
        }
      } else {
        // If offline, fetch from IndexedDB
        await fetchFromIndexedDB();
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      handleDatabaseError(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch from IndexedDB
  const fetchFromIndexedDB = async () => {
    if (!db) return;
    
    try {
      const metalType = tabValue === 0 ? 'gold' : 'silver';
      const cachedProducts = await db.products
        .where('metalType')
        .equals(metalType)
        .toArray();
      setProducts(cachedProducts);
    } catch (dbError) {
      console.error('IndexedDB error:', dbError);
      handleDatabaseError(dbError);
    }
  };

  // Helper function to handle database errors
  const handleDatabaseError = (error) => {
    if (error && (error.name === 'DatabaseClosedError' || 
                  error.message.includes('Database has been closed') ||
                  error.message.includes('Internal error opening backing store'))) {
      if (resetDatabase) {
        console.warn('Database is closed or corrupted, attempting to reset...');
        resetDatabase().then(() => {
          setSnackbar({
            open: true,
            message: 'Database has been reset due to corruption. Refreshing data...',
            severity: 'warning'
          });
          // Wait a moment before trying to fetch again
          setTimeout(() => {
            fetchProducts();
          }, 1000);
        }).catch(resetError => {
          console.error('Failed to reset database:', resetError);
          setSnackbar({
            open: true,
            message: 'Failed to reset corrupted database. Please refresh the page.',
            severity: 'error'
          });
        });
      }
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Toggle view mode between table and grid
  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'grid' : 'table');
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product => {
    const searchFields = `${product.name || ''} ${product.hoid || ''} ${product.category || ''}`.toLowerCase();
    return searchFields.includes(searchTerm.toLowerCase());
  });

  // Transform product data to ensure all required fields exist and have proper types
  const normalizedProducts = filteredProducts.map(product => ({
    ...product,
    _id: product._id || product.id || `temp-${Date.now()}-${Math.random()}`,
    id: product.id || product._id || `temp-${Date.now()}-${Math.random()}`,
    name: product.name || 'Unnamed Product',
    hoid: product.hoid || 'No ID',
    metalType: product.metalType || 'gold',
    purity: product.purity || '-',
    netWeight: typeof product.netWeight === 'number' ? product.netWeight : Number(product.netWeight || 0),
    grossWeight: typeof product.grossWeight === 'number' ? product.grossWeight : Number(product.grossWeight || 0),
    hasStones: product.hasStones || false,
    stoneDetails: product.stoneDetails || '',
    category: product.category || '-',
    currentStock: product.currentStock || 0,
    image: product.image || ''
  }));

  // Open dialog for adding or editing product
  const handleOpenDialog = (product = null) => {
    if (product) {
      // Editing existing product
      setSelectedProduct(product);
      
      // Set form values
      setValue('name', product.name);
      setValue('hoid', product.hoid);
      setValue('metalType', product.metalType);
      setValue('purity', product.purity);
      
      // Handle weight fields (support old and new schema)
      if (product.netWeight !== undefined) {
        setValue('netWeight', product.netWeight);
        setValue('grossWeight', product.grossWeight || product.netWeight);
        setValue('hasStones', product.hasStones || false);
        setValue('stoneDetails', product.stoneDetails || '');
      } else if (product.weight !== undefined) {
        setValue('netWeight', product.weight);
        setValue('grossWeight', product.weight);
        setValue('hasStones', false);
        setValue('stoneDetails', '');
      } else {
        setValue('netWeight', '');
        setValue('grossWeight', '');
        setValue('hasStones', false);
        setValue('stoneDetails', '');
      }
      
      setValue('description', product.description || '');
      setValue('category', product.category || '');
      setValue('image', product.image || '');
      setValue('currentStock', product.currentStock);
    } else {
      // Adding new product
      setSelectedProduct(null);
      
      // Reset form to defaults, but keep the current tab's metal type
      reset({
        name: '',
        hoid: '',
        metalType: tabValue === 0 ? 'gold' : 'silver',
        purity: '',
        netWeight: '',
        grossWeight: '',
        hasStones: false,
        stoneDetails: '',
        description: '',
        category: '',
        image: '',
        currentStock: 1
      });
    }
    
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
  };

  // Open confirm delete dialog
  const handleConfirmDelete = (product) => {
    setConfirmDelete({
      open: true,
      product
    });
  };

  // Close confirm delete dialog
  const handleCloseConfirmDelete = () => {
    setConfirmDelete({
      open: false,
      product: null
    });
  };

  // Delete product
  const handleDeleteProduct = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot delete product while offline',
          severity: 'error'
        });
        handleCloseConfirmDelete();
        return;
      }

      const response = await api.delete(`/api/products/${confirmDelete.product._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Product deleted successfully',
          severity: 'success'
        });
        
        // Update local state
        setProducts(prevProducts => 
          prevProducts.filter(product => product._id !== confirmDelete.product._id)
        );
      }
      
      handleCloseConfirmDelete();
    } catch (error) {
      console.error('Error deleting product:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to delete product'}`,
        severity: 'error'
      });
      
      handleCloseConfirmDelete();
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (selectedProduct) {
        // Update existing product
        if (online) {
          // If online, update via API
          const response = await api.put(`/api/products/${selectedProduct._id}`, data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Product updated successfully',
              severity: 'success'
            });
            
            // Update local state
            setProducts(prevProducts => 
              prevProducts.map(product => 
                product._id === selectedProduct._id ? response.data.data : product
              )
            );
            
            // Update in IndexedDB
            if (db) {
              try {
                await db.products.put({
                  ...response.data.data,
                  id: selectedProduct.id // Keep the local ID
                });
              } catch (error) {
                console.error('Error updating product in IndexedDB:', error);
                
                // Handle database corruption
                if (error.name === 'DatabaseClosedError' || 
                    error.message.includes('Internal error opening backing store')) {
                  if (resetDatabase) {
                    await resetDatabase();
                    setSnackbar({
                      open: true,
                      message: 'Database has been reset due to corruption. Please refresh the page.',
                      severity: 'warning'
                    });
                  }
                }
              }
            }
          }
        } else {
          // If offline, update locally in IndexedDB
          if (db) {
            try {
              const updatedProduct = {
                ...selectedProduct,
                ...data,
                updatedAt: new Date()
              };
              
              await db.products.put(updatedProduct);
              
              // Update local state
              setProducts(prevProducts => 
                prevProducts.map(product => 
                  product._id === selectedProduct._id ? updatedProduct : product
                )
              );
              
              setSnackbar({
                open: true,
                message: 'Product updated locally. Will sync when online.',
                severity: 'success'
              });
            } catch (error) {
              console.error('Error updating product in IndexedDB:', error);
              
              // Handle database corruption
              if (error.name === 'DatabaseClosedError' || 
                  error.message.includes('Internal error opening backing store')) {
                if (resetDatabase) {
                  await resetDatabase();
                  setSnackbar({
                    open: true,
                    message: 'Database has been reset due to corruption. Please refresh the page.',
                    severity: 'warning'
                  });
                }
              } else {
                setSnackbar({
                  open: true,
                  message: 'Failed to update product locally',
                  severity: 'error'
                });
              }
            }
          }
        }
      } else {
        // Create new product
        if (online) {
          // If online, create via API
          const response = await api.post('/api/products', data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Product added successfully',
              severity: 'success'
            });
            
            const newProduct = response.data.data;
            
            // Update local state if the new product matches the current tab
            if (
              (tabValue === 0 && data.metalType === 'gold') || 
              (tabValue === 1 && data.metalType === 'silver')
            ) {
              setProducts(prevProducts => [...prevProducts, newProduct]);
            }
            
            // Add to IndexedDB
            if (db) {
              try {
                await db.products.add(newProduct);
              } catch (error) {
                console.error('Error adding product to IndexedDB:', error);
                
                // Handle database corruption
                if (error.name === 'DatabaseClosedError' || 
                    error.message.includes('Internal error opening backing store')) {
                  if (resetDatabase) {
                    await resetDatabase();
                    setSnackbar({
                      open: true,
                      message: 'Database has been reset due to corruption. Please refresh the page.',
                      severity: 'warning'
                    });
                  }
                }
              }
            }
          }
        } else {
          // If offline, create locally in IndexedDB
          if (db) {
            try {
              const tempId = 'local_' + Date.now();
              const newProduct = {
                _id: tempId,
                ...data,
                createdAt: new Date()
              };
              
              // Add to IndexedDB
              const id = await db.products.add(newProduct);
              
              // Get the product with the generated id
              const savedProduct = await db.products.get(id);
              
              // Update local state if the new product matches the current tab
              if (
                (tabValue === 0 && data.metalType === 'gold') || 
                (tabValue === 1 && data.metalType === 'silver')
              ) {
                setProducts(prevProducts => [...prevProducts, savedProduct]);
              }
              
              setSnackbar({
                open: true,
                message: 'Product added locally. Will sync when online.',
                severity: 'success'
              });
            } catch (error) {
              console.error('Error adding product to IndexedDB:', error);
              
              // Handle database corruption
              if (error.name === 'DatabaseClosedError' || 
                  error.message.includes('Internal error opening backing store')) {
                if (resetDatabase) {
                  await resetDatabase();
                  setSnackbar({
                    open: true,
                    message: 'Database has been reset due to corruption. Please refresh the page.',
                    severity: 'warning'
                  });
                  return;
                }
              }
              
              setSnackbar({
                open: true,
                message: 'Failed to add product locally',
                severity: 'error'
              });
            }
          }
        }
      }
      
      handleCloseDialog();
      fetchProducts(); // Refresh the data
    } catch (error) {
      console.error('Error saving product:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to save product'}`,
        severity: 'error'
      });
    }
  };

  // Get purity options based on metal type
  const getPurityOptions = (metalType) => {
    if (metalType === 'gold') {
      return ['24K', '22K', '18K', '14K'];
    } else {
      return ['99.9%', '92.5%', '80%'];
    }
  };

  // Get category options
  const getCategoryOptions = () => {
    return [
      'Necklace',
      'Pendant',
      'Ring',
      'Earring',
      'Bracelet',
      'Bangle',
      'Chain',
      'Anklet',
      'Nose Pin',
      'Coin',
      'Bar',
      'Other'
    ];
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render products in table view
  const renderProductsTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (normalizedProducts.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No products found{searchTerm ? ' for your search criteria' : ''}.
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>HOID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Metal</TableCell>
              <TableCell>Purity</TableCell>
              <TableCell>Net Weight (g)</TableCell>
              <TableCell>Gross Weight (g)</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {normalizedProducts.map((product) => (
              <TableRow key={product._id || product.id}>
                <TableCell>{product.hoid}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={product.metalType.charAt(0).toUpperCase() + product.metalType.slice(1)} 
                    color={product.metalType === 'gold' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{product.purity}</TableCell>
                <TableCell>{product.netWeight?.toFixed(3) || (product.weight?.toFixed(3) || '0.000')}</TableCell>
                <TableCell>{product.grossWeight?.toFixed(3) || (product.weight?.toFixed(3) || '0.000')}</TableCell>
                <TableCell>{product.category || '-'}</TableCell>
                <TableCell>{product.currentStock}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleConfirmDelete(product)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render products in grid view
  const renderProductsGrid = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (normalizedProducts.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No products found{searchTerm ? ' for your search criteria' : ''}.
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {normalizedProducts.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product._id || product.id}>
            <Card variant="outlined">
              <CardMedia
                sx={{ height: 140 }}
                image={product.image || 'https://via.placeholder.com/300x140?text=No+Image'}
                title={product.name}
              />
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="h6" noWrap title={product.name}>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  HOID: {product.hoid}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Metal: {product.metalType}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Purity: {product.purity}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Net: {product.netWeight?.toFixed(3) || (product.weight?.toFixed(3) || '0.000')}g
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Gross: {product.grossWeight?.toFixed(3) || (product.weight?.toFixed(3) || '0.000')}g
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Stock: {product.currentStock}
                    </Typography>
                  </Grid>
                </Grid>
                <Typography variant="subtitle2" color="text.secondary" style={{ marginTop: 4 }}>
                  Type: {product.metalType} | Purity: {product.purity}
                </Typography>
                {product.hasStones && (
                  <Chip size="small" label="Has Stones" color="secondary" style={{ marginTop: 4 }} />
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => handleOpenDialog(product)}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  color="error"
                  onClick={() => handleConfirmDelete(product)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Product Inventory</Typography>
        
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are currently offline. Some features may be limited.
          </Alert>
        )}
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search Products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchProducts}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={viewMode === 'table' ? <ImageIcon /> : <FilterList />}
            onClick={toggleViewMode}
            sx={{ mr: 1 }}
          >
            {viewMode === 'table' ? 'Grid View' : 'Table View'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Product
          </Button>
        </Grid>
      </Grid>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Gold" />
          <Tab label="Silver" />
        </Tabs>
        
        {viewMode === 'table' ? renderProductsTable() : renderProductsGrid()}
      </Paper>
      
      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Product name is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Product Name"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="hoid"
                  control={control}
                  rules={{ required: 'HOID is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="HOID (Unique ID)"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="metalType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Metal Type</InputLabel>
                      <Select {...field} label="Metal Type">
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="purity"
                  control={control}
                  rules={{ required: 'Purity is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <FormControl fullWidth margin="normal" error={!!error}>
                      <InputLabel>Purity</InputLabel>
                      <Select {...field} label="Purity">
                        {getPurityOptions(watchMetalType).map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="netWeight"
                  control={control}
                  rules={{ required: 'Net weight is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Net Weight (metal only, g)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.001" }}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="grossWeight"
                  control={control}
                  rules={{ required: 'Gross weight is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Gross Weight (total, g)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.001" }}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="hasStones"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Has stones/beads?"
                      style={{ marginTop: 16 }}
                    />
                  )}
                />
              </Grid>
              
              {watchHasStones && (
                <Grid item xs={12}>
                  <Controller
                    name="stoneDetails"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Stone/Bead Details"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter details about stones or beads used"
                      />
                    )}
                  />
                </Grid>
              )}
              
              {watchHasStones && (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="stonePrice"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Stone/Bead Price"
                        fullWidth
                        type="number"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        placeholder="Enter the price of stones/beads"
                      />
                    )}
                  />
                </Grid>
              )}
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="makingChargesPercentage"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Making Charges (%)"
                      fullWidth
                      margin="normal"
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{ min: 0, step: 0.1 }}
                      placeholder="Default making charges percentage"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="currentStock"
                  control={control}
                  rules={{ required: 'Stock quantity is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Current Stock"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {getCategoryOptions().map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="image"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Image URL"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      margin="normal"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedProduct ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete.open} onClose={handleCloseConfirmDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the product "{confirmDelete.product?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete}>Cancel</Button>
          <Button onClick={handleDeleteProduct} color="error" variant="contained">
            Delete
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

export default Products; 