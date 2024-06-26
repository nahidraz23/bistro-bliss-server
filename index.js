const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const port = process.env.PORT || 5300
const stripe = require('stripe')(process.env.STIRPE_SECRET_KEY)

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

    const foodItemsColletection = client
      .db('bistroBlissDB')
      .collection('foodItems')
    const reviewsColletection = client.db('bistroBlissDB').collection('reviews')
    const cartColletection = client.db('bistroBlissDB').collection('cart')
    const userColletection = client.db('bistroBlissDB').collection('users')
    const paymentColletection = client
      .db('bistroBlissDB')
      .collection('payments')
    // jwt middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verifyToken: ', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]

      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // user verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userColletection.findOne(query)
      const isAdmin = user?.role === 'Admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    // JWT related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // Users related api
    app.get('/allUsers', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userColletection.find().toArray()
      res.send(result)
    })

    app.get('/allUsers/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const user = await userColletection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'Admin'
      }
      res.send({ admin })
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      const existingUser = await userColletection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exist', insetedId: null })
      }
      const result = await userColletection.insertOne(user)
      res.send(result)
    })

    app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'Admin'
        }
      }
      const result = await userColletection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userColletection.deleteOne(query)
      res.send(result)
    })

    // Menu related api
    app.get('/menu', async (req, res) => {
      const result = await foodItemsColletection.find().toArray()
      res.send(result)
    })

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodItemsColletection.findOne(query)
      res.send(result)
    })

    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const foodItem = req.body
      const result = await foodItemsColletection.insertOne(foodItem)
      res.send(result)
    })

    app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          imaage: item.image,
          recipe: item.recipe
        }
      }
      const result = await foodItemsColletection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodItemsColletection.deleteOne(query)
      res.send(result)
    })

    // Review related api
    app.get('/reviews', async (req, res) => {
      const result = await reviewsColletection.find().toArray()
      res.send(result)
    })

    // Carts related api
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartColletection.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
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

    // Payment related api
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const result = await paymentColletection.find(query).toArray()
      res.send(result)
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body
      const paymentResult = await paymentColletection.insertOne(payment)

      // carefully delete cart item after payment successfull
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartColletection.deleteMany(query)

      res.send({ paymentResult, deleteResult })
    })

    // Stripe intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body
      // const amount = parseInt(price * 100);
      const amount = price * 100
      // console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Stats/Analytics
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const user = await userColletection.estimatedDocumentCount()
      const payment = await paymentColletection.estimatedDocumentCount()
      const menuItem = await foodItemsColletection.estimatedDocumentCount()
      const result = await paymentColletection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: '$price'
              }
            }
          }
        ])
        .toArray()

      const revenue = result.length > 0 ? result[0].totalRevenue : 0

      res.send({
        user,
        payment,
        menuItem,
        revenue
      })
    })

    // order-stats
    app.get('/order-stats',verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentColletection
        .aggregate([
          {
            $unwind: '$menuIds'
          },
          {
            $addFields: {
              menuItemObjectId: { $toObjectId: '$menuIds' }
            }
          },
          {
            $lookup: {
              from: 'foodItems',
              localField: 'menuItemObjectId',
              foreignField: '_id',
              as: 'matchedItems'
            }
          },
          {
            $unwind: '$matchedItems'
          },
          {
            $group: {
              _id: '$matchedItems.category',
              quantity: {
                $sum: 1
              },
              revenue: {
                $sum: '$matchedItems.price'
              }
            }
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              quantity: '$quantity',
              revenue: '$revenue'
            }
          }
        ])
        .toArray()

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
