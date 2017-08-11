'use strict';

const express = require('express'),
      app = express(),
      nodemailer = require('nodemailer'),      
      bodyParser = require('body-parser'),
      pgp = require('pg-promise')(),      
      port = process.env.PORT || 3000,

      mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SERVICE_EMAIL,
          pass: process.env.SERVICE_EMAIL_PASS
        }
      }),
      db = pgp({
        host: 'ec2-23-21-85-76.compute-1.amazonaws.com',
        port: 5432,
        database: 'detamp7dm7n5kt',
        user: process.env.SERVICE_DB_USER,
        password: process.env.SERVICE_DB_PASS,
        ssl: true,
        sslfactory: 'org.postgresql.ssl.NonValidatingFactory'
      });
      
app.set('view engine', 'ejs');

//middlewares
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
   extended: true 
}));
app.use(bodyParser.json());

//ROUTES

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/login', (req, res) => {
  const email = req.body['log-email'],
        pass = req.body['log-pass'];
  authentUser(email, pass, authResult => {
    if (!authResult) {
      res.send('Wrong Email or password.');
    }        
    res.send('Greeting!');
  }, err => {
    res.send('Something went wrong:' + err.message);
  });
});

app.post('/register', (req, res) => {
  const name = req.body['reg-name'],
        email = req.body['reg-email'],
        pass = req.body['reg-pass'],
        passCheck = req.body['reg-pass-repeat'];
  
  if (pass !== passCheck) {
    res.send('Passwords didn\'t match.');
  }

  const newUser = {
    name: name,
    email: email,
    password: pass
  } 

  createNewUser(newUser, () => {
    res.send('Nice to meet you, ' + newUser.name);
  }, (err) => {
    res.send('Something went wrong:' + err.message);
  });
});

function createNewUser(user, onResolved, onError) {
  db.any(`INSERT INTO users (name, email, password, cash, reg_date)
            VALUES (          
            '${user.name}',
            '${user.email}', 
            '${user.password}',
            100, 
            '${new Date().toISOString()}'
          );`, [true])        
    .then(data => {
      const letter = createGreetLetter(user);
      sendMail(letter);
      onResolved(data);
    })
    .catch(error => {
      console.log(error);
      onError(error);
    });
}

function sendMail(letter) {
  mailTransporter.sendMail(letter, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function createGreetLetter(user) {
  return {
    from: 'cyrtestappsettlers@gmail.com',
    to: user.email,
    subject: 'Greetings, new player!',
    text: `Dear ${user.name}!
          From now on you'll get thousands annoying emails.
          We're glad you've joined us!`
  }
}

function authentUser(email, password, onResolved, onError) {
  db.one(`SELECT password FROM users
          WHERE email = '${email}';`)
    .then(data => {
      const authResult = password === data.password ? 
                         true : 
                         false;
      onResolved(authResult, data);
    })
    .catch(error => {
      console.log(error);
      onError(error);
    });
}

app.listen(port, () => {
  console.log('Listen on port: ' + port);
})
