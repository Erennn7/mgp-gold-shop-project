import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  MonetizationOn as PricesIcon,
  Inventory as ProductsIcon,
  People as CustomersIcon,
  ReceiptLong as PurchasesIcon,
  Money as LoansIcon,
  AccountCircle,
  Sync as SyncIcon,
  SyncProblem as SyncProblemIcon,
  WifiOff as WifiOffIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  RestartAlt as RestartAltIcon,
  Error as ErrorIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { useDatabase } from '../../store/DatabaseContext';
import { getNetworkStatus, addNetworkStatusListener } from '../../utils/networkStatus';
import MongoDBConfigDialog from './MongoDBConfigDialog';
import ResetDatabaseDialog from './ResetDatabaseDialog';

// Drawer width
const drawerWidth = 240;

// Navigation items
const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Daily Pricing', icon: <PricesIcon />, path: '/prices' },
  { text: 'Products', icon: <ProductsIcon />, path: '/products' },
  { text: 'Customers', icon: <CustomersIcon />, path: '/customers' },
  { text: 'Purchases', icon: <PurchasesIcon />, path: '/purchases' },
  { text: 'Loans', icon: <LoansIcon />, path: '/loans' }
];

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { sync, isOnline: dbIsOnline, pendingSyncCount, resetDatabase, hasErrors, isResetting } = useDatabase();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile); // Initialize based on screen size
  const [anchorEl, setAnchorEl] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [mongoDBDialogOpen, setMongoDBDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const userMenuOpen = Boolean(anchorEl);

  // Update drawer state when screen size changes
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);
  
  // Check for first run on component mount
  useEffect(() => {
    const checkFirstRun = async () => {
      if (window.electron) {
        try {
          const config = await window.electron.getMongoDBConfig();
          if (config && config.firstRun) {
            setMongoDBDialogOpen(true);
          }
        } catch (error) {
          console.error('Failed to check first run status:', error);
        }
      }
    };
    
    checkFirstRun();
  }, []);
  
  // Check network status on component mount
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const status = await getNetworkStatus();
      setIsOnline(status);
    };
    
    checkNetworkStatus();
    
    // Add listener for network status changes
    const removeListener = addNetworkStatusListener((status) => {
      setIsOnline(status);
      
      // If we're back online, trigger a sync
      if (status) {
        handleSync();
      }
    });
    
    return () => {
      removeListener();
    };
  }, []);
  
  // Handle drawer open/close
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle menu open/close
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };
  
  // Handle sync button click
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      await sync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Add missing handler functions
  const handleProfile = () => {
    handleClose();
    // Navigate to profile or show profile dialog
    console.log('Profile clicked');
  };
  
  const handleAccountSettings = () => {
    handleClose();
    // Navigate to account settings
    console.log('Account settings clicked');
  };
  
  // Handle Reset Database
  const handleResetDatabase = async () => {
    setResetDialogOpen(false);
    try {
      const success = await resetDatabase();
      if (success) {
        // Replace snackbar with alert
        alert('Database has been reset successfully!');
      } else {
        alert('Failed to reset database. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      alert('An error occurred while resetting the database.');
    }
  };
  
  // Render drawer content
  const renderDrawerContent = () => (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          MG Potdar Jewellers
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List component="nav">
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setDrawerOpen(false);
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: theme.palette.primary.main
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: 'flex' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            MG Potdar Jewellers
          </Typography>
          
          {/* Sync status */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {!navigator.onLine && (
              <Tooltip title="Offline mode - changes will sync when online">
                <WifiOffIcon color="error" sx={{ mr: 1 }} />
              </Tooltip>
            )}
            
            {pendingSyncCount > 0 && (
              <Tooltip title={`${pendingSyncCount} changes pending sync`}>
                <Chip 
                  icon={<SyncIcon />} 
                  label={pendingSyncCount} 
                  size="small" 
                  color="info"
                  onClick={handleSync}
                  sx={{ mr: 1 }}
                />
              </Tooltip>
            )}
          </Box>
          
          {/* User Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleClick}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            
            <MenuItem onClick={handleAccountSettings}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Account Settings
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={() => setMongoDBDialogOpen(true)}>
              <ListItemIcon>
                <StorageIcon fontSize="small" />
              </ListItemIcon>
              MongoDB Settings
            </MenuItem>
            
            <MenuItem onClick={() => setResetDialogOpen(true)} disabled={isResetting}>
              <ListItemIcon>
                <RestartAltIcon fontSize="small" color={hasErrors ? "error" : "inherit"} />
              </ListItemIcon>
              {isResetting ? 'Resetting Database...' : 'Reset Database'}
              {hasErrors && (
                <Tooltip title="Database errors detected" arrow>
                  <ErrorIcon fontSize="small" color="error" sx={{ ml: 1 }} />
                </Tooltip>
              )}
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            zIndex: (theme) => theme.zIndex.drawer,
          },
        }}
      >
        {renderDrawerContent()}
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer for fixed app bar */}
        <Outlet />
      </Box>
      
      {/* MongoDB Config Dialog */}
      <MongoDBConfigDialog 
        open={mongoDBDialogOpen} 
        onClose={() => setMongoDBDialogOpen(false)} 
      />
      
      {/* Database Reset Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        aria-labelledby="reset-database-dialog-title"
      >
        <DialogTitle id="reset-database-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestartAltIcon color="warning" />
          Reset Database
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography paragraph>
              This will completely reset the local database. All offline changes that haven't been synchronized with the server will be lost.
            </Typography>
            <Typography paragraph>
              Use this option if you're experiencing database errors or synchronization issues.
            </Typography>
            <Typography color="error">
              Are you sure you want to proceed?
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleResetDatabase} color="error" variant="contained">
            Reset Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout; 