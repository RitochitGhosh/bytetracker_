const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    aadharId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    grossAmount: { type: Number, },
    alertOnRemaigning: { type: Number, default: 100 },
    limitForDay: { type: Number, default: 1000 },
    debits: [
        {
            category: {
                type: String,
                default: "Other"
            },
            title: {
                type: String,
                default: "",
            },
            notes: {
                type: String,
                default: "",
            },
            costs: {
                type: Number,
                required: true
            },
            date: {
                type: Number,
            }
        }, 
    ],
    credits: [
        {
            title: {
                type: String,
                default: "",
            },
            notes: {
                type: String,
                default: "",
            },
            costs: {
                type: Number,
                required: true,
            },
            date: {
                type: Number,
            }
        }, 
    ],
    lastBankSync: { type: Number, default: 0 },
    goals: [
        {
            isShortTermed: { type: Boolean, default: false },
            title: { type: String, default: "" },
            amount: { type: Number, },
            createdAt: { type: Number, default: Date.now() },
            remaindAt: { type: Number, default: Date.now() }
        }
    ]
}, { timestamps: true });

const User = mongoose.model("user", userSchema);

module.exports = User