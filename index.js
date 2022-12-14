const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");
const _ = require("lodash");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "./config.env" });
const { v4: uuid } = require("uuid");
const port = 3000;
const app = express();
app.use(require("./routes/record"));
app.use(express.json());
const secret = process.env.SECRET;
// get driver connection
const dbo = require("./db/conn");
const { ObjectID } = require("bson");
app.use(cors());
app.use(express.static(__dirname));
app.options("*", cors());
// database connection
const MongoClient = require("mongodb").MongoClient;
// end database connection

// a MongoDB connection URL
const url = process.env.ATLAS_URI;

// the name of the MongoDB database
const dbName = "mydb";

/// AUTHENTICATION STUFF //////////////////////////////////////////////////////////////////////////

// a middleware function to authenticate the user
function authenticate(req, res, next) {
  // get the token from the request header
  let token = req.headers["authorization"];
  if (!token) {
    // if no token is provided, return an error
    return res.status(401).json({ message: "Unauthorized" });
  }
  token = token.split("Bearer")[1].trim();
  try {
    // if a token is provided, verify it and get the user id
    const { id } = jwt.verify(token, secret);

    // if the token is valid, set the user id in the request object
    req.userId = id;

    // call the next middleware function
    next();
  } catch (error) {
    // if the token is invalid, return an error
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// a route to login the user and return a JSON web token
app.post("/login", (req, res) => {
  // get the username and password from the request body
  const { username, password } = req.body;

  // connect to the MongoDB database
  MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      // if there is an error, return an error
      return res.status(500).json({ message: err.message });
    }

    // get the 'users' collection from the database
    const collection = client.db(dbName).collection("users");

    // find the user in the collection
    collection.findOne({ username, password }, (error, user) => {
      if (error) {
        // if there is an error, return an error
        return res.status(500).json({ message: error.message });
      }

      if (!user) {
        // if no user is found, return an error
        return res.status(401).json({ message: "Unauthorized" });
      }

      // if the user is found, generate a JSON web token
      const token = jwt.sign({ id: user._id }, secret);

      // return the JSON web token in the response
      return res.json({ token });
    });
  });
});

// route to register
app.post("/register", async (req, res) => {
  try {
    // connect to db
    const conn = await MongoClient.connect(url);
    // get the user collection
    const collection = conn.db(dbName).collection("users");
    // get request body
    const body = req.body; // {username:'username',password:'password'}
    // insert the new user
    const response = await collection.insertOne(body);
    // send the response
    return res.json(response).status(200);
  } catch (error) {
    // send error response
    return res.status(500).json({ error: true, message: error.toString() });
  }
});

// a route to get the authenticated user's profile
app.get("/profile", authenticate, async (req, res) => {
  try {
    // connect to db
    const conn = await MongoClient.connect(url);
    // get the user collection
    const collection = conn.db(dbName).collection("users");
    // find user object with id
    const user = await collection.findOne({ _id: ObjectID(req.userId) });

    if (!user) {
      // no user is unauthorized
      return res.status(401).json({ message: "Unauthorized" });
    }
    // return the user's profile in the response
    return res.json(user).status(200);
  } catch (error) {
    // send error response
    console.log(error);
    return res
      .status(500)
      .json({ error: true, message: "Something went wrong" });
  }
});

/// END AUTHENTICATION STUFF //////////////////////////////////

/////// ITEM/PRODUCT API STUFF ///////////////////

// a route to get all products
app.get("/products", (req, res) => {
  // connect to the MongoDB database
  MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      // if there is an error, return an error
      return res.status(500).json({ message: err.message });
    }

    // get the 'products' collection from the database
    const collection = client.db(dbName).collection("products");

    // find all products in the collection
    collection.find().toArray((error, products) => {
      if (error) {
        // if there is an error, return an error
        return res.status(500).json({ message: error.message });
      }

      // return the products in the response
      return res.json(products);
    });
  });
});

// a route to create a new product
app.post("/products", (req, res) => {
  // get the product data from the request body
  const { name, price } = req.body;

  // connect to the MongoDB database
  MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      // if there is an error, return an error
      return res.status(500).json({ message: err.message });
    }

    // get the 'products' collection from the database
    const collection = client.db(dbName).collection("products");

    // insert the new product into the collection
    collection.insertOne({ name, price }, (error, result) => {
      if (error) {
        // if there is an error, return an error
        return res.status(500).json({ message: error.message });
      }

      // return the new product in the response
      return res.json(result.ops[0]);
    });
  });
});

// a route to update an existing product
app.put("/products/:id", (req, res) => {
  // get the product id from the request parameters
  const id = req.params.id;

  // get the updated product data from the request body
  const { name, price } = req.body;

  // connect to the MongoDB database
  MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      // if there is an error, return an error
      return res.status(500).json({ message: err.message });
    }

    // get the 'products' collection from the database
    const collection = client.db(dbName).collection("products");

    // update the product in the collection
    collection.updateOne(
      { _id: id },
      { $set: { name, price } },
      (error, result) => {
        if (error) {
          // if there is an error, return an error
          return res.status(500).json({ message: error.message });
        }

        if (result.modifiedCount === 0) {
          // if no product is updated, return a 404 response
          return res.status(404).json({ message: "Product not found" });
        }

        // return the updated product in the response
        return res.json({ name, price });
      }
    );
  });
});

// a route to delete an existing product
app.delete("/products/:id", (req, res) => {
  // get the product id from the request parameters
  const id = req.params.id;

  // connect to the MongoDB database
  MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      // if there is an error, return an error
      return res.status(500).json({ message: err.message });
    }
    return res.status(200);
  });
});

app.listen(port, "0.0.0.0", () => {
  dbo.connectToServer(function (err) {
    if (err) console.error(err);
  });
  console.log(`App running on port ${port}.`);
});

/////// END ITEM/PRODUCT API STUFF ///////////////////
