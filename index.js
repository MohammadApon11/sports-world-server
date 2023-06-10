const express = require('express');
const cors = require('cors');
require("dotenv").config();
const app = express();
const morgan = require('morgan')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

app.get("/", (req, res) => {
    res.send("12 server Is Running")
})





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a5mfktt.mongodb.net/?retryWrites=true`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorized access" })
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const usersCollection = client.db("summerCamp").collection("users");
        const classesCollection = client.db("summerCamp").collection("classes");
        const instructorCollection = client.db("summerCamp").collection("instructors");
        const selectedCollection = client.db("summerCamp").collection("selected");

        // jwt token collect
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.send({ token })
        })

        // get classes
        app.get("/classes", async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        // get instructors
        app.get("/instructors", async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        })

        // put users
        app.put("/users/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { user }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // is admin
        app.get("/users/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const admin = { admin: user?.role === "admin" };
            const instructor = { instructor: user?.role === "instructor" };
            res.send({ admin, instructor })
        })

        // get all users
        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        // get users by email
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { role: user?.role === "admin" || "instructor" }
            if (user?.role) {
                return res.send(result)
            }
            res.send(false);
        })

        // get all selected
        app.get("/selected", verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.send([])
            }

            const decoded = req.decoded.email;
            if (email !== decoded) {
                return res.status(403).send({ error: true, message: "forbidden access" })
            }

            const query = { email: email };
            const result = await selectedCollection.find(query).toArray();
            res.send(result)
        })

        // selected classes
        app.put('/selected/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const selectedClass = req.body;
            const options = { upsert: true }
            const updatedDoc = {
                $set: selectedClass
            }
            const result = await selectedCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        });

        // selected delete method
        app.delete("/selected/:id", async(req,res)=>{
            const id = req.params.id;
            console.log(id)
            const query = {_id : new ObjectId(id)};
            const result = await selectedCollection.deleteOne(query);
            res.send(result); 
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`From 12 server running port is ${port}`)
})