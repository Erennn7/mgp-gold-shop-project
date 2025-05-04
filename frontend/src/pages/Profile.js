import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Avatar } from '@mui/material';
import { useAuth } from '../store/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        User Profile
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: 'primary.main',
              fontSize: '2rem',
              mr: 2
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </Avatar>
          <Typography variant="h6">{user?.name || "Demo User"}</Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2" color="textSecondary">Username</Typography>
            <Typography variant="body1">{user?.username || "demo-user"}</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2" color="textSecondary">Email</Typography>
            <Typography variant="body1">{user?.email || "demo@example.com"}</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2" color="textSecondary">Role</Typography>
            <Typography variant="body1">{user?.role || "Admin"}</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">Account Status</Typography>
            <Typography variant="body1" color="success.main">Active</Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Box mt={3}>
        <Typography variant="body2" color="textSecondary">
          Note: This is a simplified profile view. A complete profile management system with editing capabilities will be available in future updates.
        </Typography>
      </Box>
    </Box>
  );
};

export default Profile; 