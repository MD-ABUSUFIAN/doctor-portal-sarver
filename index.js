const express = require('express')
const app = express();
const cors=require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

const port = process.env.PORT ||5000;
  app.use(cors());
  app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0epdq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

console.log(uri);





const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


async function verifyToken(res,req,next) {

  if(req.headers?.authorization?.startswith('Bearer ')){
    const token=req.headers?.authorization?.split(' ')[1];

    try{
      const decodedUser=await admin.auth().verifyIdToken(token);
      req.decodedEmail=decodedUser.email;

    }

    catch{

    }

  }

  next();
}

async function run (){

    try{
        await client.connect();
        
        const database = client.db("doctors_portal");
        const appointmentCollection = database.collection("appointments");
        const usersCollection = database.collection("users");

        app.get('/appointments',async(req,res)=>{
          const email=req.query.email;
          const date=req.query.date;
          const query ={email:email,date:date};
          const cursor=appointmentCollection.find(query);
          const appointments=await cursor.toArray(cursor);
          res.json(appointments);
        })

        app.post('/appointments',async(req,res)=>{
          const appointment=req.body;
          const result=await appointmentCollection.insertOne(appointment);
          res.json(result);
        });

        app.get('/users/:email',async(req,res)=>{
          const email=req.params.email;
          const query={email:email};
          const user=await usersCollection.findOne(query);
          let isAdmin=false;
          if (user?.role ==='admin') {
          isAdmin=true;
          }
          res.json({admin:isAdmin});
        })


        app.post('/users',async(req,res)=>{
          const user=req.body;
          const result=await usersCollection.insertOne(user);
          console.log(result);
          res.json(result);
        })

  //upsert method

        app.put('/users',async(req,res)=>{
          const user=req.body;
          const filter={email:user.email};
          const options={ upsert:true };
          const updateDoc={$set:user};
          const result=await usersCollection.updateOne(filter,updateDoc,options);
          res.json(result);

        });


        app.put('/users/admin',verifyToken,async(req, res)=>{

          const user=req.body;
         const requester=req.decodedEmail;

          if(requester){

            const requesterAccount=await usersCollection.findOne({email:requester})
            if(requesterAccount.role==='admin'){
              const filter={email:user.email};
              const updateDoc={$set:{role:'admin'}};
              const result=await usersCollection.updateOne(filter,updateDoc);
              res.json(result);
            }
          }
          else{
            res.status(403).json({message:'You do not have access to Make Admin'})
          }
         
         

        })


    }

    finally{

        // await client.close();
    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello DOCTOR PORTAL!')

  
})

app.listen(port, () => {
  console.log(`Listening at port:${port}`)
})