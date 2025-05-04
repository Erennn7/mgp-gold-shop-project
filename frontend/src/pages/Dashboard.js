import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  IconButton,
  useTheme
} from '@mui/material';
import {
  ShoppingBasket,
  Person,
  AccountBalanceWallet,
  TrendingUp,
  Visibility,
  Refresh,
  AttachMoney,
  MonetizationOn,
  CompareArrows,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';
import { useAuth } from '../store/AuthContext';

// Stat card component
const StatCard = ({ title, value, icon, color, loading, onClick }) => {
  const theme = useTheme();
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 3 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', height: 40 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Typography variant="h4" sx={{ mt: 1, mb: 2 }}>
                {value}
              </Typography>
            )}
          </Box>
          <Box 
            sx={{ 
              bgcolor: `${color}.main`, 
              color: `${color}.contrastText`,
              p: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  
  // State
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    activeLoans: 0,
    recentSales: [],
    salesByDay: [],
    salesByMetal: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Get database context
  const { db } = useDatabase();

  // Effect to fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Function to fetch dashboard data from API or IndexedDB
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        const response = await api.get('/api/analytics/dashboard');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } else {
        // If offline, calculate from IndexedDB
        if (db) {
          try {
            // Get data from IndexedDB
            const sales = await db.sales.toArray();
            const customers = await db.customers.toArray();
            const loans = await db.loans.toArray();
            
            // Calculate stats
            const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalCustomers = customers.length;
            const activeLoans = loans.filter(loan => loan.status === 'active').length;
            
            // Get recent sales
            const recentSales = sales
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5);
            
            // Calculate sales by day (last 30 days)
            const salesByDay = [];
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
              const date = subDays(today, i);
              const dateString = format(date, 'yyyy-MM-dd');
              const dailySales = sales
                .filter(sale => {
                  const saleDate = format(new Date(sale.createdAt), 'yyyy-MM-dd');
                  return saleDate === dateString;
                })
                .reduce((sum, sale) => sum + sale.totalAmount, 0);
              
              salesByDay.push({
                date: format(date, 'dd/MM'),
                sales: dailySales
              });
            }
            
            // Calculate sales by metal type
            const goldSales = sales
              .filter(sale => 
                sale.items.some(item => item.metalType === 'gold')
              )
              .reduce((sum, sale) => sum + sale.totalAmount, 0);
            
            const silverSales = sales
              .filter(sale => 
                sale.items.some(item => item.metalType === 'silver')
              )
              .reduce((sum, sale) => sum + sale.totalAmount, 0);
            
            const salesByMetal = [
              { name: 'Gold', value: goldSales },
              { name: 'Silver', value: silverSales }
            ];
            
            // Calculate top products
            const productMap = new Map();
            sales.forEach(sale => {
              sale.items.forEach(item => {
                const key = `${item.name}-${item.metalType}`;
                if (productMap.has(key)) {
                  productMap.set(key, {
                    ...productMap.get(key),
                    quantity: productMap.get(key).quantity + item.quantity,
                    totalSales: productMap.get(key).totalSales + item.totalPrice
                  });
                } else {
                  productMap.set(key, {
                    name: item.name,
                    metalType: item.metalType,
                    quantity: item.quantity,
                    totalSales: item.totalPrice
                  });
                }
              });
            });
            
            const topProducts = Array.from(productMap.values())
              .sort((a, b) => b.totalSales - a.totalSales)
              .slice(0, 5);
            
            // Set stats
            setStats({
              totalSales,
              totalCustomers,
              activeLoans,
              recentSales,
              salesByDay,
              salesByMetal,
              topProducts
            });
          } catch (error) {
            console.error('Error calculating offline stats:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Navigate to sales page
  const navigateToSales = () => {
    navigate('/sales');
  };

  // Navigate to customers page
  const navigateToCustomers = () => {
    navigate('/customers');
  };

  // Navigate to loans page
  const navigateToLoans = () => {
    navigate('/loans');
  };

  // Navigate to prices page
  const navigateToPrices = () => {
    navigate('/prices');
  };

  // Navigate to sale detail page
  const navigateToSaleDetail = (sale) => {
    navigate(`/sales/${sale._id}`);
  };

  // Get color for pie chart
  const getPieChartColor = (entry, index) => {
    const colors = [theme.palette.primary.main, theme.palette.secondary.main];
    return colors[index % colors.length];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        
        <Box>
          {isOffline && (
            <Alert severity="warning" sx={{ mb: 2, display: 'inline-flex', mr: 2 }}>
              You are offline. Some features may be limited.
            </Alert>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            icon={<MonetizationOn />}
            color="primary"
            loading={loading}
            onClick={navigateToSales}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={<Person />}
            color="success"
            loading={loading}
            onClick={navigateToCustomers}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Loans"
            value={stats.activeLoans}
            icon={<AccountBalanceWallet />}
            color="warning"
            loading={loading}
            onClick={navigateToLoans}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Rates"
            value={<Chip label="View Rates" color="info" size="small" />}
            icon={<CompareArrows />}
            color="info"
            loading={loading}
            onClick={navigateToPrices}
          />
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Sales Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <TrendingUp fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Sales Trend (Last 30 Days)
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : stats.salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={stats.salesByDay}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Sales']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke={theme.palette.primary.main} 
                    activeDot={{ r: 8 }} 
                    name="Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography variant="body1" color="text.secondary">
                  No sales data available for the last 30 days
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Sales by Metal Type */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <BarChartIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Sales by Metal Type
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : stats.salesByMetal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.salesByMetal}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.salesByMetal.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPieChartColor(entry, index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography variant="body1" color="text.secondary">
                  No sales data available by metal type
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Sales */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            <ShoppingBasket fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Recent Sales
          </Typography>
          <Button
            variant="text"
            onClick={navigateToSales}
          >
            View All
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : stats.recentSales && stats.recentSales.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.recentSales.map((sale) => (
                  <TableRow key={sale._id || sale.id}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{sale.customer?.name || 'Unknown'}</TableCell>
                    <TableCell>{format(new Date(sale.createdAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1)} 
                        color={
                          sale.paymentStatus === 'completed' ? 'success' :
                          sale.paymentStatus === 'pending' ? 'error' : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => navigateToSaleDetail(sale)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No recent sales found
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Top Products */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            <AttachMoney fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Top Products by Sales
          </Typography>
          <Button
            variant="text"
            onClick={() => navigate('/products')}
          >
            View All Products
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : stats.topProducts.length > 0 ? (
          <Box sx={{ p: 2 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.topProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke={theme.palette.primary.main} />
                <YAxis yAxisId="right" orientation="right" stroke={theme.palette.secondary.main} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'totalSales') return [formatCurrency(value), 'Sales'];
                  return [value, 'Quantity'];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="totalSales" name="Sales" fill={theme.palette.primary.main} />
                <Bar yAxisId="right" dataKey="quantity" name="Quantity" fill={theme.palette.secondary.main} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No product sales data available
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard; 