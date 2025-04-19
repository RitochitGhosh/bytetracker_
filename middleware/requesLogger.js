const fs = require("fs");

function requestLogger(filename) {
  return (req, res, next) => {
    fs.appendFile(
      filename,
      `\n${new Date()}: ${req.ip} ${req.method}: ${req.path}\n`,
      (err, data) => {
        if (err) console.log("Error @ MIDDLEWARE: ", err);
        next();
      }
    );
  };
}

module.exports = {
  requestLogger,
};
