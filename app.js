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

console.log(process.env.SERVICE_EMAIL);
console.log(process.env.SERVICE_EMAIL_PASS);
console.log(process.env.SERVICE_DB_USER);
console.log(process.env.SERVICE_DB_PASS);

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

app.post('/login', (req, res, next) => {
  const email = req.body['log-email'],
        pass = req.body['log-pass'];

  authentUser(email, pass, next, () => {    
    res.send('Greeting!');
  });
});

app.post('/register', (req, res, next) => {

  if (req.body['reg-pass'] !== req.body['reg-pass-repeat']) {
    next(new Error('Passwords didn\'t match.'));
  }

  const newUser = {
    name: req.body['reg-name'],
    email: req.body['reg-email'],
    pass: req.body['reg-pass']
  }

  createNewUser(newUser, next, () => {
    const letter = createGreetLetter(newUser);
    sendMail(letter, next);
    res.send('Nice to meet you, ' + newUser.name);
  });

});

//errors handling

app.use((err, req, res) => {
  if (app.get('env') !== 'development') res.sendStatus(500);

  console.log(err);
  res.send('Something went wrong: ' + err.message);
});

//callbacks

function createNewUser(user, onError, onResolved) {
  db.any(`INSERT INTO users (name, email, password, cash, reg_date)
            VALUES (          
            '${user.name}',
            '${user.email}', 
            '${user.password}',
            100, 
            '${new Date().toISOString()}'
          );`, [true])        
    .then(() => {
      onResolved();
    })
    .catch(error => {
      onError(error);
    });
}
 
function sendMail(letter, onError) {
  mailTransporter.sendMail(letter, (error, info) => {
    if (error) {
      onError(error);
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

function authentUser(email, pass, onError, onResolved) {
  db.one(`SELECT password FROM users
          WHERE email = '${email}';`)
    .then(data => {
      if (pass !== data.password) {
        throw Error('Invalid Email or password.');
      }
      onResolved();
    })
    .catch(error => {
      onError(error);
    });
}

app.listen(port, () => {
  console.log('Listen on port: ' + port);
})
