const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user-schema");

// GET "/api?id=_id"
const handleGetUserById = async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id);
    if(!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error("Error _ handleGetUserById: ", error);
    return res.status(500).json({
      message: "Internal server error!"
    })
  }
}


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

    // Check if user has bank account or not
    const { data: user } = await axios.get(
      `http://localhost:8000/api/user?aadharId=${aadharId}`
    );

    if (!user) {
      return res.status(404).json({
        message: "User Not found!",
      });
    }

    // Fetch total amount from bank
    const { data: totalAmount } = await axios.get(
      `http://localhost:8000/api/total?aadharId=${aadharId}`
    );

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

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully!",
      id: newUser._id, // add to queryparams
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

    return res.status(200).json({ message: "Alert updated!", user });
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
    const { transactionId, category, title, notes, costs, date } = req.body;

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
    if (costs !== undefined) debitToUpdate.costs = costs;
    if (date !== undefined) debitToUpdate.date = date;

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

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });

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

    const totalCredit = user.credits.reduce((sum, credit) => sum + (credit.costs || 0), 0);

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

    const totalDebit = user.debits.reduce((sum, debit) => sum + (debit.costs || 0), 0);

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
};
