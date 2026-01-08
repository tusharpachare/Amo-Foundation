import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import Razorpay from "razorpay";
import env from "dotenv";
import cors from "cors";
// Connections from imports

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "amofoundation",
    password: "123456",
    port: 5432,
});

db.connect();


var instance = new Razorpay({
    key_id:process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET ,
});

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(express.json());
app.use(cors()); 

// rendering pages

app.get("/",(req,res)=>{
    res.render("index.ejs");
});

app.get("/book",(req,res)=>{
    res.render("book.ejs");
});

app.get("/about",(req,res)=>{
    res.render("about.ejs");
});

app.get("/contact",(req,res)=>{
    res.render("contact.ejs");
});

app.get("/orderRequest",(req,res)=>{
    res.render("orderRequest.ejs");
});



// Newsletter Backend Integression

app.post("/submit", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const result = await db.query(
            "INSERT INTO subscriptions (email) VALUES ($1) RETURNING *;", 
            [email]
        );
        console.log("✅ Inserted:", result.rows[0]);

        res.status(200).json({ message: "Subscription successful!" });
    } catch (error) {
        console.error("❌ Error inserting data:", error);
        if (error.code === "23505") {
            res.status(409).json({ message: "Email already subscribed!" });
        } else {
            res.status(500).json({ message: "Error subscribing. Please try again later." });
        }
    }
});

// Order Section Data Taking 

app.post("/order", async (req, res) => {
    console.log(req.body); // Debugging Line

    const { name, email, contact, address, pincode } = req.body;

    try {
        await db.query(
            "INSERT INTO orders (full_name, email, contact_number, delivery_address, pincode, created_at) VALUES ($1, $2, $3, $4, $5, DEFAULT);",
            [name, email, contact, address, pincode]
        );
        
        console.log("Order inserted successfully");
        res.redirect("/");
    } catch (error) {
        console.error("Database Insert Error:", error);
        res.status(500).send("Database insert error");
    }
});

// Razorpay Integration
app.post("/proceedpay", async (req, res) => {
    try {
        const amount = req.body.amount;

        if (!amount) {
            return res.status(400).json({ error: "Amount is required" });
        }

        const options = {
            amount: amount * 100, // Convert to smallest currency unit
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const myOrder = await instance.orders.create(options);

        res.status(201).json({
            message: "Order created",
            order: myOrder,
            amount
        });

    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ error: "Payment processing failed" });
    }
});

// Handle Order Request Submission
app.post("/submit-order", async (req, res) => {
    const { fullname, email, contactno, requesttype, reason } = req.body;

    try {
        await db.query(
            "INSERT INTO order_requests (full_name, email, contact_no, request_type, reason) VALUES ($1, $2, $3, $4, $5);",
            [fullname, email, contactno, requesttype, reason]
        );

        res.json({ success: true, message: "Data saved successfully!" }); // FIX 2: Send Response

    } catch (error) {
        console.error("Database Insertion Error:", error);
        res.status(500).json({ success: false, message: "Database error!" }); // FIX 2: Handle Errors
    }
});


app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
