const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const port = process.env.PORT || 5300

// Middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v3mjk1b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function run () {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect()

    const foodItemsColletection = client.db('bistroBlissDB').collection('foodItems')
    const reviewsColletection = client.db('bistroBlissDB').collection('reviews')
    const cartColletection = client.db('bistroBlissDB').collection('cart')
    const userColletection = client.db('bistroBlissDB').collection('users')

    // Users related api
    app.get('/allUsers', async(req, res) => {
      const result = await userColletection.find().toArray();
      res.send(result)
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = {email : user?.email};
      const existingUser = await userColletection.findOne(query);
      if(existingUser){
        return res.send({message: "User already exist", insetedId: null});
      }
      const result = await userColletection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: "Admin"
        }
      };
      const result = await userColletection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await userColletection.deleteOne(query);
      res.send(result);
    })

    app.get('/menu', async (req, res) => {
      const result = await foodItemsColletection.find().toArray()
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewsColletection.find().toArray()
      res.send(result)
    })

    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartColletection.find(query).toArray()
      res.send(result)
    })

    app.post('/cart', async (req, res) => {
      const cartItem = req.body
      const result = await cartColletection.insertOne(cartItem)
      res.send(result)
    })

    app.delete('/mycart/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartColletection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Bistro Boss server is running')
})

app.listen(port, () => {
  console.log(`This server is running on port: ${port}`)
})
