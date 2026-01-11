import userModel from "../models/userModel.js";
import transactionModel from "../models/transactionModel.js";
import toolUsageModel from "../models/toolUsageModel.js";


export const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.userId;

   
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    
    const totalTransactions = await transactionModel.countDocuments({ 
      userId, 
      payment: true 
    });

    const totalCreditsPurchased = await transactionModel.aggregate([
      { $match: { userId, payment: true } },
      { $group: { _id: null, total: { $sum: "$credits" } } }
    ]);

    
    const totalToolsUsed = await toolUsageModel.countDocuments({ userId });

    const toolUsageBreakdown = await toolUsageModel.aggregate([
      { $match: { userId } },
      { $group: { 
          _id: "$toolName", 
          count: { $sum: 1 },
          creditsSpent: { $sum: "$creditsUsed" }
        }
      },
      { $sort: { count: -1 } }
    ]);

 
    const recentActivity = await toolUsageModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('toolName creditsUsed createdAt');

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          currentCredits: user.creditBalance
        },
        stats: {
          totalTransactions,
          totalCreditsPurchased: totalCreditsPurchased[0]?.total || 0,
          totalToolsUsed,
          currentCredits: user.creditBalance
        },
        toolUsageBreakdown,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await transactionModel
      .find({ userId, payment: true })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('plan amount credits date razorpayOrderId razorpayPaymentId');

    const totalTransactions = await transactionModel.countDocuments({ 
      userId, 
      payment: true 
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTransactions / parseInt(limit)),
          totalTransactions,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Transaction History Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


export const getToolUsageHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, toolName } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);


    const query = { userId };
    if (toolName) {
      query.toolName = toolName;
    }

    const toolUsages = await toolUsageModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('toolName creditsUsed prompt createdAt');

    const totalUsages = await toolUsageModel.countDocuments(query);

    res.json({
      success: true,
      data: {
        toolUsages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsages / parseInt(limit)),
          totalUsages,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Tool Usage History Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


export const getToolUsageStats = async (req, res) => {
  try {
    const userId = req.userId;
    const { period = 'all' } = req.query; 
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'week':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.setDate(now.getDate() - 7)) 
          } 
        };
        break;
      case 'month':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.setMonth(now.getMonth() - 1)) 
          } 
        };
        break;
      case 'year':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.setFullYear(now.getFullYear() - 1)) 
          } 
        };
        break;
      default:
        dateFilter = {};
    }

    // Get tool usage breakdown with date filter
    const toolStats = await toolUsageModel.aggregate([
      { $match: { userId, ...dateFilter } },
      { 
        $group: { 
          _id: "$toolName", 
          count: { $sum: 1 },
          totalCreditsUsed: { $sum: "$creditsUsed" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get usage over time 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageOverTime = await toolUsageModel.aggregate([
      { 
        $match: { 
          userId, 
          createdAt: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
          },
          count: { $sum: 1 },
          creditsUsed: { $sum: "$creditsUsed" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Total stats for the period
    const totalStats = await toolUsageModel.aggregate([
      { $match: { userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalUsages: { $sum: 1 },
          totalCreditsUsed: { $sum: "$creditsUsed" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        toolStats,
        usageOverTime,
        summary: totalStats[0] || { totalUsages: 0, totalCreditsUsed: 0 }
      }
    });

  } catch (error) {
    console.error("Tool Usage Stats Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get Credit Usage Summary
export const getCreditUsageSummary = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Total credits purchased
    const totalPurchased = await transactionModel.aggregate([
      { $match: { userId, payment: true } },
      { $group: { _id: null, total: { $sum: "$credits" } } }
    ]);

  
    const totalUsed = await toolUsageModel.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$creditsUsed" } } }
    ]);

    const creditsPurchased = totalPurchased[0]?.total || 0;
    const creditsUsed = totalUsed[0]?.total || 0;
    const currentBalance = user.creditBalance;


    const creditsByTool = await toolUsageModel.aggregate([
      { $match: { userId } },
      { 
        $group: { 
          _id: "$toolName", 
          creditsUsed: { $sum: "$creditsUsed" } 
        }
      },
      { $sort: { creditsUsed: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        currentBalance,
        creditsPurchased,
        creditsUsed,
        creditsRemaining: currentBalance,
        creditsByTool
      }
    });

  } catch (error) {
    console.error("Credit Usage Summary Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};