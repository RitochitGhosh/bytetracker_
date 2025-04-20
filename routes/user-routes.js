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
  handleSetLimitPerDay,
  handleUpdateNameOrEmail,
  handleGetTotalCredit,
  handleGetTotalDebit,
  handleGetUserById,
  handleGetAllCredits,
  handleGetAllDebits,
  handleCreditsFilter,
  handleDebitsFilter,
  handleAddGoal,
  handleUpdateGoal,
  handleDeleteGoal,
  handleUpdateDailyGoals,
  handleAddCategory,
  handleUpdateCategory,
} = require("../controllers/user-controller");

const router = express.Router();

router.get("/get-all-of-them", handleGetAllUsers);
router.get("/", handleGetUserById);
router.post("/", handleConnectToBankAccount);
router.post("/add-expense", handleAddExpense);
router.post("/add-credit", handleAddCredit);
router.post("/set-alert", handleSetAlertOnRemain);
router.get("/sync-transactions", handleAfterConnectionChanges);
router.delete("/", handleDeleteUserById);
router.get("/total", handleGetGrossAmount);
router.get("/filter-by-category", handleGetExpenseByCategory);
router.post("/update-debit", handleUpdateDebitTransaction);
router.post("/set-limit", handleSetLimitPerDay);
router.patch("/update-user", handleUpdateNameOrEmail);
router.get("/total-credit", handleGetTotalCredit);
router.get("/total-debit", handleGetTotalDebit);
router.get("/list-credit", handleGetAllCredits);
router.get("/list-debit", handleGetAllDebits);
router.get("/credits-filter", handleCreditsFilter);
router.get("/debits-filter", handleDebitsFilter);
router
  .route("/goals")
  .post(handleAddGoal)
  .patch(handleUpdateGoal)
  .delete(handleDeleteGoal);
router.post("/update-daily-goals", handleUpdateDailyGoals);
router.route("/category").post(handleAddCategory).patch(handleUpdateCategory);

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
