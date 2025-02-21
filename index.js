const express = require("express");
const app = express();
const ejs = require("ejs");
const bp = require("body-parser");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const account = require("./auth.json");
const saltRounds = 10;
const { MongoClient, ObjectId } = require("mongodb");

const uri = `mongodb+srv://lalbhi:lalu786@cluster0.mts3d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());


admin.initializeApp({
  credential: admin.credential.cert(account),
});

const db = admin.firestore();

app.get("/home", async (req, res) => {
  try {
   
    const client = new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect()
    const storage = client.db("complaintsdb").collection("students");
    const fetchedcomplaints = await storage.find().toArray();

    const sortedlist = fetchedcomplaints.sort((a,b)=>{
      if(a.likes<b.likes){
        return 1;
      }
      else if(a.likes>b.likes){
        return -1;
      }
      else{
        return 0;
      }
    });
    

    res.render("home",{fetched : sortedlist});
    console.log(sortedlist);
    
    console.log('fetched complaints:', fetchedcomplaints);
    
   
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

app.post("/home", async (req, res) => {
  const depart = req.body.dept;
  try {
    const client = new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const storage = client.db("complaintsdb").collection("students");
    const fetchedcomplaints = await storage.find().toArray()
    
    let filterdata;

    if (depart === "all") {
      filterdata = fetchedcomplaints;
    } else {
      filterdata = fetchedcomplaints.filter((data)=>data.dept===depart);
    }

    console.log('Filtered complaints:', filterdata);

    res.render("home", { fetched: filterdata });
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const name = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await db.collection("users").doc(user.uid).set({
      name: name,
      email: email,
      password: hashedPassword,
    });

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send(" Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const userRecord = await admin.auth().getUserByEmail(req.body.email);
    const userDetails = await db.collection("users").doc(userRecord.uid).get();

    if (!userDetails.exists) {
      return res.redirect("/login");
    }

    const userData = userDetails.data();
    const storedPassword = userData.password;

    const result = await bcrypt.compare(req.body.password, storedPassword);

    if (result) {
      res.redirect("/home");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.redirect("/login");
  }
});

app.get("/complaints", (req, res) => {
  res.render("complaints");
});

app.post("/complaints", async (req, res) => {
  const data = req.body;
  try {
    const client = new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect()
    const storage = client.db("complaintsdb").collection("students");
    console.log("connected to database");
    await storage.insertOne(data);
    console.log(data);
    res.render("success");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.get("/success",(req,res)=>{
  res.render("success");
});

app.post("/success",(req,res)=>{
  res.render("home");
});

app.get("/likes",(req,res)=>{
  res.render("likes");
});


app.post("/likes", async (req, res) => {
  const likes = req.body.thumbsup;
  try {
    const client = new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const storage = client.db("complaintsdb").collection("students");

    await storage.updateOne(
      { _id: new ObjectId(likes) },
      { $inc: { likes: 1 } }
    );
    res.redirect("/home");
  } catch (error) {
    console.error("Error updating likes:", error);
  }
});

app.get("/view",async(req,res)=>{
  try {
    const client = new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const storage = client.db("complaintsdb").collection("students");
    const fetchedcomplaints = await storage.find().toArray(); 

    
    res.render("view", { fetched: fetchedcomplaints });

    
  } catch (err) {
    console.error(err);
  }
});




app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
