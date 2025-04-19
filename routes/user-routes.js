const express = require("express");

const {
    handleConnectToBankAccount,
    handleAddExpense,
    handleAddCredit,
    handleSetAlertOnRemain,
    handleAfterConnectionChanges,
    handleDeleteUserById,
    handleGetGrossAmount,
    handleGetExpenseByCategory,
    handleUpdateDebitTransaction,
} = require("../controllers/user-controller");

const router = express.Router();

router.post("/", handleConnectToBankAccount);
router.post("/add-expense", handleAddExpense);
router.post("/add-credit", handleAddCredit);
router.post("/set-alert", handleSetAlertOnRemain);
router.get("/sync-transactions", handleAfterConnectionChanges);
router.delete("/", handleDeleteUserById);
router.get("/total", handleGetGrossAmount);
router.get("/filter-by-category",handleGetExpenseByCategory);
router.post("/update-debit", handleUpdateDebitTransaction);

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