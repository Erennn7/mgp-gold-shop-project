import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout/Layout';
import { useAuth } from './store/AuthContext';
import { useDatabase } from './store/DatabaseContext';

// Direct imports instead of lazy loading
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Prices from './pages/Prices';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Sales from './pages/Sales';
import SaleDetail from './pages/SaleDetail';
import NewSale from './pages/NewSale';
import Loans from './pages/Loans';
import GoldPurchases from './pages/GoldPurchases';
import GoldPurchaseDetail from './pages/GoldPurchaseDetail';
import NewGoldPurchase from './pages/NewGoldPurchase';
import NotFound from './pages/NotFound';
import PriceSettings from './pages/PriceSettings';
import Profile from './pages/Profile';
import SavingsSchemes from './pages/SavingsSchemes';
import NewSavingsScheme from './pages/NewSavingsScheme';
import SavingsSchemeDetail from './pages/SavingsSchemeDetail';

// Loading component
const LoadingComponent = () => {
  const theme = useTheme();
  
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor={theme.palette.background.default}
    >
      <CircularProgress color="primary" />
    </Box>
  );
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingComponent />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { db, isLoading, initialize } = useDatabase();
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Initialize the database
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize the database before showing the UI
        await initialize();
        setIsAppReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initApp();
  }, [initialize]);
  
  if (!isAppReady || isLoading) {
    return <LoadingComponent />;
  }
  
  return (
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="prices" element={<Prices />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="sales/:id" element={<SaleDetail />} />
          <Route path="loans" element={<Loans />} />
        <Route path="gold-purchases" element={<GoldPurchases />} />
        <Route path="gold-purchases/new" element={<NewGoldPurchase />} />
        <Route path="gold-purchases/:id" element={<GoldPurchaseDetail />} />
        <Route path="savings-schemes" element={<SavingsSchemes />} />
        <Route path="savings-schemes/new" element={<NewSavingsScheme />} />
        <Route path="savings-schemes/:id" element={<SavingsSchemeDetail />} />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}

export default App; 