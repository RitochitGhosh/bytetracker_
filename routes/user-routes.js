const express = require("express");

const {
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
    handleSetLimitPerDay
} = require("../controllers/user-controller");

const router = express.Router();

router.get("/", handleGetAllUsers);
router.post("/", handleConnectToBankAccount);
router.post("/add-expense", handleAddExpense);
router.post("/add-credit", handleAddCredit);
router.post("/set-alert", handleSetAlertOnRemain);
router.get("/sync-transactions", handleAfterConnectionChanges);
router.delete("/", handleDeleteUserById);
router.get("/total", handleGetGrossAmount);
router.get("/filter-by-category",handleGetExpenseByCategory);
router.post("/update-debit", handleUpdateDebitTransaction);
router.post("/set-limit", handleSetLimitPerDay);

module.exports = router;


{
/*
    GET connectToBankAccount (aadharId) : (_id, total )
      |-> only fetch the total amount
    automatically fetch transaction-data(credits, and debits) from the connected bank account whenever open the app.
    POST addExpence (category, title, note, cost) : (debits.$push({...}))
    POST addCredit (title, note, cost) : (credits.$push ({...}))
    POST setAlertOnRemaigning (aadharId) : (alertOnRemaigning)
    POST setLimitForDay (aadharId) : (limitForDay)
    POST + PUT setGoals (isShortTime, title, amount, remindAt) : (goals.$push({...}))
*/
}