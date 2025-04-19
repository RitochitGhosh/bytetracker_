const axios = require("axios");
const User = require("../models/user-schema")

// POST /
const connectToBankAccount = async (req, res) => {
    const { aadharId, username, email } = req.body;

    try {
        // Validate user exists on central DB (port 8000)
        const { data : user } = await axios.get(`http://localhost:8000/user?aadharId=${aadharId}`);
        console.log(user)
        if (!user) {
            return res.status(404).json({
                message: "User Not found!"
            })
        }
        console.log("Request reached..")

        // Fetch total amount from central DB
        const { data : totalAmount } = await axios.get(`http://localhost:8000/total?aadharId=${aadharId}`);
        console.log(totalAmount)

        // Create user in local DB (port 6000)
        const newUser = new User({
            username : username,
            aadharId : aadharId,
            email: email,
            total : totalAmount,
            credits: [],
            debits: []
        });

        await newUser.save();
        return res.status(201).json({ message: "User created successfully", user: newUser });

    } catch (error) {
        return res.status(500).json({
            message: "User creation failed",
            error: error.response?.data?.message || error.message
        });
    }
};

// POST /add-expense
const addExpense = async (req, res) => {
    const { aadharId, category, title, note, cost } = req.body;
    try {
        const user = await User.findOne({ aadharId });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update current database
        user.debits.push({ category, title, note, cost, date: new Date() });
        user.total -= cost;
        await user.save();

        // Sync with bank service
        await axios.post("http://localhost:8000/add-money", {
            aadharId,
            amount:cost
        });

        return res.status(200).json({ message: "Expense added", user });
    } catch (err) {
        return res.status(500).json({ message: "Internal Error", error: err.message });
    }
};


// POST /add-credit
const addCredit = async (req, res) => {
    const { aadharId, title, note, cost } = req.body;
    try {
        const user = await User.findOne({ aadharId });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.credits.push({ title, note, cost, date: new Date() });
        user.total += cost;

        await user.save();
        return res.status(200).json({ message: "Credit added", user });
    } catch (err) {
        return res.status(500).json({ message: "Internal Error", error: err.message });
    }
};

// POST /set-alert-on-remain
const setAlertOnRemain = async (req, res) => {
    const { aadharId, alert } = req.body;
    try {
        const user = await User.findOneAndUpdate({ aadharId }, { alertOnRemaigning: alert }, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({ message: "Alert updated", user });
    } catch (err) {
        return res.status(500).json({ message: "Internal Error", error: err.message });
    }
};

module.exports = {
    connectToBankAccount,
    addExpense,
    addCredit,
    setAlertOnRemain
};
