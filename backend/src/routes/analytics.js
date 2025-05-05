const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Product = require('../models/Product');
const GoldPurchase = require('../models/GoldPurchase');
const { format, subDays } = require('date-fns');
const mongoose = require('mongoose');

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Get real data from database
    let dashboardData = {
      totalSales: 0,
      totalGoldPurchases: 0,
      totalCustomers: 0,
      activeLoans: 0,
      recentSales: [],
      recentGoldPurchases: [],
      salesByDay: [],
      salesByMetal: [],
      purchasesByMetal: [],
      topProducts: []
    };
    
    try {
      // Get total sales
      const totalSales = await Sale.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]);
      dashboardData.totalSales = totalSales.length > 0 ? totalSales[0].total : 0;
    } catch (error) {
      console.error('Error getting total sales:', error);
    }
    
    try {
      // Get total gold purchases
      const totalGoldPurchases = await GoldPurchase.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]);
      dashboardData.totalGoldPurchases = totalGoldPurchases.length > 0 ? totalGoldPurchases[0].total : 0;
    } catch (error) {
      console.error('Error getting total gold purchases:', error);
    }
    
    try {
      // Get total customers
      dashboardData.totalCustomers = await Customer.countDocuments();
    } catch (error) {
      console.error('Error getting total customers:', error);
    }
    
    try {
      // Get active loans
      dashboardData.activeLoans = await Loan.countDocuments({ status: 'active' });
    } catch (error) {
      console.error('Error getting active loans:', error);
    }
    
    try {
      // Get recent sales (last 5)
      dashboardData.recentSales = await Sale.find()
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(5);
    } catch (error) {
      console.error('Error getting recent sales:', error);
    }
    
    try {
      // Get recent gold purchases (last 5)
      dashboardData.recentGoldPurchases = await GoldPurchase.find()
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(5);
    } catch (error) {
      console.error('Error getting recent gold purchases:', error);
    }
    
    try {
      // Calculate sales by day (last 30 days)
      const salesByDay = [];
      const today = new Date();
      
      // Create array of last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        salesByDay.push({
          date: format(date, 'dd/MM'),
          sales: 0,
          purchases: 0,
          _date: new Date(date.setHours(0, 0, 0, 0))
        });
      }
      
      // Get sales for last 30 days
      const thirtyDaysAgo = subDays(today, 30);
      const recentSaleData = await Sale.find({
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // Get gold purchases for last 30 days
      const recentGoldPurchaseData = await GoldPurchase.find({
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // Populate sales by day
      recentSaleData.forEach(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        
        const dayIndex = salesByDay.findIndex(day => 
          day._date.getTime() === saleDate.getTime()
        );
        
        if (dayIndex !== -1) {
          salesByDay[dayIndex].sales += sale.totalAmount;
        }
      });
      
      // Populate gold purchases by day
      recentGoldPurchaseData.forEach(purchase => {
        const purchaseDate = new Date(purchase.createdAt);
        purchaseDate.setHours(0, 0, 0, 0);
        
        const dayIndex = salesByDay.findIndex(day => 
          day._date.getTime() === purchaseDate.getTime()
        );
        
        if (dayIndex !== -1) {
          salesByDay[dayIndex].purchases += purchase.totalAmount;
        }
      });
      
      // Remove temporary date property before sending to client
      salesByDay.forEach(day => delete day._date);
      dashboardData.salesByDay = salesByDay;
    } catch (error) {
      console.error('Error calculating sales by day:', error);
    }
    
    try {
      // Calculate sales by metal type
      const salesWithItems = await Sale.find();
      
      let goldSales = 0;
      let silverSales = 0;
      
      // Loop through sales to calculate sales by metal type
      salesWithItems.forEach(sale => {
        sale.items.forEach(item => {
          if (item.metalType === 'gold') {
            goldSales += item.totalPrice;
          } else if (item.metalType === 'silver') {
            silverSales += item.totalPrice;
          }
        });
      });
      
      dashboardData.salesByMetal = [
        { name: 'Gold', value: goldSales },
        { name: 'Silver', value: silverSales }
      ];
    } catch (error) {
      console.error('Error calculating sales by metal:', error);
    }
    
    try {
      // Calculate purchases by metal type
      const purchasesWithItems = await GoldPurchase.find();
      
      let goldPurchases = 0;
      let silverPurchases = 0;
      
      // Loop through purchases to calculate by metal type
      purchasesWithItems.forEach(purchase => {
        purchase.items.forEach(item => {
          if (item.metalType === 'gold') {
            goldPurchases += item.totalAmount;
          } else if (item.metalType === 'silver') {
            silverPurchases += item.totalAmount;
          }
        });
      });
      
      dashboardData.purchasesByMetal = [
        { name: 'Gold', value: goldPurchases },
        { name: 'Silver', value: silverPurchases }
      ];
    } catch (error) {
      console.error('Error calculating purchases by metal:', error);
    }
    
    try {
      // Get top products by sales
      const topProducts = await Sale.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            totalSales: { $sum: "$items.totalPrice" },
            quantity: { $sum: "$items.quantity" },
            metalType: { $first: "$items.metalType" }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            name: "$_id",
            totalSales: 1,
            quantity: 1,
            metalType: 1
          }
        }
      ]);
      
      dashboardData.topProducts = topProducts;
    } catch (error) {
      console.error('Error getting top products:', error);
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/sales - Get sales analytics
router.get('/sales', async (req, res) => {
  try {
    // Calculate monthly sales data
    const monthlySales = await calculateMonthlySales();
    
    // Calculate sales by category
    const salesByCategory = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          sales: { $sum: "$items.totalPrice" }
        }
      },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ["$_id", "Other"] },
          sales: 1
        }
      },
      { $sort: { sales: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        monthlySales,
        salesByCategory
      }
    });
  } catch (error) {
    console.error('Error getting sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to calculate monthly sales data
async function calculateMonthlySales() {
  const currentYear = new Date().getFullYear();
  const results = [];
  
  // Define months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Get all sales for the current year
  const sales = await Sale.find({
    createdAt: {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31`)
    }
  });
  
  // Initialize results array
  for (let i = 0; i < 12; i++) {
    results.push({
      month: months[i],
      gold: 0,
      silver: 0
    });
  }
  
  // Aggregate sales by month and metal type
  sales.forEach(sale => {
    const month = new Date(sale.createdAt).getMonth();
    
    sale.items.forEach(item => {
      if (item.metalType === 'gold') {
        results[month].gold += item.totalPrice;
      } else if (item.metalType === 'silver') {
        results[month].silver += item.totalPrice;
      }
    });
  });
  
  return results;
}

module.exports = router; 