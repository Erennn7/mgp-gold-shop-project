const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Product = require('../models/Product');
const { format, subDays } = require('date-fns');

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    // Get real data from database
    
    // Get total sales
    const totalSales = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    
    // Get total customers
    const totalCustomers = await Customer.countDocuments();
    
    // Get active loans
    const activeLoans = await Loan.countDocuments({ status: 'active' });
    
    // Get recent purchases (last 5)
    const recentPurchases = await Purchase.find()
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Calculate sales by day (last 30 days)
    const salesByDay = [];
    const today = new Date();
    
    // Create array of last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      salesByDay.push({
        date: format(date, 'dd/MM'),
        sales: 0,
        _date: new Date(date.setHours(0, 0, 0, 0))
      });
    }
    
    // Get purchases for last 30 days
    const thirtyDaysAgo = subDays(today, 30);
    const recentSales = await Purchase.find({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Populate sales by day
    recentSales.forEach(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      purchaseDate.setHours(0, 0, 0, 0);
      
      const dayIndex = salesByDay.findIndex(day => 
        day._date.getTime() === purchaseDate.getTime()
      );
      
      if (dayIndex !== -1) {
        salesByDay[dayIndex].sales += purchase.totalAmount;
      }
    });
    
    // Remove temporary date property before sending to client
    salesByDay.forEach(day => delete day._date);
    
    // Calculate sales by metal type
    const purchasesWithItems = await Purchase.find();
    
    let goldSales = 0;
    let silverSales = 0;
    
    // Loop through purchases to calculate sales by metal type
    purchasesWithItems.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.metalType === 'gold') {
          goldSales += item.totalPrice;
        } else if (item.metalType === 'silver') {
          silverSales += item.totalPrice;
        }
      });
    });
    
    const salesByMetal = [
      { name: 'Gold', value: goldSales },
      { name: 'Silver', value: silverSales }
    ];
    
    // Get top products by sales
    const topProducts = await Purchase.aggregate([
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
    
    // Create dashboard data object
    const dashboardData = {
      totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      totalCustomers,
      activeLoans,
      recentPurchases,
      salesByDay,
      salesByMetal,
      topProducts
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/analytics/sales - Get sales analytics
router.get('/sales', async (req, res) => {
  try {
    // Calculate monthly sales data
    const monthlySales = await calculateMonthlySales();
    
    // Calculate sales by category
    const salesByCategory = await Purchase.aggregate([
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
  
  // Get all purchases for the current year
  const purchases = await Purchase.find({
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
  purchases.forEach(purchase => {
    const month = new Date(purchase.createdAt).getMonth();
    
    purchase.items.forEach(item => {
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