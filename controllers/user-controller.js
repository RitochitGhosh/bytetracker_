const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user-schema");

// helper
const filterByDate = (dataArray, afterTime) => {
  const after = Number(afterTime);
  if (isNaN(after)) return [];

  return dataArray.filter((entry) => {
    return typeof entry.date === "number" && entry.date >= after;
  });
};

// GET "/api?id=_id"
const handleGetUserById = async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error _ handleGetUserById: ", error);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "/api/all-users"
const handleGetAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find({});

    if (!allUsers) {
      return res.status(404).json({
        message: "Users not found!",
      });
    }

    return res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error _ handleGetAllUsers: ", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "/api/" -> Post aadharId, firstName, lastName, email in req.body
const handleConnectToBankAccount = async (req, res) => {
  try {
    const { aadharId, firstName, lastName, email } = req.body;

    console.log("Reached here...");

    // Check if user has bank account or not
    const { data: user } = await axios.get(
      `http://localhost:8000/api/user?aadharId=${aadharId}`
    );

    console.log("Reached 1: ", user);

    if (!user) {
      return res.status(404).json({
        message: "User Not found!",
      });
    }

    // Fetch total amount from bank
    const { data: totalAmount } = await axios.get(
      `http://localhost:8000/api/total?aadharId=${aadharId}`
    );

    console.log("Reached 2: ", totalAmount);

    // Create user in local DB (port 6000)
    const newUser = new User({
      firstName,
      lastName,
      aadharId,
      email,
      grossAmount: totalAmount.total,
      credits: [],
      debits: [],
      goals: [],
    });

    console.log("Reached 3: ",newUser);

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully!",
      id: newUser._id,
    });
  } catch (error) {
    console.error("Error _ handleConnectToBankAccount: ", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// POST "/api/add-expense?id=_id" -> Post category, title, notes, cost in req.body and obtain _id from query
const handleAddExpense = async (req, res) => {
  try {
    const { category, title, notes, cost } = req.body;
    const { id } = req.query;

    if (!cost) {
      return res.status(400).json({ message: "Missing required fields!" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Check balance
    if (user.grossAmount < cost) {
      return res.status(400).json({ message: "Insufficient balance!" });
    }

    // Add debit
    user.debits.push({
      category,
      title,
      notes,
      costs: cost,
      date: Date.now(),
    });

    // Update amount
    user.grossAmount -= cost;
    await user.save();

    // Sync with bank service
    await axios.post("http://localhost:8000/api/deduct-money", {
      aadharId: user.aadharId,
      amount: cost,
    });

    // Alert if balance is low
    if (user.grossAmount <= user.alertOnRemaigning) {
      return res.status(200).json({
        message: "Expense added, but attention! Your account balance is low.",
        user,
      });
    }

    return res.status(200).json({ message: "Expense added!", user });
  } catch (err) {
    console.error("Error _ handleAddExpense: ", err);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

// POST "/api/add-credit?id=_idfirst" -> Post category, title, notes, cost in req.body and obtain _id from query
const handleAddCredit = async (req, res) => {
  try {
    const { title, notes, cost } = req.body;
    const { id } = req.query;

    if (!cost) {
      return res.status(400).json({
        message: "Missing required fields!",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    user.credits.push({
      title,
      notes,
      costs: cost,
      date: Date.now(),
    });

    // Update grossAmount
    user.grossAmount += cost;
    await user.save();

    // Sync with bank service
    await axios.post("http://localhost:8000/api/add-money", {
      aadharId: user.aadharId,
      amount: cost,
    });

    // Check balance
    if (user.grossAmount < user.alertOnRemaigning) {
      return res.status(400).json({ message: "Insufficient balance!" });
    }

    return res.status(200).json({ message: "Credit added!", user });
  } catch (err) {
    console.error("Error _ handleAddCredit:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST "/api/set-alert?id=_id" -> Post newAlertOnRemaigning in req.body and obtain _id from query
const handleSetAlertOnRemain = async (req, res) => {
  try {
    const { id } = req.query;
    const { newAlertOnRemaigning } = req.body;

    if (!newAlertOnRemaigning) {
      return res.status(400).json({
        message: "set alert field is missing!",
      });
    }

    const user = await User.findByIdAndUpdate(id, {
      alertOnRemaigning: newAlertOnRemaigning,
    });
    if (!user) return res.status(404).json({ message: "User not found!" });

    return res.status(200).json({ message: "Alert updated!" });
  } catch (err) {
    console.error("Error _ handleSetAlertOnRemain: ", err);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// POST "api/set-limit?id=_id"
const handleSetLimitPerDay = async (req, res) => {
  try {
    const { id } = req.query;
    const { newLimit } = req.body;

    if (!newLimit) {
      return res.status(400).json({
        message: "New limit is required!",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(id, {
      limitForDay: newLimit,
    });

    return res.status(200).json({
      message: "Updated successfully!",
    });
  } catch (error) {
    console.error("Error _ handleSetLimitPerDay: ", error);
    return res.status(500).json({
      message: "Internal Server error!",
    });
  }
};

// GET "/api/sync-transactions?id=_id"
const handleAfterConnectionChanges = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const aadharId = user.aadharId;
    const lastSynced = user.lastBankSync || new Date(user.createdAt).getTime();

    const bankRes = await axios.get(
      "http://localhost:8000/api/filter-transactions",
      {
        params: {
          aadharId,
          after: lastSynced,
        },
      }
    );

    const { credits: bankCredits = [], debits: bankDebits = [] } = bankRes.data;

    // Sync only if new
    bankCredits.forEach((credit) => {
      user.credits.push({
        title: "Synced from Bank",
        notes: "Auto-synced transaction",
        costs: credit.amount,
        date: credit.timestamps,
      });

      user.grossAmount = (user.grossAmount || 0) + credit.amount;
    });

    bankDebits.forEach((debit) => {
      user.debits.push({
        category: "Other",
        title: "Synced from Bank",
        notes: "Auto-synced transaction",
        costs: debit.amount,
        date: debit.timestamps,
      });

      user.grossAmount = (user.grossAmount || 0) - debit.amount;
    });

    // Update last sync to current timestamp
    user.lastBankSync = Date.now();

    await user.save();

    return res.status(200).json({
      message: "Transactions synced successfully",
      updatedCredits: bankCredits.length,
      updatedDebits: bankDebits.length,
      grossAmount: user.grossAmount,
    });
  } catch (err) {
    console.error("Error _ handleAfterConnectionChanges: ", err.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

// DELETE "/api?id=_id"
const handleDeleteUserById = async (req, res) => {
  try {
    const { id } = req.query;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    return res.status(200).json({
      message: "Successfully deleted user!",
    });
  } catch (error) {
    console.error("Error _ handleDeleteUserById: ", error);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "/api/total?id=_id"
const handleGetGrossAmount = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }
    console.log(user.grossAmount);

    return res.status(200).json({
      amount: user.grossAmount,
    });
  } catch (error) {
    console.error("Error _ handleGetGrossAmount:", error);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "/api/filter-by-category?id=_id"
const handleGetExpenseByCategory = async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const categoryMap = {};

    user.debits.forEach((debit) => {
      const category = debit.category || "Other";
      const cost = debit.costs || 0;

      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }

      categoryMap[category] += cost;
    });

    const result = Object.entries(categoryMap).map(([category, total]) => ({
      category,
      total,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error _ getExpenseByCategory: ", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

// POST "/api/update-debit?id=_id"
const handleUpdateDebitTransaction = async (req, res) => {
  try {
    const { id } = req.query;
    const { transactionId, category, title, notes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const debitToUpdate = user.debits.id(transactionId);
    if (!debitToUpdate) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Update fields if provided
    if (category) debitToUpdate.category = category;
    if (title) debitToUpdate.title = title;
    if (notes) debitToUpdate.notes = notes;

    await user.save();

    return res.status(200).json({
      message: "Transaction updated successfully",
      updated: debitToUpdate,
    });
  } catch (err) {
    console.error("Error updating debit transaction:", err.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

// PATCH "/api/update-user"id=_id"
const handleUpdateNameOrEmail = async (req, res) => {
  try {
    const { id } = req.query;
    const { firstName, lastName, email } = req.body;

    if (!firstName && !lastName && !email) {
      return res.status(400).json({ message: "No fields to update!" });
    }

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    return res.status(200).json({
      message: "User information updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error _ handleUpdateNameOrEmail: ", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

// GET "/api/total-credit?id=_id"
const handleGetTotalCredit = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const totalCredit = user.credits.reduce(
      (sum, credit) => sum + (credit.costs || 0),
      0
    );

    return res.status(200).json({ totalCredit });
  } catch (error) {
    console.error("Error _ handleGetTotalCredit: ", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

// GET "/api/total-debit?id=_id"
const handleGetTotalDebit = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const totalDebit = user.debits.reduce(
      (sum, debit) => sum + (debit.costs || 0),
      0
    );

    return res.status(200).json({ totalDebit });
  } catch (error) {
    console.error("Error _ handleGetTotalDebit: ", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

// GET "/api/list-credit?id=_id"
const handleGetAllCredits = async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    return res.status(200).json({
      credits: user.credits,
    });
  } catch (error) {
    console.error("Error _ handleGetAllCredits:", error);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "/api/list-debit?id=_id"
const handleGetAllDebits = async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    return res.status(200).json({
      debits: user.debits,
    });
  } catch (error) {
    console.error("Error _ handleGetAllDebits:", error);
    return res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// GET "api/credits-filter?id=USER_ID&after=TIMESTAMP"
const handleCreditsFilter = async (req, res) => {
  try {
    const { id, after } = req.query;

    if (!id || !after) {
      return res.status(400).json({ error: "Missing id or after parameter!" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found!" });

    const filteredCredits = filterByDate(user.credits, after);

    res.status(200).json({ data: filteredCredits });
  } catch (error) {
    console.error("Error _ handleCreditsFilter: ", error);
    return res.status(500).json({
      message: "Internal serrver error!",
    });
  }
};

// GET /debits-filter?id=USER_ID&after=TIMESTAMP
const handleDebitsFilter = async (req, res) => {
  try {
    const { id, after } = req.query;

    if (!id || !after) {
      return res.status(400).json({ error: "Missing id or after parameter!" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found!" });

    const filteredDebits = filterByDate(user.debits, after);

    res.status(200).json({
      data: filteredDebits,
    });
  } catch (error) {
    console.error("Error _ handleDebitsFilter: ", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// POST "/api/goals?id=_id"
const handleAddGoal = async (req, res) => {
  try {
    const { id } = req.query;
    const { title, priority, amount, isShortTermed, remaindAt } = req.body;

    if (!id || !title || !amount) {
      return res.status(400).json({ error: "Missing required fields!" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found!" });

    const newGoal = {
      title,
      amount,
      priority,
      isShortTermed: !!isShortTermed,
      createdAt: Date.now(),
      remaindAt: remaindAt || Date.now(),
    };

    user.goals.push(newGoal);
    await user.save();

    return res.status(201).json({
      message: "Goal added",
      goal: newGoal,
    });
  } catch (error) {
    console.error("Error _ handleAddGoal: ", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// PATCH "/api/goals?id=_id"
const handleUpdateGoal = async (req, res) => {
  try {
    const { id } = req.query;
    const { goalId, title, amount, priority, isShortTermed, remaindAt } = req.body;

    if (!id || !goalId) {
      return res.status(400).json({ error: "Missing id or goalId!" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const goal = user.goals.id(goalId);
    if (!goal) return res.status(404).json({ error: "Goal not found!" });

    if (title !== undefined) goal.title = title;
    if (amount !== undefined) goal.amount = amount;
    if (priority !== undefined) goal.priority = priority;
    if (isShortTermed !== undefined) goal.isShortTermed = isShortTermed;
    if (remaindAt !== undefined) goal.remaindAt = remaindAt;

    await user.save();

    return res.status(200).json({
      message: "Goal updated",
      goal,
    });
  } catch (error) {
    console.error("Error _ handleUpdateGoal: ", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

// DELETE "/api/goals?id=_id"
const handleDeleteGoal = async (req, res) => {
  try {
    const { id } = req.query;
    const { goalId } = req.body;

    if (!id || !goalId) {
      return res.status(400).json({ error: "Missing id or goalId!" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found!" });

    const goal = user.goals.id(goalId);
    if (!goal) return res.status(404).json({ error: "Goal not found!" });

    goal.remove();
    await user.save();

    res.json({ message: "Goal deleted", deletedGoalId: goalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/update-daily-goals
const handleUpdateDailyGoals = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing user ID!" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }

    const dailyLimit = user.limitForDay || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayDebits = filterByDate(user.debits, todayTimestamp);
    const todaySpent = todayDebits.reduce((total, debit) => total + debit.costs, 0);

    const remainingBalance = dailyLimit - todaySpent;

    const goals = user.goals.filter(goal => (goal.amount ?? 0) > (goal.currentlySaved ?? 0));
    const sum = goals.reduce((acc, goal) => acc + goal.priority, 0);
    const noOfGoals = goals.length;
    const quantumPriority = noOfGoals === 0 ? 0 : sum / noOfGoals;

    const sortedGoals = [...goals].sort((a, b) => b.priority - a.priority);

    const goalUpdates = [];

    if (remainingBalance >= 0) {
      let balanceLeft = remainingBalance;

      for (const goal of sortedGoals) {
        const priorityRatio = (goal.priority * quantumPriority) / sum;
        const potentialAllocation = balanceLeft * priorityRatio;

        const remainingToTarget = (goal.amount ?? 0) - (goal.currentlySaved ?? 0);
        const allocation = Math.min(potentialAllocation, remainingToTarget);

        if (allocation <= 0) continue;

        goalUpdates.push({
          goalId: goal._id,
          amount: allocation,
          type: "allocation"
        });

        balanceLeft -= allocation;

        // Update the goal's currentlySaved
        await User.updateOne(
          { _id: id, "goals._id": goal._id },
          {
            $inc: {
              "goals.$.currentlySaved": allocation
            }
          }
        );

        if (balanceLeft <= 0) break;
      }

    } else {
      const reverseSortedGoals = [...sortedGoals].reverse();
      let remainingDeficit = Math.abs(remainingBalance);

      for (const goal of reverseSortedGoals) {
        const currentGoalSaved = goal.currentlySaved || 0;
        const maxCut = Math.min(currentGoalSaved, remainingDeficit);

        if (maxCut > 0) {
          goalUpdates.push({
            goalId: goal._id,
            amount: -maxCut,
            type: "reduction"
          });

          remainingDeficit -= maxCut;

          await User.updateOne(
            { _id: id, "goals._id": goal._id },
            {
              $inc: {
                "goals.$.currentlySaved": -maxCut
              }
            }
          );

          if (remainingDeficit <= 0) break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      dailyLimit,
      spent: todaySpent,
      remainingBalance,
      goalUpdates
    });

  } catch (error) {
    console.error("Error _ handleUpdateDailyGoals: ", error);
    return res.status(500).json({
      message: "Internal server error!",
      error: error.message
    });
  }
};


module.exports = {
  handleGetUserById,
  handleGetAllUsers,
  handleConnectToBankAccount,
  handleAddExpense,
  handleAddCredit,
  handleSetAlertOnRemain,
  handleAfterConnectionChanges,
  handleDeleteUserById,
  handleGetGrossAmount,
  handleGetExpenseByCategory,
  handleUpdateDebitTransaction,
  handleSetLimitPerDay,
  handleUpdateNameOrEmail,
  handleGetTotalCredit,
  handleGetTotalDebit,
  handleGetAllCredits,
  handleGetAllDebits,
  handleCreditsFilter,
  handleDebitsFilter,
  handleAddGoal,
  handleUpdateGoal,
  handleDeleteGoal,
  handleUpdateDailyGoals,
};
