const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'sdjkfh8923y%@&%@@(bxixhhwhwiohoxhheoncuoehuw';
const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'postgres',
  database: 'address_db',
  password: 'example',
  port: 5432,
});

client.connect()

// Harus pake ini
app.use(cors());
app.use(express.urlencoded({ extended: true }))
// app.use(express.urlencoded());
app.use(express.json()) 
// app.use(
//   cors({
//     origin: ["https://localhost:3001/login", "https://localhost:3001/addressBook"],
//     credentials: true
//   })
// )

process.on('SIGTERM', () => {
  client.end();
});

// Register 
app.post('/register', async (req, res) => {

  const { name, email, password: plainTextPassword } = req.body;
  
  console.log(name)

  if (!name || typeof name !== 'string'){
    return res.json({ status: 'error', error: 'Invalid name' })
  }

  if (!email || typeof email !== 'string'){
    return res.json({ status: 'error', error: 'Invalid email' })
  }

  if (!plainTextPassword || typeof plainTextPassword !== 'string'){
    return res.json({ status: 'error', error: 'Invalid password' })
  }

  const password = await bcrypt.hash(plainTextPassword, 10);
  if (name && email && password){
    const query = 'INSERT INTO address_tbl (name, email, password) VALUES($1, $2, $3)';
    client.query(query, [name, email, password], (err, resp) => {
      if (err) {
        res.json({ status: 'error', error: err });
      } else {
        res.json({ 
          status: 'Account successfully registered', 
          name: name,
          email: email,
          password: password })
      }    
    });
  } else {
    res.sendStatus(400);
  }
})

// Login 
app.post('/login', async (req, res) => {
 
  const { email, password } = req.body;

  if (!email || typeof email !== 'string'){
    return res.json({ status: 'error', error: 'Invalid email' })
  }

  if (!password|| typeof password !== 'string'){
    return res.json({ status: 'error', error: 'Invalid password' })
  }

  const query = "SELECT * FROM address_tbl WHERE email=$1"
  client.query(query, [email], (err, resp) => {
    if (err) {
      res.json({ status: 'error', error: err });
    } else {
      if (!resp.rows[0]) {
        return res.json({ status:'error', error: 'Invalid email/password' })
      }
      
      bcrypt.compare(password, resp.rows[0].password, function(err, ress) {
        if (err){
          res.json({ status:'error', error: err });
        }
        if (ress) {
          const token = jwt.sign({ 
            user_id: resp.rows[0].user_id, 
            email: resp.rows[0].email 
          }, JWT_SECRET, {expiresIn: 86400})
          return res.json({ status: 'login successfully', token: token, user_id: resp.rows[0].user_id, email: resp.rows[0].email})
        } else {
          return res.json({status: 'error', error: 'password do not match'});
        }
      });
    }
  })
})

// addressBook
app.get('/addressBook', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    jwt.verify(token, JWT_SECRET, function(err, user) {
      if (err){
        return res.json({ status: 'error', error: 'Failed to authenticate token', token: token })
      }

      const query = "SELECT * FROM address_book WHERE user_id=$1"
      client.query(query, [user.user_id],(err, resp) => {
        if (err) {
          return res.json({ status: 'error', error: err })
        } else {
          return res.json({ token: token, book: resp.rows })
        }
      })
    })
  }
})

// addAddress
app.post('/addAddress', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    const { addressName, address, postalCode } = req.body;
    jwt.verify(token, JWT_SECRET, function(err, user) {
      if (err){
        return res.json({ status: 'error', error: 'Failed to authenticate token', token: token })
      }
      const query = 'INSERT INTO address_book (user_id, address_name, address, postal_code) VALUES($1, $2, $3, $4)'
      client.query(query, [user.user_id, addressName, address, postalCode],(err, resp) => {
        if (err) {
          return res.json({ status: 'error', error: err})
        } else {
          return res.json({ 
            token: token,
            user_id: user.user_id,
            address_name: addressName,
            address: address,
            postal_code: postalCode
          })
        }
      })
    })
  }
})

// specificAddress
app.get('/specificAddress', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    const address_id = req.headers.address_id;
    
    jwt.verify(token, JWT_SECRET, function(err, user) {
      if (err){
        return res.json({ status: 'error', error: 'Failed to authenticate token', token: token })
      }

      const query = "SELECT * FROM address_book WHERE user_id=$1 AND address_id=$2"
      client.query(query, [user.user_id, address_id],(err, resp) => {
        if (err) {
          return res.json({ status: 'error', error: err })
        } else {
          return res.json({ token: token, address_data: resp.rows })
        }
      })
    })
  }
})

// updateAddress, updateAddress tertentu
app.put('/updateAddress', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    const { addressId, addressName, address, postalCode }= req.body;
    
    jwt.verify(token, JWT_SECRET, function(err, user) {
      if (err){
        return res.json({ status: 'error', error: 'Failed to authenticate token', token: token })
      }

      const query = "UPDATE address_book SET address_name = $1, address = $2, postal_code = $3 WHERE user_id=$4 AND address_id=$5"
      client.query(query, [addressName, address, postalCode, user.user_id, addressId],(err, resp) => {
        if (err) {
          console.log(err)
          res.json({ status: "error", error: err })
        } else {
          res.json({ 
            status: "update",
            address_name: addressName,
            address: address,
            postal_code: postalCode 
          })
        }
      })
    })
  }
})

// deleteAddress, deleteAddress tertentu
app.delete('/deleteAddress/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    const addressId = req.params.id
    jwt.verify(token, JWT_SECRET, function(err, user) {
      if (err){
        return res.json({ status: 'error', error: 'Failed to authenticate token', token: token })
      }

      const query = "DELETE FROM address_book WHERE user_id=$1 AND address_id=$2"
      client.query(query, [user.user_id, addressId],(err, resp) => {
        if (err) {
          res.json({ status: "error", error: err })
        } else {
          console.log(resp.rows)
          res.json({ status: "delete" })
        }
      })
    })
  }
})

app.listen(3001, () => {
  console.log('app now listening for requests on port 3001')
});
























// const express = require('express')
// const cors = require('cors')
// const app = express()
// const port = 3001

// const { Client } = require('pg')
// const client = new Client({
//   user: 'postgres',
//   host: 'postgres',
//   database: 'mahasiswa_db',
//   password: 'example',
//   port: 5432,
// })

// client.connect()

// // Harus pake ini
// app.use(cors());
// app.use(express.urlencoded());
// app.use(express.json()) 

// process.on('SIGTERM', () => {
//   client.end();
// });

// app.get('/', (req, res) => {
//   res.sendFile('public/index.html', {root: __dirname })
// })

// app.get('/indeks/get', (req, resp) => {
//   client.query('SELECT * FROM mhs_table', (err, res) => {
//     if (err) {
//       resp.send([])
//     } else {
//       resp.send(res.rows)
//     }
//   })
// })

// app.post('/indeks/post', (req, resp) => {

//   const mhsNama = req.body.nama;
//   const mhsIndeks = req.body.indeks;

//   if (mhsNama && mhsIndeks){
//     const query = 'INSERT INTO mhs_table(nama, indeks) VALUES($1, $2)';
//     client.query(query, [mhsNama, mhsIndeks], (err, res) => {
//       if (err) {
//         console.log(err)
//         resp.sendStatus(400);
//       } else {
//         resp.sendStatus(200);
//       }    
//     });
//   } else {
//     resp.sendStatus(400);
//   }
// })

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`)
// })
