const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");
const _ = require("lodash");
const path = require("path");
const { v4: uuid } = require("uuid");
const port = 80;
const app = express();
app.use(cors());
app.use(express.static(__dirname));
app.options("*", cors());
// database connection 

// end database connection 
app.get("/", (req, res) => {
  
  res.json({
    message: `My name is`
  });
});


app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
