const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { use } = require("react");
require("dotenv").config();
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollections = client.db("hirehub").collection("jobs");
    const companyCollections = client.db("hirehub").collection("company");
    const userCollections = client.db("hirehub").collection("user");
    const applicationsCollections = client
      .db("hirehub")
      .collection("applications");
    const planCollections = client.db("hirehub").collection("plans");
    const subscriptionCollections = client
      .db("hirehub")
      .collection("subscriptions");
    const sessionCollections = client.db("hirehub").collection("session");

    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        return req.status(401).send({ message: "unauthorized access" });
      }
      const token = authHeader.split(" ")[1];

      if (!token) {
        return req.status(401).send({ message: "unauthorized access" });
      }
      const query = { token: token };
      const session = await sessionCollections.findOne(query);
      const userId = session.userId;

      const userQuery = {
        _id: userId,
      };
      const user = await userCollections.findOne(userQuery);
      req.user = user;
      next();
    };

    const verifySeeker = async (req, res, next) => {
      if (req?.user.role !== "job-seaker") {
        return req.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/api/jobs", async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const result = await jobCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/api/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await jobCollections.findOne(query);
      res.send(result);
    });

    app.post("/api/jobs", async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date(),
      };
      const result = await jobCollections.insertOne(newJob);
      res.send(result);
    });

    // Applications related api's
    app.get("/api/applications", async (req, res) => {
      const query = {};
      if (req.query.applicantId) {
        query.applicantId = req.query.applicantId;
      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId;
      }
      const result = await applicationsCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/api/applications", async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date(),
      };
      const result = await applicationsCollections.insertOne(newApplication);
      res.send(result);
    });

    // Company related API's
    app.get("/api/companies", verifyToken, async (req, res) => {
      const result = await companyCollections.find().toArray();
      res.send(result);
    });

    app.get("/api/my/companies", async (req, res) => {
      const query = {};

      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const result = await companyCollections.findOne(query);
      res.send(result || {});
    });

    app.post("/api/companies", async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date(),
      };
      const result = await companyCollections.insertOne(newCompany);
      res.send(result);
    });

    app.patch("/api/companies/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedComany = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: updatedComany.status,
        },
      };
      const result = await companyCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Plans
    app.get("/api/plans", async (req, res) => {
      const query = {};
      if (req.query.plan_id) {
        query.planId = req.query.plan_id;
      }
      const plan = await planCollections.findOne(query);
      res.send(plan);
    });

    // Subscriptions
    app.post("/api/subscriptions", async (req, res) => {
      const data = req.body;
      const subsInfo = {
        ...data,
        createdAt: new Date(),
      };
      const result = await subscriptionCollections.insertOne(subsInfo);

      //   /Update the user plan info
      const folter = { email: data.email };
      const updateDocument = {
        $set: {
          plan: data.planId,
        },
      };
      const upateResult = await userCollections.updateOne(
        folter,
        updateDocument,
      );
      res.send(upateResult);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
