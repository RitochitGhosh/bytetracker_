const express = require("express");

const {
    connectToBankAccount,
    addExpense,
    addCredit,
    setAlertOnRemain,
} = require("../controllers/user-controller");

const router = express.Router();

router.post("/", connectToBankAccount);
router.post("/add-expense", addExpense);
router.post("/add-credit", addCredit);
router.post("/set-alert-on-remain", setAlertOnRemain);

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